import { useState, useEffect, useMemo } from 'react';
import { StatusDot, Button, Badge, Modal, ConfirmModal } from '../common';
import { MESSAGES } from '../../config';
import { snapshotsService } from '../../api';
import './MonitorCard.css';

const M = MESSAGES;
const WAH_ID = 'work_at_height'; // método opcional "Trabajo en Altura" (apagable aparte)

const fmtDay = (k) => { if (!k || !k.includes('-')) return k || ''; const [y, m, d] = k.split('-'); return `${d}/${m}/${y}`; };

const LEVEL_COLOR = {
  critical: 'red', error: 'red', danger: 'red', alarm: 'red', alert: 'red', high: 'red',
  warning: 'yellow', warn: 'yellow', medium: 'yellow',
  info: 'blue', low: 'neutral', debug: 'neutral',
};
const levelColor = (lvl) => LEVEL_COLOR[(lvl || '').toLowerCase()] || 'neutral';

const snapTime = (s) => {
  const t = new Date(`${s.date}T${s.time || '00:00:00'}`).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/**
 * Recuadro de cámara activa (módulo Monitoreo, sin feed RTSP).
 * Procesadores agrupados (Pluma + Todos / Trabajo en Altura / Colisión) + última
 * alarma del backend de esta sesión, con su análisis. Trabajo en Altura es apagable.
 */
export default function MonitorCard({
  camera, state, isSelected, isStopping, snapshotsRoot, logs = [], alarmLevel,
  onSelect, onAcknowledge, onToggleMethod, onDelete,
}) {
  const [snap, setSnap] = useState(null);
  const [zoom, setZoom] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);

  const since = (camera.startedAt || 0) - 1500;

  const isPlumaOn = !!state?.pluma?.active;
  const isCollisionOn = !!state?.collision?.active;
  const workAtHeightOn = (state?.pluma?.methods || []).includes(WAH_ID);

  // Procesadores agrupados.
  const groups = [];
  if (isPlumaOn) groups.push({ key: 'pluma', label: M.monitor.groupPluma, color: 'green' });
  if (workAtHeightOn) groups.push({ key: 'wah', label: M.monitor.groupWorkAtHeight, color: 'accent', toggleable: true });
  if (isCollisionOn) groups.push({ key: 'col', label: M.monitor.groupColision, color: 'blue' });

  // Última alarma del backend de ESTA sesión. Refresca cada 8s.
  useEffect(() => {
    let alive = true;
    const fetchLatest = async () => {
      const dates = await snapshotsService.getDates({ camera: camera.camera_id, root: snapshotsRoot });
      if (!alive) return;
      const latestDate = dates[0];
      if (!latestDate) { setSnap(null); return; }
      const list = await snapshotsService.getSnapshots({ camera: camera.camera_id, date: latestDate, root: snapshotsRoot });
      if (!alive) return;
      setSnap(list.find(s => s.source === 'backend' && snapTime(s) >= since) || null);
    };
    fetchLatest();
    const t = setInterval(fetchLatest, 8000);
    return () => { alive = false; clearInterval(t); };
  }, [camera.camera_id, snapshotsRoot, since]);

  // Análisis correlacionado: log info "{filename}: {analisis}".
  const analisis = useMemo(() => {
    if (!snap) return '';
    const base = snap.name.replace(/\.jpe?g$/i, '');
    const l = logs.find(x => x.type === 'info' && typeof x.message === 'string'
      && (x.message.includes(snap.name) || x.message.includes(base)));
    if (!l) return '';
    const i = l.message.indexOf(':');
    return i >= 0 ? l.message.slice(i + 1).trim() : l.message.trim();
  }, [snap, logs]);

  const alarmClass = alarmLevel === 'error'
    ? 'monitor-card--alarm-error'
    : alarmLevel === 'warn' ? 'monitor-card--alarm-warn' : '';

  return (
    <div
      className={`monitor-card ${isSelected ? 'monitor-card--selected' : ''} ${alarmClass}`}
      onClick={() => onSelect(camera.camera_id)}
    >
      <div className="monitor-card__head">
        <StatusDot status="active" />
        <span className="monitor-card__name">{camera.name || camera.camera_id}</span>
      </div>

      <div className="monitor-card__section-title">{M.monitor.processors}</div>
      <div className="monitor-card__groups">
        {groups.length === 0 && <span className="monitor-card__muted">{M.monitor.noProcessors}</span>}
        {groups.map((g, i) => (
          <div key={g.key}>
            {i > 0 && <div className="monitor-card__group-sep" />}
            {g.toggleable ? (
              <button
                type="button"
                className="monitor-card__group monitor-card__group--toggle"
                title={M.monitor.offWahMessage}
                onClick={(e) => { e.stopPropagation(); setConfirmOff(true); }}
              >
                <Badge color={g.color}>{g.label}</Badge>
                <span className="monitor-card__group-x">✕</span>
              </button>
            ) : (
              <div className="monitor-card__group">
                <Badge color={g.color}>{g.label}</Badge>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="monitor-card__section-title">{M.monitor.lastSnapshot}</div>
      {snap ? (
        <>
          <div className="monitor-card__snap">
            <img
              className="monitor-card__snap-img"
              src={snap.url}
              alt={snap.casuistica}
              onClick={(e) => { e.stopPropagation(); setZoom(true); }}
            />
            <div className="monitor-card__snap-meta">
              {snap.level && <Badge color={levelColor(snap.level)}>{snap.level}</Badge>}
              <span className="monitor-card__snap-casu">{snap.casuistica}</span>
              <span className="monitor-card__snap-time">{fmtDay(snap.date)} · {snap.time}</span>
            </div>
          </div>
          {analisis && (
            <>
              <div className="monitor-card__section-title">{M.monitor.analysis}</div>
              <p className="monitor-card__analysis">{analisis}</p>
            </>
          )}
        </>
      ) : (
        <div className="monitor-card__nosnap">{M.monitor.noSnapshot}</div>
      )}

      <div className="monitor-card__actions">
        <div className="monitor-card__actions-left">
          {alarmLevel && (
            <Button variant="default" size="sm" onClick={(e) => { e.stopPropagation(); onAcknowledge?.(); }}>
              {M.monitor.acknowledge}
            </Button>
          )}
        </div>
        <div className="monitor-card__actions-right">
          {isStopping ? (
            <span className="monitor-card__stopping">
              <span className="monitor-card__spinner">◌</span> {M.cameraCard.stopping}
            </span>
          ) : (
            <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(camera.camera_id); }}>
              {M.cameraCard.stop}
            </Button>
          )}
        </div>
      </div>

      {zoom && snap && (
        <Modal
          size="wide"
          onClose={() => setZoom(false)}
          title={camera.name || camera.camera_id}
          subtitle={`${snap.casuistica}${snap.level ? ` · ${snap.level}` : ''} — ${fmtDay(snap.date)} ${snap.time}`}
        >
          <img className="monitor-card__zoom-img" src={snap.url} alt={snap.casuistica} />
          {analisis && <p className="monitor-card__zoom-analysis">{analisis}</p>}
        </Modal>
      )}

      {confirmOff && (
        <ConfirmModal
          title={M.monitor.groupWorkAtHeight}
          message={M.monitor.offWahMessage}
          confirmLabel={M.monitor.offWahConfirm}
          variant="danger"
          onConfirm={() => { setConfirmOff(false); onToggleMethod?.(camera.camera_id, WAH_ID); }}
          onClose={() => setConfirmOff(false)}
        />
      )}
    </div>
  );
}
