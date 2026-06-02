import { useState, Suspense } from 'react';
import { isDev } from './config';
import PROJECTS from './config/projects.config';
import { AppProvider } from './context';
import { AppHeader, Sidebar } from './components/layout';
import './styles/global.css';

/**
 * Shell global de la plataforma.
 *
 * Estructura: Sidebar (izquierda) + Header (arriba) + página activa.
 * Las páginas se registran en projects.config.js y comparten estado vía
 * AppProvider (un único provider que envuelve todo).
 */
export default function App() {
  const [activeProjectId, setActiveProjectId] = useState(PROJECTS[0]?.id || '');
  const [devMode, setDevMode] = useState(isDev());

  const activeProject = PROJECTS.find(p => p.id === activeProjectId);
  const ProjectComponent = activeProject?.component;

  return (
    <AppProvider devMode={devMode}>
      <div className="app-shell">
        <Sidebar
          projects={PROJECTS}
          activeProjectId={activeProjectId}
          onSelectProject={setActiveProjectId}
        />
        <div className="app-main">
          <AppHeader
            activeProjectLabel={activeProject?.label || ''}
            devMode={devMode}
            onToggleDevMode={setDevMode}
          />
          <div className="app-content">
            <Suspense fallback={
              <div className="app-loading">Cargando módulo...</div>
            }>
              {ProjectComponent ? (
                <ProjectComponent devMode={devMode} />
              ) : (
                <div className="app-loading">Página no encontrada</div>
              )}
            </Suspense>
          </div>
        </div>
      </div>
    </AppProvider>
  );
}
