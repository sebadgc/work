import './CameraGrid.css';

/**
 * Grid responsive para las camera cards.
 * Solo layout — no conoce la lógica de cámaras.
 */
export default function CameraGrid({ children, loading }) {
  if (loading) {
    return (
      <div className="camera-grid__loading">
        <span className="camera-grid__spinner">◌</span>
        <span>Cargando cámaras...</span>
      </div>
    );
  }

  return <div className="camera-grid">{children}</div>;
}
