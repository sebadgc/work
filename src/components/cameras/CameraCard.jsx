import { useRef, useEffect } from 'react';
import { StatusDot, Button, Badge } from '../common';
import { PLUMA_PATCH_METHODS } from '../../config';
import './CameraCard.css';

/**
 * Card individual de cámara.
 * Muestra preview (RTSP o MP4 local), estado, métodos activos, y controles.
 * 
 * @param {object} camera - { camera_id, name, source }
 * @param {object|null} state - estado activo desde useCameraState
 * @param {boolean} isSelected - si está seleccionada para ver logs
 * @param {boolean} devMode - si está en modo dev
 * @param {string|null} localVideoUrl - URL de objeto local (MP4)
 * @param {function} onSelect - callback click en card
 * @param {function} onStartPluma - callback iniciar pluma
 * @param {function} onStartCollision - callback iniciar colisión
 * @param {function} onDelete - callback eliminar
 * @param {function} onPatchMethod - callback agregar método
 */
export default function CameraCard({
  camera,
  state,
  isSelected,
  devMode,
  localVideoUrl,
  onSelect,
  onStartPluma,
  onStartCollision,
  onDelete,
  onPatchMethod,
}) {
  const videoRef = useRef(null);
  const isActive = !!state?.active;
  const isPluma = state?.mode === 'pluma_extendida';

  useEffect(() => {
    if (isActive && localVideoUrl && videoRef.current) {
      videoRef.current.src = localVideoUrl;
      videoRef.current.play().catch(() => {});
    }
  }, [isActive, localVideoUrl]);

  const activeMethodLabels = (state?.activeMethods || []).map(id => {
    const method = PLUMA_PATCH_METHODS.find(m => m.id === id);
    return method?.label || id;
  });

  return (
    <div
      className={`camera-card ${isSelected ? 'camera-card--selected' : ''} ${isActive ? 'camera-card--active' : ''}`}
      onClick={() => onSelect(camera.camera_id)}
    >
      {/* Preview */}
      <div className="camera-card__preview">
        {isActive && localVideoUrl ? (
          <video
            ref={videoRef}
            className="camera-card__video"
            muted
            loop
            playsInline
          />
        ) : isActive ? (
          <div className="camera-card__feed-indicator">
            <span className="camera-card__feed-icon">◉</span>
            <span className="camera-card__feed-label">RTSP ACTIVO</span>
          </div>
        ) : (
          <div className="camera-card__offline">SIN SEÑAL</div>
        )}

        {/* Status overlay */}
        <div className="camera-card__status-overlay">
          <StatusDot status={isActive ? 'active' : 'inactive'} />
          <span className="camera-card__status-label">
            {isActive ? (isPluma ? 'PLUMA' : 'COLISIÓN') : 'OFF'}
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
          <span className="camera-card__id">{camera.camera_id}</span>
        </div>
        <div className="camera-card__source">
          {devMode ? '⬡ archivo local' : camera.source}
        </div>

        {/* Actions */}
        <div className="camera-card__actions">
          {!isActive ? (
            <>
              <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); onStartPluma(camera); }}>
                Pluma Ext.
              </Button>
              <Button variant="default" size="sm" onClick={(e) => { e.stopPropagation(); onStartCollision(camera); }}>
                Colisión
              </Button>
            </>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
