import { useRef, useEffect } from 'react';
import { StatusDot, Button, Badge } from '../common';
import { PLUMA_PATCH_METHODS } from '../../config';
import './CameraCard.css';

/**
 * Card individual de cámara activa.
 * Muestra preview (RTSP o MP4 local), estado, métodos activos, y controles.
 * 
 * Las cámaras en este flujo siempre están activas (se crean al hacer POST).
 * 
 * @param {object} camera - { camera_id, name, source }
 * @param {object|null} state - estado activo desde useCameraState
 * @param {boolean} isSelected - si está seleccionada para ver logs
 * @param {boolean} devMode
 * @param {string|null} localVideoUrl - URL de objeto local (MP4)
 * @param {function} onSelect - callback click en card
 * @param {function} onDelete - callback detener/eliminar
 * @param {function} onPatchMethod - callback agregar método PATCH
 */
export default function CameraCard({
  camera,
  state,
  isSelected,
  devMode,
  localVideoUrl,
  onSelect,
  onDelete,
  onPatchMethod,
}) {
  const videoRef = useRef(null);
  const isActive = !!state?.active;
  const isPluma = state?.mode === 'pluma_extendida';

  useEffect(() => {
    if (localVideoUrl && videoRef.current) {
      videoRef.current.src = localVideoUrl;
      videoRef.current.play().catch(() => {});
    }
  }, [localVideoUrl]);

  const activeMethodLabels = (state?.activeMethods || []).map(id => {
    const method = PLUMA_PATCH_METHODS.find(m => m.id === id);
    return method?.label || id;
  });

  return (
    <div
      className={`camera-card ${isSelected ? 'camera-card--selected' : ''} camera-card--active`}
      onClick={() => onSelect(camera.camera_id)}
    >
      {/* Preview */}
      <div className="camera-card__preview">
        {localVideoUrl ? (
          <video
            ref={videoRef}
            className="camera-card__video"
            muted
            loop
            playsInline
          />
        ) : (
          <div className="camera-card__feed-indicator">
            <span className="camera-card__feed-icon">◉</span>
            <span className="camera-card__feed-label">RTSP ACTIVO</span>
          </div>
        )}

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
        <div className="camera-card__source">
          {devMode ? '⬡ archivo local' : camera.source}
        </div>

        {/* Actions */}
        <div className="camera-card__actions">
          <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(camera.camera_id); }}>
            Detener
          </Button>
          {isPluma && (
            <Button variant="default" size="sm" onClick={(e) => { e.stopPropagation(); onPatchMethod(camera.camera_id); }}>
              + Método
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
