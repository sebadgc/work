import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '../context';
import { snapshotsService } from '../api';
import { MESSAGES } from '../config';
import { Button, Badge, Modal } from '../components/common';
import './SnapshotsPage.css';

const M = MESSAGES;

const pad = (n) => String(n).padStart(2, '0');
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const fmtDay = (k) => { if (!k) return ''; const [y, m, d] = k.split('-'); return `${d}/${m}/${y}`; };

const LEVEL_COLOR = {
  critical: 'red', error: 'red', err: 'red', danger: 'red', alarm: 'red', alert: 'red', high: 'red',
  warning: 'yellow', warn: 'yellow', medium: 'yellow',
  info: 'blue', low: 'neutral', debug: 'neutral',
};
const levelColor = (lvl) => LEVEL_COLOR[(lvl || '').toLowerCase()] || 'neutral';

/**
 * Página de Snapshots: tabla de capturas (Fecha, Hora, Cámara, Casuística, Level,
 * miniatura) por cámara y día. Click en una fila → popup con la imagen grande.
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
  const [casuFilter, setCasuFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
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

  const casuTypes = useMemo(() => Array.from(new Set(items.map(s => s.casuistica))).sort(), [items]);
  const levelTypes = useMemo(
    () => Array.from(new Set(items.map(s => s.level).filter(Boolean))).sort(),
    [items],
  );
  const filtered = useMemo(() => items.filter(s =>
    (casuFilter === 'all' || s.casuistica === casuFilter)
    && (levelFilter === 'all' || s.level === levelFilter)
  ), [items, casuFilter, levelFilter]);

  const cols = M.snapshots.cols;

  return (
    <div className="snapshots-page">
      {!root && <div className="snapshots-page__note">{M.snapshots.noRootNote}</div>}

      <div className="snapshots-page__toolbar">
        <select className="snapshots-page__select" value={camera} onChange={e => setCamera(e.target.value)}>
          {cameraIds.length === 0 && <option value="">{M.snapshots.noCameras}</option>}
          {cameraIds.map(id => <option key={id} value={id}>{id}</option>)}
        </select>

        <select className="snapshots-page__select" value={day} onChange={e => setDay(e.target.value)}>
          {dates.length === 0 && <option value={day}>{fmtDay(day)}</option>}
          {dates.map(d => <option key={d} value={d}>{fmtDay(d)}</option>)}
        </select>

        <select className="snapshots-page__select" value={casuFilter} onChange={e => setCasuFilter(e.target.value)}>
          <option value="all">{M.snapshots.allAlerts}</option>
          {casuTypes.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        {levelTypes.length > 0 && (
          <select className="snapshots-page__select" value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
            <option value="all">{M.snapshots.allLevels}</option>
            {levelTypes.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        )}

        <span className="snapshots-page__count">{filtered.length}</span>
        <div className="snapshots-page__spacer" />
        <Button variant="ghost" size="sm" onClick={reload}>{M.snapshots.refresh}</Button>
      </div>

      {loading ? (
        <div className="snapshots-page__empty">
          <p className="snapshots-page__empty-hint">{M.snapshots.loading}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="snapshots-page__empty">
          <div className="snapshots-page__empty-icon">▦</div>
          <p className="snapshots-page__empty-title">{M.snapshots.emptyTitle}</p>
          <p className="snapshots-page__empty-hint">{M.snapshots.emptyHint(camera, fmtDay(day))}</p>
        </div>
      ) : (
        <div className="snapshots-page__table-wrap">
          <table className="snap-table">
            <thead>
              <tr>
                <th>{cols.date}</th>
                <th>{cols.time}</th>
                <th>{cols.camera}</th>
                <th>{cols.casuistica}</th>
                <th>{cols.level}</th>
                <th>{cols.photo}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={`${s.source}-${s.name}`} className="snap-row" onClick={() => setZoom(s)}>
                  <td>{fmtDay(s.date)}</td>
                  <td className="snap-mono">{s.time}</td>
                  <td className="snap-mono">{camera}</td>
                  <td>{s.casuistica}{s.source === 'manual' ? M.snapshots.manualTag : ''}</td>
                  <td>{s.level ? <Badge color={levelColor(s.level)}>{s.level}</Badge> : <span className="snap-dash">—</span>}</td>
                  <td><img className="snap-thumb" src={s.url} alt={s.casuistica} loading="lazy" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {zoom && (
        <Modal
          size="wide"
          onClose={() => setZoom(null)}
          title={camera}
          subtitle={`${zoom.casuistica}${zoom.level ? ` · ${zoom.level}` : ''} — ${fmtDay(day)} ${zoom.time}${zoom.source === 'manual' ? M.snapshots.manualTag : ''}`}
        >
          <img className="snap-zoom__img" src={zoom.url} alt={zoom.casuistica} />
        </Modal>
      )}
    </div>
  );
}
