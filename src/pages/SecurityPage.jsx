import { useState } from 'react';
import { AppProvider } from '../context';
import CamerasPage from './CamerasPage';
import './SecurityPage.css';

/**
 * Página del proyecto "Seguridad".
 * Contiene sub-módulos internos (tabs) — por ahora solo "Cámaras".
 * Envuelve todo en AppProvider para aislar el estado de cámaras/logs.
 *
 * Para agregar sub-módulos:
 *   1. Crear el componente
 *   2. Agregar entrada en SECURITY_TABS
 *   3. Agregar case en renderTab
 */
const SECURITY_TABS = [
  { id: 'cameras', label: 'Cámaras' },
  // { id: 'incidents', label: 'Incidentes' },
  // { id: 'reports', label: 'Reportes' },
];

export default function SecurityPage({ devMode }) {
  const [activeTab, setActiveTab] = useState('cameras');

  const renderTab = () => {
    switch (activeTab) {
      case 'cameras':
        return <CamerasPage />;
      default:
        return (
          <div className="security-page__placeholder">
            Módulo "{activeTab}" — próximamente
          </div>
        );
    }
  };

  return (
    <AppProvider initialDevMode={devMode}>
      <div className="security-page">
        {SECURITY_TABS.length > 1 && (
          <div className="security-page__tabs">
            {SECURITY_TABS.map(tab => (
              <button
                key={tab.id}
                className={`security-page__tab ${activeTab === tab.id ? 'security-page__tab--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
        <div className="security-page__content">
          {renderTab()}
        </div>
      </div>
    </AppProvider>
  );
}
