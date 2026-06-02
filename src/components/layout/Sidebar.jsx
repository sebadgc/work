import { useState } from 'react';
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

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__top">
        <button
          className="sidebar__toggle"
          onClick={() => setCollapsed(prev => !prev)}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
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
          </button>
        ))}
      </nav>

      {!collapsed && (
        <div className="sidebar__footer">
          <span className="sidebar__footer-text">
            {projects.length} página{projects.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </aside>
  );
}
