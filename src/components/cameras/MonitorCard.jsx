import { useState, useEffect } from 'react';
import { StatusDot, Button, Badge } from '../common';
import { PLUMA_PATCH_METHODS, MESSAGES } from '../../config';
import { snapshotsService } from '../../api';
import './MonitorCard.css';

const M = MESSAGES;

const pad = (n) => String(n).padStart(2, '0');
const fmtDay = (k) => { if (!k) return ''; const [y, m, d] = k.split('-'); return `${d}/${m}/${y}`; };

const LEVEL_COLOR = {
  critical: 'red', error: 'red', danger: 'red', alarm: 'red', alert: 'red', high: 'red',
  warning: 'yellow', warn: 'yellow', medium: 'yellow',
  info: 'blue', low: 'neutral', debug: 'neutral',
};
const levelColor = (lvl) => LEVEL_COLOR[(lvl || '').toLowerCase()] || 'neutral';

/**
 * Recuadro de cámara activa (módulo Monitoreo, sin feed RTSP).
 * Muestra los procesadores activos y la ÚLTIMA alarma (snapshot del backend, no manual).
 *
 * @param {object} camera - { camera_id, name }
 * @param {object|null} state - { pluma:{active,methods}, collision:{active} }
 * @param {boolean} isSelected, isStopping
 * @param {string} snapshotsRoot
 * @param {function} onSelect, onDelete
 */
export default function MonitorCard({ camera, state, isSelected, isStopping, snapshotsRoot, onSelect, onDelete }) {
  const [snap, setSnap] = useState(null);
  const isPlumaOn = !!state?.pluma?.active;
  const isCollisionOn = !!state?.collision?.active;

  const methodLabels = (state?.pluma?.methods || []).map(id => {
    const m = PLUMA_PATCH_METHODS.find(x => x.id === id);
    return m?.label || id;
  });

  // Última alarma del backend (snapshot no manual). Se refresca cada 8s.
  useEffect(() => {
    let alive = true;
    const fetchLatest = async () => {
      const dates = await snapshotsService.getDates({ camera: camera.camera_id, root: snapshotsRoot });
      if (!alive) return;
      const latestDate = dates[0];
      if (!latestDate) { setSnap(null); return; }
      const list = await snapshotsService.getSnapshots({ camera: camera.camera_id, date: latestDate, root: snapshotsRoot });
      if (!alive) return;
      setSnap(list.find(s => s.source === 'backend') || null);
    };
    fetchLatest();
    const t = setInterval(fetchLatest, 8000);
    return () => { alive = false; clearInterval(t); };
  }, [camera.camera_id, snapshotsRoot]);

  return (
    <div
      className={`monitor-card ${isSelected ? 'monitor-card--selected' : ''}`}
      onClick={() => onSelect(camera.camera_id)}
    >
      <div className="monitor-card__head">
        <StatusDot status="active" />
        <span className="monitor-card__name">{camera.name || camera.camera_id}</span>
      </div>

      <div className="monitor-card__section-title">{M.monitor.processors}</div>
      <div className="monitor-card__procs">
        {isPlumaOn && <Badge color="green">{M.cameraCard.badgePluma}</Badge>}
        {methodLabels.map((l, i) => <Badge key={i} color="accent">{l}</Badge>)}
        {isCollisionOn && <Badge color="blue">{M.cameraCard.badgeColision}</Badge>}
        {!isPlumaOn && !isCollisionOn && (
          <span className="monitor-card__muted">{M.monitor.noProcessors}</span>
        )}
      </div>

      <div className="monitor-card__section-title">{M.monitor.lastSnapshot}</div>
      {snap ? (
        <div className="monitor-card__snap">
          <img className="monitor-card__snap-img" src={snap.url} alt={snap.casuistica} />
          <div className="monitor-card__snap-meta">
            {snap.level && <Badge color={levelColor(snap.level)}>{snap.level}</Badge>}
            <span className="monitor-card__snap-casu">{snap.casuistica}</span>
            <span className="monitor-card__snap-time">{fmtDay(snap.date)} · {snap.time}</span>
          </div>
        </div>
      ) : (
        <div className="monitor-card__nosnap">{M.monitor.noSnapshot}</div>
      )}

      <div className="monitor-card__actions">
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
  );
}
