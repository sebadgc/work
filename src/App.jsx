import { useState } from 'react';
import { AppProvider, useAppContext } from './context';
import { AppHeader } from './components/layout';
import { CamerasPage } from './pages';
import './styles/global.css';

/**
 * Módulos disponibles.
 * Para agregar uno nuevo: agregar entrada acá + crear página + agregar case abajo.
 */
const APP_MODULES = [
  { id: 'cameras', label: 'Cámaras' },
  // { id: 'analytics', label: 'Analytics' },
  // { id: 'settings', label: 'Configuración' },
];

function AppShell() {
  const [activeModule, setActiveModule] = useState('cameras');
  const { devMode, setDevMode, cameras, getActiveCameras } = useAppContext();

  const renderModule = () => {
    switch (activeModule) {
      case 'cameras':
        return <CamerasPage />;
      default:
        return (
          <div style={{ padding: 40, color: 'var(--text-tertiary)' }}>
            Módulo "{activeModule}" — próximamente
          </div>
        );
    }
  };

  return (
    <div className="app-root">
      <AppHeader
        activeModule={activeModule}
        modules={APP_MODULES}
        onModuleChange={setActiveModule}
        devMode={devMode}
        onToggleDevMode={setDevMode}
        activeCameraCount={getActiveCameras().length}
        totalCameraCount={cameras.length}
      />
      {renderModule()}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
