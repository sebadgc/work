/**
 * endpoints.config.js
 * 
 * Definición de todos los endpoints de la API.
 * Si la API cambia rutas, se actualiza únicamente este archivo.
 */

export const ENDPOINTS = {
  // POST - Iniciar procesamiento pluma extendida
  START_PLUMA_EXTENDIDA: '/cameras/start_pluma_extendida',

  // POST - Iniciar detección de colisión
  START_COLLISION_DETECTION: '/cameras/start_collision_detection',

  // DELETE - Detener cámara por ID
  DELETE_CAMERA: (cameraId) => `/${cameraId}`,

  // PATCH - Métodos adicionales de análisis (solo pluma extendida)
  PATCH_METHOD: (cameraId, method) => `/${cameraId}/${method}`,

  // GET (SSE) - Stream de logs en tiempo real por cámara
  STREAM_LOGS: (cameraId) => `/${cameraId}/logs`,
};

/**
 * Métodos PATCH disponibles para pluma extendida.
 * Cada uno define: id (ruta), label (UI), y los campos opcionales de config.
 * Todos heredan not_detected_cooldown y detected_cooldown del config base.
 */
export const PLUMA_PATCH_METHODS = [
  {
    id: 'patas',
    label: 'Patas',
    configFields: [
      { key: 'alarm_id', label: 'Alarm ID', type: 'string', required: false },
    ],
  },
  {
    id: 'security_elements',
    label: 'Elementos de Seguridad',
    configFields: [
      { key: 'perimeter_alarm_id', label: 'Perimeter Alarm ID', type: 'string', required: false },
      { key: 'helmet_alarm_id', label: 'Helmet Alarm ID', type: 'string', required: false },
      { key: 'coverall_alarm_id', label: 'Coverall Alarm ID', type: 'string', required: false },
    ],
  },
  {
    id: 'signaler',
    label: 'Señalero',
    configFields: [
      { key: 'signaler_alarm_id', label: 'Signaler Alarm ID', type: 'string', required: false },
    ],
  },
  {
    id: 'tagline',
    label: 'Tagline',
    configFields: [
      { key: 'tagline_alarm_id', label: 'Tagline Alarm ID', type: 'string', required: false },
    ],
  },
  {
    id: 'linea_de_fuego',
    label: 'Línea de Fuego',
    configFields: [
      { key: 'linea_fuego_alarm_id', label: 'Línea de Fuego Alarm ID', type: 'string', required: false },
    ],
  },
  {
    id: 'work_at_height',
    label: 'Trabajo en Altura',
    configFields: [
      { key: 'work_at_height_alarm_id', label: 'Work at Height Alarm ID', type: 'string', required: false },
    ],
  },
];

/**
 * Campos base de cooldown que heredan todos los configs.
 */
export const BASE_COOLDOWN_FIELDS = [
  { key: 'not_detected_cooldown', label: 'Cooldown sin detección (seg)', type: 'number', required: true, min: 1 },
  { key: 'detected_cooldown', label: 'Cooldown con detección (seg)', type: 'number', required: true, min: 1 },
];
