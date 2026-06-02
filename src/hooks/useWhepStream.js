/**
 * useWhepStream.js
 *
 * Reproduce un stream WebRTC vía WHEP (WebRTC-HTTP Egress Protocol),
 * compatible con MediaMTX / go2rtc. No requiere librerías: usa RTCPeerConnection
 * nativo del navegador.
 *
 * Flujo WHEP (no-trickle):
 *   1. createOffer (recvonly video+audio)
 *   2. esperar ICE gathering (o timeout corto)
 *   3. POST del SDP offer al endpoint /whep (Content-Type: application/sdp)
 *   4. setRemoteDescription con el answer SDP
 *
 * @param {string|null} whepUrl - endpoint WHEP (ej: http://localhost:8889/cam/whep)
 * @param {object}  opts
 * @param {boolean} opts.enabled - si false, no conecta
 * @param {React.RefObject} opts.videoRef - <video> donde montar el MediaStream
 * @returns {{ videoRef, status: 'idle'|'connecting'|'live'|'error', error: string|null }}
 */

import { useState, useEffect, useRef } from 'react';

export function useWhepStream(whepUrl, { enabled = true, videoRef: externalRef } = {}) {
  const internalRef = useRef(null);
  const videoRef = externalRef || internalRef;
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !whepUrl) {
      setStatus('idle');
      return undefined;
    }

    let cancelled = false;
    let pc = null;

    const connect = async () => {
      setStatus('connecting');
      setError(null);
      try {
        pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        // Solo recibimos.
        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });

        const remote = new MediaStream();
        pc.ontrack = (ev) => {
          (ev.streams[0]?.getTracks() || [ev.track]).forEach(t => remote.addTrack(t));
          if (videoRef.current && videoRef.current.srcObject !== remote) {
            videoRef.current.srcObject = remote;
            videoRef.current.play?.().catch(() => {});
          }
        };

        pc.onconnectionstatechange = () => {
          if (cancelled || !pc) return;
          const s = pc.connectionState;
          if (s === 'connected') setStatus('live');
          else if (s === 'failed' || s === 'closed') {
            setStatus('error');
            setError(`WebRTC: ${s}`);
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await waitIceGathering(pc, 1500);
        if (cancelled) return;

        const res = await fetch(whepUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: pc.localDescription.sdp,
        });
        if (!res.ok) throw new Error(`WHEP ${res.status} ${res.statusText}`);
        const answerSdp = await res.text();
        if (cancelled) return;

        await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setError(err?.message || String(err));
        }
        try { pc?.close(); } catch { /* noop */ }
      }
    };

    connect();

    return () => {
      cancelled = true;
      try { pc?.close(); } catch { /* noop */ }
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [whepUrl, enabled, videoRef]);

  return { videoRef, status, error };
}

/** Resuelve cuando ICE terminó de juntar candidatos, o al cumplirse el timeout. */
function waitIceGathering(pc, timeoutMs) {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      pc.removeEventListener('icegatheringstatechange', check);
      resolve();
    };
    const check = () => { if (pc.iceGatheringState === 'complete') finish(); };
    pc.addEventListener('icegatheringstatechange', check);
    setTimeout(finish, timeoutMs);
  });
}
