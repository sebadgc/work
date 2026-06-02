import { useRef } from 'react';
import { StatusDot, Button, Badge } from '../common';
import { PLUMA_PATCH_METHODS, MESSAGES } from '../../config';
import CameraFeed from './CameraFeed';
import './CameraCard.css';

/**
 * Card de una cámara activa. Una cámara puede tener pluma y/o colisión.
 *
 * @param {object} camera - { camera_id, name, source }
 * @param {object|null} state - { pluma:{active,methods}, collision:{active} }
 * @param {boolean} isSelected - cámara enfocada (grande)
 * @param {boolean} isStopping - esperando al backend para detener
 * @param {boolean} isActivating - orquestando el encendido
 * @param {string|null} whepUrl
 * @param {function} onSelect, onDelete, onPatchMethod, onCapture
 */
export default function CameraCard({
  camera,
  state,
  isSelected,
  isStopping,
  isActivating,
  whepUrl,
  onSelect,
  onDelete,
  onPatchMethod,
  onCapture,
}) {
  const feedVideoRef = useRef(null);
  const isPlumaOn = !!state?.pluma?.active;
  const isCollisionOn = !!state?.collision?.active;

  const activeMethodLabels = (state?.pluma?.methods || []).map(id => {
    const method = PLUMA_PATCH_METHODS.find(m => m.id === id);
    return method?.label || id;
  });

  const groupLabels = [];
  if (isPlumaOn) groupLabels.push(MESSAGES.cameraCard.statusPluma);
  if (isCollisionOn) groupLabels.push(MESSAGES.cameraCard.statusColision);

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
            {isActivating ? MESSAGES.cameraCard.activating : (groupLabels.join(' · ') || MESSAGES.cameraCard.noDetectors)}
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
          <div className="camera-card__badges">
            {isPlumaOn && <Badge color="green">{MESSAGES.cameraCard.badgePluma}</Badge>}
            {isCollisionOn && <Badge color="blue">{MESSAGES.cameraCard.badgeColision}</Badge>}
          </div>
        </div>
        <div className="camera-card__source" title={camera.source}>
          {camera.source}
        </div>

        {/* Actions */}
        <div className="camera-card__actions">
          {isStopping ? (
            <span className="camera-card__stopping">
              <span className="camera-card__spinner">◌</span> {MESSAGES.cameraCard.stopping}
            </span>
          ) : (
            <>
              <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(camera.camera_id); }}>
                {MESSAGES.cameraCard.stop}
              </Button>
              {isPlumaOn && (
                <Button variant="default" size="sm" onClick={(e) => { e.stopPropagation(); onPatchMethod(camera.camera_id); }}>
                  {MESSAGES.cameraCard.addMethod}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleCapture}>
                {MESSAGES.cameraCard.capture}
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
