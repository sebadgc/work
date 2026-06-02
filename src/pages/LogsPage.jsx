import { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '../context';
import { Button, Badge } from '../components/common';
import './LogsPage.css';

const TYPE_FILTERS = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'info', label: 'Info' },
  { value: 'detection', label: 'Detección' },
  { value: 'warn', label: 'Warn' },
  { value: 'error', label: 'Error' },
];

const TYPE_BADGE = { info: 'neutral', detection: 'blue', warn: 'yellow', error: 'red' };

const pad = (n) => String(n).padStart(2, '0');
const dayKey = (ts) => {
  const d = new Date(ts || 0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const fmtDay = (key) => { const [y, m, d] = key.split('-'); return `${d}/${m}/${y}`; };
const fmtDateTime = (ts) => {
  const d = new Date(ts || 0);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/**
 * Página de Logs: historial de todos los logs (persistidos en archivos) por
 * cámara, con filtros por cámara, por día, por tipo y búsqueda de texto.
 */
export default function LogsPage() {
  const { logsByCamera, cameras, clearAllLogs, loadAllHistory } = useAppContext();
  const [cameraFilter, setCameraFilter] = useState('all');
  const [dayFilter, setDayFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => { loadAllHistory(); }, [loadAllHistory]);

  const cameraIds = useMemo(() => {
    const ids = new Set(Object.keys(logsByCamera));
    cameras.forEach(c => ids.add(c.camera_id));
    return Array.from(ids).sort();
  }, [logsByCamera, cameras]);

  const allRows = useMemo(() => {
    const all = [];
    Object.entries(logsByCamera).forEach(([camId, logs]) => {
      (logs || []).forEach(l => all.push({ ...l, camera_id: camId }));
    });
    return all;
  }, [logsByCamera]);

  const availableDays = useMemo(() => {
    const set = new Set(allRows.map(r => dayKey(r.ts)));
    return Array.from(set).sort().reverse();
  }, [allRows]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allRows
      .filter(r => cameraFilter === 'all' || r.camera_id === cameraFilter)
      .filter(r => dayFilter === 'all' || dayKey(r.ts) === dayFilter)
      .filter(r => typeFilter === 'all' || r.type === typeFilter)
      .filter(r => !q
        || (r.message || '').toLowerCase().includes(q)
        || r.camera_id.toLowerCase().includes(q))
      .sort((a, b) => (b.ts || 0) - (a.ts || 0));
  }, [allRows, cameraFilter, dayFilter, typeFilter, query]);

  return (
    <div className="logs-page">
      <div className="logs-page__toolbar">
        <select className="logs-page__select" value={cameraFilter} onChange={e => setCameraFilter(e.target.value)}>
          <option value="all">Todas las cámaras</option>
          {cameraIds.map(id => <option key={id} value={id}>{id}</option>)}
        </select>

        <select className="logs-page__select" value={dayFilter} onChange={e => setDayFilter(e.target.value)}>
          <option value="all">Todos los días</option>
          {availableDays.map(d => <option key={d} value={d}>{fmtDay(d)}</option>)}
        </select>

        <select className="logs-page__select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          {TYPE_FILTERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        <input
          className="logs-page__search"
          type="text"
          placeholder="Buscar en logs…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />

        <span className="logs-page__count">{rows.length} / {allRows.length}</span>
        <div className="logs-page__spacer" />
        {allRows.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAllLogs}>Limpiar vista</Button>
        )}
      </div>

      <div className="logs-page__list">
        {rows.length === 0 ? (
          <div className="logs-page__empty">
            {allRows.length === 0
              ? 'No hay logs todavía. Iniciá una cámara para empezar a registrar.'
              : 'Ningún log coincide con los filtros.'}
          </div>
        ) : (
          rows.map((r, i) => (
            <div key={`${r.camera_id}-${r.ts}-${i}`} className={`logs-row logs-row--${r.type}`}>
              <span className="logs-row__time">{fmtDateTime(r.ts)}</span>
              <span className="logs-row__cam" title={r.camera_id}>{r.camera_id}</span>
              <span className="logs-row__type">
                <Badge color={TYPE_BADGE[r.type] || 'neutral'}>{r.type}</Badge>
              </span>
              <span className="logs-row__msg">{r.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
