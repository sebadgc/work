import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '../context';
import { snapshotsService } from '../api';
import { Button, Badge, Modal } from '../components/common';
import './SnapshotsPage.css';

const pad = (n) => String(n).padStart(2, '0');
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const fmtDay = (k) => { if (!k) return ''; const [y, m, d] = k.split('-'); return `${d}/${m}/${y}`; };

/**
 * Página de Snapshots: lee las capturas del filesystem por cámara y día.
 *  - backend: <snapshotsRoot>/snapshots/<cam>/<fecha>/*.jpg
 *  - manual:  data/manual-snapshots/<cam>/<fecha>/manual_*.jpg
 */
export default function SnapshotsPage() {
  const { settings, cameras, presets } = useAppContext();
  const root = settings.snapshotsRoot || '';

  const cameraIds = useMemo(() => {
    const ids = new Set((presets || []).map(p => p.id));
    cameras.forEach(c => ids.add(c.camera_id));
    return Array.from(ids).sort();
  }, [presets, cameras]);

  const [camera, setCamera] = useState('');
  const [dates, setDates] = useState([]);
  const [day, setDay] = useState(todayKey());
  const [alertFilter, setAlertFilter] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(null);

  // Cámara por defecto
  useEffect(() => {
    if (!camera && cameraIds.length) setCamera(cameraIds[0]);
  }, [cameraIds, camera]);

  // Fechas disponibles al cambiar de cámara
  useEffect(() => {
    if (!camera) { setDates([]); return undefined; }
    let alive = true;
    snapshotsService.getDates({ camera, root }).then(ds => {
      if (!alive) return;
      setDates(ds);
      setDay(prev => (ds.includes(prev)
        ? prev
        : (ds.includes(todayKey()) ? todayKey() : (ds[0] || todayKey()))));
    });
    return () => { alive = false; };
  }, [camera, root]);

  // Snapshots al cambiar cámara/día
  const reload = useCallback(() => {
    if (!camera || !day) { setItems([]); return; }
    setLoading(true);
    snapshotsService.getSnapshots({ camera, date: day, root }).then(list => {
      setItems(list);
      setLoading(false);
    });
  }, [camera, day, root]);

  useEffect(() => { reload(); }, [reload]);

  const alertTypes = useMemo(() => Array.from(new Set(items.map(s => s.alert))).sort(), [items]);
  const filtered = useMemo(
    () => items.filter(s => alertFilter === 'all' || s.alert === alertFilter),
    [items, alertFilter],
  );

  if (!root) {
    return (
      <div className="snapshots-page">
        <div className="snapshots-page__empty">
          <div className="snapshots-page__empty-icon">▦</div>
          <p className="snapshots-page__empty-title">Configurá la carpeta de snapshots</p>
          <p className="snapshots-page__empty-hint">
            En ⚙ → Conexión, seteá “Carpeta de snapshots (root)” para ver las imágenes
            que guarda el backend.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="snapshots-page">
      <div className="snapshots-page__toolbar">
        <select className="snapshots-page__select" value={camera} onChange={e => setCamera(e.target.value)}>
          {cameraIds.length === 0 && <option value="">(sin cámaras)</option>}
          {cameraIds.map(id => <option key={id} value={id}>{id}</option>)}
        </select>

        <select className="snapshots-page__select" value={day} onChange={e => setDay(e.target.value)}>
          {dates.length === 0 && <option value={day}>{fmtDay(day)}</option>}
          {dates.map(d => <option key={d} value={d}>{fmtDay(d)}</option>)}
        </select>

        <select className="snapshots-page__select" value={alertFilter} onChange={e => setAlertFilter(e.target.value)}>
          <option value="all">Todas las alertas</option>
          {alertTypes.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <span className="snapshots-page__count">{filtered.length}</span>
        <div className="snapshots-page__spacer" />
        <Button variant="ghost" size="sm" onClick={reload}>Refrescar</Button>
      </div>

      {loading ? (
        <div className="snapshots-page__empty">
          <p className="snapshots-page__empty-hint">Cargando…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="snapshots-page__empty">
          <div className="snapshots-page__empty-icon">▦</div>
          <p className="snapshots-page__empty-title">Sin snapshots</p>
          <p className="snapshots-page__empty-hint">
            No hay capturas para {camera || 'esta cámara'} el {fmtDay(day)}.
          </p>
        </div>
      ) : (
        <div className="snapshots-page__grid">
          {filtered.map(s => (
            <button key={`${s.source}-${s.name}`} className="snap-card" onClick={() => setZoom(s)}>
              <div className="snap-card__thumb">
                <img src={s.url} alt={s.alert} loading="lazy" />
                <span className="snap-card__cam">{camera}</span>
              </div>
              <div className="snap-card__meta">
                <Badge color={s.source === 'manual' ? 'neutral' : 'red'}>{s.alert}</Badge>
                <span className="snap-card__time">{s.time}{s.source === 'manual' ? ' · manual' : ''}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {zoom && (
        <Modal
          onClose={() => setZoom(null)}
          title={camera}
          subtitle={`${zoom.alert} — ${fmtDay(day)} ${zoom.time}${zoom.source === 'manual' ? ' · manual' : ''}`}
        >
          <img className="snap-zoom__img" src={zoom.url} alt={zoom.alert} />
        </Modal>
      )}
    </div>
  );
}
