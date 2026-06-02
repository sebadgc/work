import { useRef } from 'react';
import { StatusDot, Button, Badge } from '../common';
import { PLUMA_PATCH_METHODS } from '../../config';
import CameraFeed from './CameraFeed';
import './CameraCard.css';

/**
 * Card individual de cámara activa.
 * Muestra el feed en vivo (WebRTC), estado, métodos activos, y controles.
 *
 * @param {object} camera - { camera_id, name, source }
 * @param {object|null} state - estado activo desde useCameraState
 * @param {boolean} isSelected - es la cámara enfocada (grande)
 * @param {boolean} isStopping - se está deteniendo (esperando al backend)
 * @param {string|null} whepUrl - endpoint WebRTC/WHEP del feed en vivo
 * @param {function} onSelect
 * @param {function} onDelete
 * @param {function} onPatchMethod
 * @param {function} onCapture - (cameraId, imageDataUrl) — snapshot manual
 */
export default function CameraCard({
  camera,
  state,
  isSelected,
  isStopping,
  whepUrl,
  onSelect,
  onDelete,
  onPatchMethod,
  onCapture,
}) {
  const feedVideoRef = useRef(null);
  const isPluma = state?.mode === 'pluma_extendida';

  const activeMethodLabels = (state?.activeMethods || []).map(id => {
    const method = PLUMA_PATCH_METHODS.find(m => m.id === id);
    return method?.label || id;
  });

  const handleCapture = (e) => {
    e.stopPropagation();
    onCapture?.(camera.camera_id, captureFrame(feedVideoRef.current));
  };

  return (
    <div
      className={`camera-card ${isSelected ? 'camera-card--selected' : ''} camera-card--active`}
      onClick={() => onSelect(camera.camera_id)}
    >
      {/* Preview */}
      <div className="camera-card__preview">
        <CameraFeed whepUrl={whepUrl} videoRef={feedVideoRef} />

        {/* Status overlay */}
        <div className="camera-card__status-overlay">
          <StatusDot status="active" />
          <span className="camera-card__status-label">
            {isPluma ? 'PLUMA' : 'COLISIÓN'}
          </span>
        </div>

        {/* Active methods chips */}
        {activeMethodLabels.length > 0 && (
          <div className="camera-card__methods-overlay">
            {activeMethodLabels.map((label, i) => (
              <Badge key={i} color="accent">{label}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="camera-card__info">
        <div className="camera-card__header">
          <span className="camera-card__name">{camera.name || camera.camera_id}</span>
          {isPluma ? (
            <Badge color="green">pluma</Badge>
          ) : (
            <Badge color="blue">colisión</Badge>
          )}
        </div>
        <div className="camera-card__source" title={camera.source}>
          {camera.source}
        </div>

        {/* Actions */}
        <div className="camera-card__actions">
          {isStopping ? (
            <span className="camera-card__stopping">
              <span className="camera-card__spinner">◌</span> Deteniendo…
            </span>
          ) : (
            <>
              <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(camera.camera_id); }}>
                Detener
              </Button>
              {isPluma && (
                <Button variant="default" size="sm" onClick={(e) => { e.stopPropagation(); onPatchMethod(camera.camera_id); }}>
                  + Método
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleCapture}>
                Capturar
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Captura un frame del <video> a un dataURL JPEG (downscalado para no inflar
 * localStorage). Devuelve null si el video aún no tiene dimensiones.
 */
function captureFrame(video) {
  if (!video || !video.videoWidth) return null;
  const maxW = 480;
  const scale = Math.min(1, maxW / video.videoWidth);
  const w = Math.round(video.videoWidth * scale);
  const h = Math.round(video.videoHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  try {
    canvas.getContext('2d').drawImage(video, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.6);
  } catch {
    return null;
  }
}
