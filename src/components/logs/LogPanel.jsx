import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '../common';
import './LogPanel.css';

const pad = (n) => String(n).padStart(2, '0');

// 'YYYY-MM-DD' → 'DD/MM/YYYY'
function formatDay(date) {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

// Agrupa logs por día. Días más nuevos primero; dentro de cada día, más nuevo arriba.
function groupByDay(logs) {
  const map = new Map();
  for (const log of logs) {
    const dt = new Date(log.ts || Date.now());
    const date = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    if (!map.has(date)) map.set(date, []);
    map.get(date).push(log);
  }
  return Array.from(map.entries())
    .map(([date, items]) => ({ date, label: formatDay(date), items: items.slice().reverse() }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export default function LogPanel({
  logs,
  selectedCameraId,
  selectedCameraName,
  allCameras,
  cameraStates,
  unreadCameras,
  onSelectCamera,
  onClearLogs,
}) {
  const scrollRef = useRef(null);
  const [panelWidth, setPanelWidth] = useState(380);
  const isResizing = useRef(false);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    isResizing.current = true;

    const onMouseMove = (ev) => {
      if (!isResizing.current) return;
      const newWidth = window.innerWidth - ev.clientX;
      setPanelWidth(Math.max(280, Math.min(800, newWidth)));
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  // Los logs se muestran del más nuevo al más viejo → al llegar uno nuevo,
  // scrolleamos al tope para mantenerlo visible.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs]);

  const dayGroups = useMemo(() => groupByDay(logs), [logs]);

  return (
    <div className="log-panel" style={{ width: panelWidth, minWidth: panelWidth }}>
      <div className="log-panel__resize-handle" onMouseDown={handleMouseDown} />

      {/* Header */}
      <div className="log-panel__header">
        <span className="log-panel__title">LOGS</span>
        {selectedCameraId && logs.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearLogs}>
            Limpiar
          </Button>
        )}
      </div>

      {/* Camera tabs - arriba del log */}
      <div className="log-panel__tabs">
        {allCameras.map((cam) => {
          const isSelected = selectedCameraId === cam.camera_id;
          const hasUnread = !isSelected && unreadCameras?.includes(cam.camera_id);
          return (
            <button
              key={cam.camera_id}
              className={`log-panel__tab ${isSelected ? 'log-panel__tab--selected' : ''} ${hasUnread ? 'log-panel__tab--unread' : ''}`}
              onClick={() => onSelectCamera(cam.camera_id)}
            >
              {cam.camera_id}
            </button>
          );
        })}
      </div>

      {/* Log lines */}
      <div className="log-panel__scroll" ref={scrollRef}>
        {!selectedCameraId ? (
          <div className="log-panel__empty">Seleccioná una cámara para ver logs</div>
        ) : logs.length === 0 ? (
          <div className="log-panel__empty">Sin logs todavía...</div>
        ) : (
          // Agrupado por día (más nuevo arriba); el encabezado de día queda sticky.
          dayGroups.map((g) => (
            <div key={g.date} className="log-day-group">
              <div className="log-day">{g.label}</div>
              {g.items.map((log, i) => <LogLine key={`${log.ts}-${i}`} log={log} />)}
            </div>
          ))
        )}
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
