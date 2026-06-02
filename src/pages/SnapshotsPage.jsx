import { useMemo, useState } from 'react';
import { useAppContext } from '../context';
import { Button, Badge, Modal } from '../components/common';
import './SnapshotsPage.css';

function formatTs(iso) {
  try {
    return new Date(iso).toLocaleString('es-AR', {
      hour12: false,
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Página de Snapshots: galería de capturas de alerta (persistidas), con la
 * cámara, el tipo de alerta y el timestamp. Filtros por cámara y por alerta.
 */
export default function SnapshotsPage() {
  const { snapshots, cameras, clearSnapshots, removeSnapshot } = useAppContext();
  const [cameraFilter, setCameraFilter] = useState('all');
  const [alertFilter, setAlertFilter] = useState('all');
  const [zoom, setZoom] = useState(null);

  const cameraIds = useMemo(() => {
    const ids = new Set(snapshots.map(s => s.camera_id));
    cameras.forEach(c => ids.add(c.camera_id));
    return Array.from(ids).sort();
  }, [snapshots, cameras]);

  const alertTypes = useMemo(
    () => Array.from(new Set(snapshots.map(s => s.alert))).sort(),
    [snapshots],
  );

  const items = useMemo(() => (
    [...snapshots]
      .reverse() // más nuevos primero
      .filter(s => cameraFilter === 'all' || s.camera_id === cameraFilter)
      .filter(s => alertFilter === 'all' || s.alert === alertFilter)
  ), [snapshots, cameraFilter, alertFilter]);

  return (
    <div className="snapshots-page">
      <div className="snapshots-page__toolbar">
        <select
          className="snapshots-page__select"
          value={cameraFilter}
          onChange={e => setCameraFilter(e.target.value)}
        >
          <option value="all">Todas las cámaras</option>
          {cameraIds.map(id => <option key={id} value={id}>{id}</option>)}
        </select>

        <select
          className="snapshots-page__select"
          value={alertFilter}
          onChange={e => setAlertFilter(e.target.value)}
        >
          <option value="all">Todas las alertas</option>
          {alertTypes.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <span className="snapshots-page__count">{items.length} / {snapshots.length}</span>
        <div className="snapshots-page__spacer" />
        {snapshots.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => clearSnapshots()}>Limpiar todo</Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="snapshots-page__empty">
          <div className="snapshots-page__empty-icon">▦</div>
          <p className="snapshots-page__empty-title">No hay snapshots</p>
          <p className="snapshots-page__empty-hint">
            Las capturas aparecen cuando el backend reporta una detección.
            En dev podés usar “⚠ Simular alerta” en una cámara para generar una.
          </p>
        </div>
      ) : (
        <div className="snapshots-page__grid">
          {items.map(s => (
            <button key={s.id} className="snap-card" onClick={() => setZoom(s)}>
              <div className="snap-card__thumb">
                {s.imageUrl
                  ? <img src={s.imageUrl} alt={s.alert} loading="lazy" />
                  : <div className="snap-card__noimg">sin imagen</div>}
                <span className="snap-card__cam">{s.camera_id}</span>
              </div>
              <div className="snap-card__meta">
                <Badge color="red">{s.alert}</Badge>
                <span className="snap-card__time">{formatTs(s.timestamp)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {zoom && (
        <Modal
          onClose={() => setZoom(null)}
          title={zoom.camera_id}
          subtitle={`${zoom.alert} — ${formatTs(zoom.timestamp)}`}
        >
          {zoom.imageUrl
            ? <img className="snap-zoom__img" src={zoom.imageUrl} alt={zoom.alert} />
            : <div className="snap-card__noimg snap-zoom__noimg">sin imagen</div>}
          <div className="snap-zoom__actions">
            <Button
              variant="danger"
              size="sm"
              onClick={() => { removeSnapshot(zoom.id); setZoom(null); }}
            >
              Eliminar
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
