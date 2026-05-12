import { Badge, Button } from '../common';
import { isDev } from '../../config';
import './AppHeader.css';

/**
 * Header de la aplicación.
 * Incluye navegación por módulos (preparado para expansión)
 * y toggle de modo dev (solo visible si isDev()).
 * 
 * @param {string} activeModule - módulo actualmente seleccionado
 * @param {Array} modules - [{ id, label }]
 * @param {function} onModuleChange
 * @param {boolean} devMode - si el modo dev está activo
 * @param {function} onToggleDevMode
 * @param {number} activeCameraCount
 * @param {number} totalCameraCount
 */
export default function AppHeader({
  activeModule,
  modules,
  onModuleChange,
  devMode,
  onToggleDevMode,
  activeCameraCount,
  totalCameraCount,
}) {
  return (
    <header className="app-header">
      <div className="app-header__left">
        <div className="app-header__brand">
          <div className="app-header__logo">◈</div>
          <div className="app-header__brand-text">
            <h1 className="app-header__title">Vision Control</h1>
            <span className="app-header__subtitle">
              {activeCameraCount} activa{activeCameraCount !== 1 ? 's' : ''} / {totalCameraCount} configurada{totalCameraCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Module navigation - extensible */}
        <nav className="app-header__nav">
          {modules.map(mod => (
            <button
              key={mod.id}
              className={`app-header__nav-item ${activeModule === mod.id ? 'app-header__nav-item--active' : ''}`}
              onClick={() => onModuleChange(mod.id)}
            >
              {mod.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="app-header__right">
        {devMode && <Badge color="accent">DEV</Badge>}
        {isDev() && (
          <label className="app-header__dev-toggle">
            <input
              type="checkbox"
              checked={devMode}
              onChange={(e) => onToggleDevMode(e.target.checked)}
            />
            <span>Modo local</span>
          </label>
        )}
      </div>
    </header>
  );
}
