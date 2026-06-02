import { useState } from 'react';
import { useAppContext } from '../../context';
import { SettingsModal } from '../modals';
import './AppHeader.css';

/**
 * Header global de la plataforma.
 * Brand + nombre de la página activa + acceso a Settings.
 *
 * @param {string} activeProjectLabel - nombre de la página actualmente seleccionada
 */
export default function AppHeader({ activeProjectLabel }) {
  const { settings, updateSettings, resetSettings } = useAppContext();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <header className="app-header">
      <div className="app-header__left">
        <div className="app-header__brand">
          <div className="app-header__logo">◈</div>
          <div className="app-header__brand-text">
            <h1 className="app-header__title">Monitor AIB</h1>
            <span className="app-header__subtitle">{activeProjectLabel}</span>
          </div>
        </div>
      </div>

      <div className="app-header__right">
        <button
          className="app-header__icon-btn"
          title="Configuración"
          aria-label="Configuración"
          onClick={() => setShowSettings(true)}
        >
          ⚙
        </button>
      </div>

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={updateSettings}
          onReset={resetSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </header>
  );
}
