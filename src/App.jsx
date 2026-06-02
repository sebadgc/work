import { useState, Suspense } from 'react';
import PROJECTS from './config/projects.config';
import { MESSAGES } from './config';
import { AppProvider } from './context';
import { AppHeader, Sidebar } from './components/layout';
import './styles/global.css';

/**
 * Shell global de la plataforma.
 *
 * Estructura: Sidebar (izquierda) + Header (arriba) + página activa.
 * Las páginas se registran en projects.config.js y comparten estado vía
 * AppProvider (un único provider que envuelve todo).
 *
 * TODAS las páginas quedan montadas y se muestran/ocultan con CSS, para que el
 * feed de video (WebRTC) de la página de Cámaras siga corriendo aunque estés
 * mirando Logs o Snapshots.
 */
export default function App() {
  const [activeProjectId, setActiveProjectId] = useState(PROJECTS[0]?.id || '');
  const activeProject = PROJECTS.find(p => p.id === activeProjectId);

  return (
    <AppProvider>
      <div className="app-shell">
        <Sidebar
          projects={PROJECTS}
          activeProjectId={activeProjectId}
          onSelectProject={setActiveProjectId}
        />
        <div className="app-main">
          <AppHeader activeProjectLabel={activeProject?.label || ''} />
          <div className="app-content">
            <Suspense fallback={
              <div className="app-loading">{MESSAGES.app.loadingModule}</div>
            }>
              {PROJECTS.map((p) => {
                const Comp = p.component;
                const active = p.id === activeProjectId;
                return (
                  <div
                    key={p.id}
                    className="app-page"
                    style={{ display: active ? 'flex' : 'none' }}
                    aria-hidden={!active}
                  >
                    <Comp />
                  </div>
                );
              })}
            </Suspense>
          </div>
        </div>
      </div>
    </AppProvider>
  );
}
