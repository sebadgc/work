import './CameraGrid.css';

/**
 * Grilla de cámaras. La cámara seleccionada (`.camera-card--selected`) se
 * muestra grande y centrada arriba; el resto forma una grilla debajo, separada
 * por una línea. Todo en un único contenedor (solo cambian clases CSS) para que
 * promover una cámara NO desmonte su feed de video.
 *
 * @param {boolean} showDivider - mostrar la línea entre la principal y la grilla
 */
export default function CameraGrid({ children, loading, showDivider }) {
  if (loading) {
    return (
      <div className="camera-grid__loading">
        <span className="camera-grid__spinner">◌</span>
        <span>Cargando cámaras...</span>
      </div>
    );
  }

  return (
    <div className="camera-grid">
      {children}
      {showDivider && <div className="camera-grid__divider" aria-hidden="true" />}
    </div>
  );
}
