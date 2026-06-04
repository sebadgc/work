import { useState, useEffect, useMemo } from 'react';
import { StatusDot, Button, Badge, Modal } from '../common';
import { PLUMA_PATCH_METHODS, MESSAGES } from '../../config';
import { snapshotsService } from '../../api';
import './MonitorCard.css';

const M = MESSAGES;

const fmtDay = (k) => { if (!k) return ''; const [y, m, d] = k.split('-'); return `${d}/${m}/${y}`; };

const LEVEL_COLOR = {
  critical: 'red', error: 'red', danger: 'red', alarm: 'red', alert: 'red', high: 'red',
  warning: 'yellow', warn: 'yellow', medium: 'yellow',
  info: 'blue', low: 'neutral', debug: 'neutral',
};
const levelColor = (lvl) => LEVEL_COLOR[(lvl || '').toLowerCase()] || 'neutral';

// Timestamp (ms, hora local) de un snapshot a partir de su fecha + hora.
const snapTime = (s) => {
  const t = new Date(`${s.date}T${s.time || '00:00:00'}`).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/**
 * Recuadro de cámara activa (módulo Monitoreo, sin feed RTSP).
 * Muestra los procesadores y la ÚLTIMA alarma de ESTA sesión (snapshot del backend
 * posterior al encendido), con su análisis. Click en la imagen → se agranda.
 *
 * @param {object} camera - { camera_id, name, startedAt }
 * @param {object|null} state
 * @param {boolean} isSelected, isStopping
 * @param {string} snapshotsRoot
 * @param {Array} logs - logs de esta cámara (para correlacionar el análisis)
 * @param {function} onSelect, onDelete
 */
export default function MonitorCard({ camera, state, isSelected, isStopping, snapshotsRoot, logs = [], onSelect, onDelete }) {
  const [snap, setSnap] = useState(null);
  const [zoom, setZoom] = useState(false);

  // Pequeña tolerancia para no excluir un snapshot del mismo segundo del encendido.
  const since = (camera.startedAt || 0) - 1500;

  const isPlumaOn = !!state?.pluma?.active;
  const isCollisionOn = !!state?.collision?.active;
  const methodLabels = (state?.pluma?.methods || []).map(id => {
    const m = PLUMA_PATCH_METHODS.find(x => x.id === id);
    return m?.label || id;
  });

  // Última alarma del backend de ESTA sesión (>= startedAt). Refresca cada 8s.
  useEffect(() => {
    let alive = true;
    const fetchLatest = async () => {
      const dates = await snapshotsService.getDates({ camera: camera.camera_id, root: snapshotsRoot });
      if (!alive) return;
      const latestDate = dates[0];
      if (!latestDate) { setSnap(null); return; }
      const list = await snapshotsService.getSnapshots({ camera: camera.camera_id, date: latestDate, root: snapshotsRoot });
      if (!alive) return;
      // list viene ordenado desc por hora → el primero que sea del backend y de esta sesión.
      setSnap(list.find(s => s.source === 'backend' && snapTime(s) >= since) || null);
    };
    fetchLatest();
    const t = setInterval(fetchLatest, 8000);
    return () => { alive = false; clearInterval(t); };
  }, [camera.camera_id, snapshotsRoot, since]);

  // Análisis correlacionado: log info con formato "{filename}: {analisis}".
  // Matchea por filename (con o sin extensión) y toma lo que va tras los dos puntos.
  const analisis = useMemo(() => {
    if (!snap) return '';
    const base = snap.name.replace(/\.jpe?g$/i, '');
    const l = logs.find(x => x.type === 'info' && typeof x.message === 'string'
      && (x.message.includes(snap.name) || x.message.includes(base)));
    if (!l) return '';
    const i = l.message.indexOf(':');
    return i >= 0 ? l.message.slice(i + 1).trim() : l.message.trim();
  }, [snap, logs]);

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
    </div>
  );
}
