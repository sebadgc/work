import { Badge } from '../common';
import { isDev } from '../../config';
import './AppHeader.css';

/**
 * Header global de la plataforma.
 * Solo brand + nombre del proyecto activo + dev toggle.
 *
 * @param {string} activeProjectLabel - nombre del proyecto actualmente seleccionado
 * @param {boolean} devMode
 * @param {function} onToggleDevMode
 */
export default function AppHeader({
  activeProjectLabel,
  devMode,
  onToggleDevMode,
}) {
  return (
    <header className="app-header">
      <div className="app-header__left">
        <div className="app-header__brand">
          <div className="app-header__logo">◈</div>
          <div className="app-header__brand-text">
            <h1 className="app-header__title">Vision Control</h1>
            <span className="app-header__subtitle">{activeProjectLabel}</span>
          </div>
        </div>
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
