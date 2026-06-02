/**
 * projects.config.js
 *
 * Registro central de páginas de la plataforma (entradas de la sidebar).
 * Para agregar una nueva página:
 *   1. Crear su componente página en src/pages/
 *   2. Agregar una entrada acá con id, label, icon, y component (lazy)
 *
 * El estado compartido (cámaras, logs, snapshots, settings) lo provee
 * AppProvider a nivel App.jsx, así que todas las páginas lo comparten.
 */

// Los componentes se importan lazy para que no carguen todos de entrada.
import { lazy } from 'react';
import { MESSAGES } from './messages';

const CamerasPage = lazy(() => import('../pages/CamerasPage'));
const LogsPage = lazy(() => import('../pages/LogsPage'));
const SnapshotsPage = lazy(() => import('../pages/SnapshotsPage'));

/**
 * @typedef {Object} ProjectConfig
 * @property {string} id - Identificador único de la página
 * @property {string} label - Nombre visible en la sidebar
 * @property {string} icon - Emoji o carácter para el ícono
 * @property {string} description - Descripción corta (tooltip)
 * @property {React.LazyExoticComponent} component - Componente página (lazy)
 */

const PROJECTS = [
  {
    id: 'cameras',
    label: MESSAGES.pages.cameras.label,
    icon: '◉',
    description: MESSAGES.pages.cameras.description,
    component: CamerasPage,
  },
  {
    id: 'logs',
    label: MESSAGES.pages.logs.label,
    icon: '≡',
    description: MESSAGES.pages.logs.description,
    component: LogsPage,
  },
  {
    id: 'snapshots',
    label: MESSAGES.pages.snapshots.label,
    icon: '▦',
    description: MESSAGES.pages.snapshots.description,
    component: SnapshotsPage,
  },
];

export default PROJECTS;
