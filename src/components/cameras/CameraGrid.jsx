import './CameraGrid.css';

export default function CameraGrid({ children, loading, selectedId }) {
  if (loading) {
    return (
      <div className="camera-grid__loading">
        <span className="camera-grid__spinner">◌</span>
        <span>Cargando cámaras...</span>
      </div>
    );
  }

  const childArray = Array.isArray(children) ? children : [children];
  const selected = childArray.find(c => c?.key === selectedId);
  const others = childArray.filter(c => c?.key !== selectedId);

  return (
    <div className="camera-grid">
      {selected && (
        <div className="camera-grid__focus">
          {selected}
        </div>
      )}
      {selected && others.length > 0 && (
        <hr className="camera-grid__divider" />
      )}
      {others.length > 0 && (
        <div className="camera-grid__rest">
          {others}
        </div>
      )}
    </div>
  );
}
