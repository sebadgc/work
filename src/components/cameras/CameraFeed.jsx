import { useRef, useEffect } from 'react';
import { useWhepStream } from '../../hooks/useWhepStream';
import './CameraFeed.css';

/**
 * Feed de una cámara. Un único <video> sirve para ambos modos:
 *  - localVideoUrl (blob MP4, modo archivo dev) → reproduce vía .src
 *  - whepUrl (WebRTC/WHEP) → handshake y reproduce vía .srcObject
 *
 * El <video> se expone vía `videoRef` (compartido con el padre) para poder
 * capturar frames (snapshots). Prioridad: archivo local sobre WebRTC.
 *
 * @param {string|null} localVideoUrl
 * @param {string|null} whepUrl
 * @param {React.RefObject} [videoRef] - ref externa al <video> (para snapshots)
 */
export default function CameraFeed({ localVideoUrl, whepUrl, videoRef: externalRef }) {
  const internalRef = useRef(null);
  const videoRef = externalRef || internalRef;
  const isLocal = !!localVideoUrl;

  useEffect(() => {
    if (isLocal && videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = localVideoUrl;
      videoRef.current.play?.().catch(() => {});
    }
  }, [isLocal, localVideoUrl, videoRef]);

  const { status } = useWhepStream(whepUrl, { enabled: !isLocal && !!whepUrl, videoRef });

  const hasVideo = isLocal || !!whepUrl;
  const showLive = !isLocal && !!whepUrl;

  return (
    <div className={`camera-feed ${hasVideo ? '' : 'camera-feed--placeholder'}`}>
      {hasVideo ? (
        <video
          ref={videoRef}
          className="camera-feed__video"
          muted
          playsInline
          autoPlay
          loop={isLocal}
        />
      ) : (
        <div className="camera-feed__placeholder-inner">
          <span className="camera-feed__ph-icon">◉</span>
          <span className="camera-feed__ph-label">SIN PREVIEW</span>
        </div>
      )}

      {isLocal && <span className="camera-feed__tag camera-feed__tag--file">ARCHIVO</span>}

      {showLive && status === 'live' && (
        <span className="camera-feed__tag camera-feed__tag--live">● EN VIVO</span>
      )}
      {showLive && status === 'connecting' && (
        <div className="camera-feed__overlay">
          <span className="camera-feed__spinner">◌</span>
          <span>Conectando…</span>
        </div>
      )}
      {showLive && status === 'error' && (
        <div className="camera-feed__overlay camera-feed__overlay--error">
          <span>Sin señal</span>
          <small>Revisá el gateway WebRTC en Settings</small>
        </div>
      )}
    </div>
  );
}
