/**
 * projects.config.js
 *
 * Registro central de proyectos/módulos de la plataforma.
 * Para agregar un nuevo proyecto:
 *   1. Crear su componente página en src/pages/
 *   2. Agregar una entrada acá con id, label, icon, y component (lazy o directo)
 *   3. Si necesita su propio provider/context, agregarlo en el campo `provider`
 *
 * Cada proyecto puede tener sub-módulos internos (tabs) que se manejan
 * dentro de su propia página.
 */

// Los componentes se importan lazy para que no carguen todos de entrada
import { lazy } from 'react';

const SecurityPage = lazy(() => import('../pages/SecurityPage'));

/**
 * @typedef {Object} ProjectConfig
 * @property {string} id - Identificador único del proyecto
 * @property {string} label - Nombre visible en la sidebar
 * @property {string} icon - Emoji o carácter para el ícono
 * @property {string} description - Descripción corta (tooltip)
 * @property {React.LazyExoticComponent} component - Componente página (lazy)
 */

const PROJECTS = [
  {
    id: 'seguridad',
    label: 'Seguridad',
    icon: '◉',
    description: 'Monitoreo de cámaras y detección de riesgos',
    component: SecurityPage,
  },
  // Ejemplo de cómo agregar otro proyecto:
  // {
  //   id: 'analytics',
  //   label: 'Analytics',
  //   icon: '◈',
  //   description: 'Dashboards y reportes',
  //   component: lazy(() => import('../pages/AnalyticsPage')),
  // },
];

export default PROJECTS;
