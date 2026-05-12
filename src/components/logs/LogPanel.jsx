import { useRef, useEffect } from 'react';
import { Button } from '../common';
import './LogPanel.css';

/**
 * Panel lateral de logs en tiempo real.
 * Muestra logs de la cámara seleccionada con auto-scroll.
 * 
 * @param {Array} logs - array de { time, type, message }
 * @param {string|null} selectedCameraId
 * @param {string|null} selectedCameraName
 * @param {Array} allCameras - lista de todas las cámaras para tabs
 * @param {object} cameraStates - estados activos
 * @param {function} onSelectCamera
 * @param {function} onClearLogs
 */
export default function LogPanel({
  logs,
  selectedCameraId,
  selectedCameraName,
  allCameras,
  cameraStates,
  onSelectCamera,
  onClearLogs,
}) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="log-panel">
      {/* Header */}
      <div className="log-panel__header">
        <span className="log-panel__title">
          {selectedCameraId
            ? `LOGS — ${selectedCameraName || selectedCameraId}`
            : 'LOGS — seleccioná una cámara'}
        </span>
        {selectedCameraId && logs.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearLogs}>
            Limpiar
          </Button>
        )}
      </div>

      {/* Log lines */}
      <div className="log-panel__scroll" ref={scrollRef}>
        {logs.length === 0 ? (
          <div className="log-panel__empty">
            {selectedCameraId ? 'Sin logs todavía...' : 'Seleccioná una cámara para ver logs'}
          </div>
        ) : (
          logs.map((log, i) => (
            <LogLine key={i} log={log} />
          ))
        )}
      </div>

      {/* Camera tabs */}
      <div className="log-panel__tabs">
        {allCameras.map((cam) => {
          const isActive = !!cameraStates[cam.camera_id]?.active;
          const isSelected = selectedCameraId === cam.camera_id;
          return (
            <button
              key={cam.camera_id}
              className={`log-panel__tab ${isSelected ? 'log-panel__tab--selected' : ''}`}
              onClick={() => onSelectCamera(cam.camera_id)}
            >
              {cam.camera_id}
              {isActive && <span className="log-panel__tab-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LogLine({ log }) {
  return (
    <div className={`log-line log-line--${log.type}`}>
      <span className="log-line__time">{log.time}</span>
      <span className="log-line__type">{log.type}</span>
      <span className="log-line__message">{log.message}</span>
    </div>
  );
}
