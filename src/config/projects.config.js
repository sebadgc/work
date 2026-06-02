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
    label: 'Cámaras',
    icon: '◉',
    description: 'Monitoreo de cámaras y feeds en vivo',
    component: CamerasPage,
  },
  {
    id: 'logs',
    label: 'Logs',
    icon: '≡',
    description: 'Historial de logs por cámara',
    component: LogsPage,
  },
  {
    id: 'snapshots',
    label: 'Snapshots',
    icon: '▦',
    description: 'Capturas de alertas por cámara',
    component: SnapshotsPage,
  },
];

export default PROJECTS;
