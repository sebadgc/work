import { useRef } from 'react';
import { useWhepStream } from '../../hooks/useWhepStream';
import { MESSAGES } from '../../config';
import './CameraFeed.css';

/**
 * Feed en vivo de una cámara vía WebRTC/WHEP.
 * El <video> se expone vía `videoRef` (compartido con el padre) para poder
 * capturar frames (snapshots).
 *
 * @param {string|null} whepUrl - endpoint WHEP resuelto desde el source RTSP
 * @param {React.RefObject} [videoRef] - ref externa al <video> (para snapshots)
 */
export default function CameraFeed({ whepUrl, videoRef: externalRef }) {
  const internalRef = useRef(null);
  const videoRef = externalRef || internalRef;
  const { status } = useWhepStream(whepUrl, { enabled: !!whepUrl, videoRef });

  if (!whepUrl) {
    return (
      <div className="camera-feed camera-feed--placeholder">
        <div className="camera-feed__placeholder-inner">
          <span className="camera-feed__ph-icon">◉</span>
          <span className="camera-feed__ph-label">{MESSAGES.feed.noPreview}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="camera-feed">
      <video ref={videoRef} className="camera-feed__video" muted playsInline autoPlay />

      {status === 'live' && (
        <span className="camera-feed__tag camera-feed__tag--live">{MESSAGES.feed.live}</span>
      )}
      {status === 'connecting' && (
        <div className="camera-feed__overlay">
          <span className="camera-feed__spinner">◌</span>
          <span>{MESSAGES.feed.connecting}</span>
        </div>
      )}
      {status === 'error' && (
        <div className="camera-feed__overlay camera-feed__overlay--error">
          <span>{MESSAGES.feed.noSignal}</span>
          <small>{MESSAGES.feed.noSignalHint}</small>
        </div>
      )}
    </div>
  );
}
