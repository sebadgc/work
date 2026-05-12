import './StatusDot.css';

/**
 * Punto de estado animado — indica activo/inactivo/advertencia.
 * @param {'active'|'inactive'|'warning'} status
 * @param {'sm'|'md'} size
 */
export default function StatusDot({ status = 'inactive', size = 'sm' }) {
  return (
    <span
      className={`status-dot status-dot--${status} status-dot--${size}`}
      aria-label={status}
    />
  );
}
