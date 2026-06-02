import { useState } from 'react';
import { MESSAGES } from '../../config';
import { useAppContext } from '../../context';
import './Sidebar.css';

/**
 * Sidebar colapsable con lista de proyectos.
 *
 * @param {Array} projects - desde projects.config.js
 * @param {string} activeProjectId
 * @param {function} onSelectProject
 */
export default function Sidebar({ projects, activeProjectId, onSelectProject }) {
  const [collapsed, setCollapsed] = useState(false);
  const { unreadByCamera } = useAppContext();

  // Sumatoria de logs sin leer (todas las cámaras) → badge en el módulo Logs.
  const totals = Object.values(unreadByCamera || {}).reduce(
    (a, u) => ({ info: a.info + (u.info || 0), warn: a.warn + (u.warn || 0), error: a.error + (u.error || 0) }),
    { info: 0, warn: 0, error: 0 },
  );
  const unreadTotal = totals.info + totals.warn + totals.error;
  const unreadSev = totals.error ? 'error' : totals.warn ? 'warn' : 'info';

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__top">
        <button
          className="sidebar__toggle"
          onClick={() => setCollapsed(prev => !prev)}
          title={collapsed ? MESSAGES.sidebar.expand : MESSAGES.sidebar.collapse}
        >
          {collapsed ? '▸' : '◂'}
        </button>
      </div>

      <nav className="sidebar__nav">
        {projects.map(project => (
          <button
            key={project.id}
            className={`sidebar__item ${activeProjectId === project.id ? 'sidebar__item--active' : ''}`}
            onClick={() => onSelectProject(project.id)}
            title={project.description}
          >
            <span className="sidebar__item-icon">{project.icon}</span>
            {!collapsed && (
              <span className="sidebar__item-label">{project.label}</span>
            )}
            {project.id === 'logs' && unreadTotal > 0 && (
              <span className={`sidebar__badge sidebar__badge--${unreadSev}`}>
                {unreadTotal > 99 ? '99+' : unreadTotal}
              </span>
            )}
          </button>
        ))}
      </nav>

      {!collapsed && (
        <div className="sidebar__footer">
          <span className="sidebar__footer-text">
            {MESSAGES.sidebar.pagesCount(projects.length)}
          </span>
        </div>
      )}
    </aside>
  );
}
