import { MESSAGES } from '../../config';
import './AppHeader.css';

/**
 * Header global de la plataforma. Brand + nombre de la página activa.
 *
 * Nota: la rueda de configuración (⚙ → SettingsModal) está desactivada por ahora.
 * El componente SettingsModal y su cableado siguen disponibles para reactivarlo
 * a futuro (ver historial / components/modals/SettingsModal.jsx).
 *
 * @param {string} activeProjectLabel - nombre de la página actualmente seleccionada
 */
export default function AppHeader({ activeProjectLabel }) {
  return (
    <header className="app-header">
      <div className="app-header__left">
        <div className="app-header__brand">
          <div className="app-header__logo">◈</div>
          <div className="app-header__brand-text">
            <h1 className="app-header__title">{MESSAGES.header.brand}</h1>
            <span className="app-header__subtitle">{activeProjectLabel}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
