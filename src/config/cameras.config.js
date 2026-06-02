/**
 * cameras.config.js
 *
 * Cámaras preset "por definición" (defaults en código). El dev server las mergea
 * con cameras.local.json (ediciones hechas desde el ⚙) cada vez que se levanta.
 *
 * IMPORTANTE: solo datos planos (sin imports) — este archivo también lo lee el
 * plugin del dev server (Node) en vite.config.js.
 *
 * Estructura de un preset:
 *   {
 *     id, name, rtsp,
 *     pluma:     { enabled, config: { not_detected_cooldown, detected_cooldown } },
 *     collision: { enabled, config: { collision_alarm_id, not_detected_cooldown, detected_cooldown } },
 *   }
 *
 * Al encender pluma se inician además TODOS sus métodos opcionales (patas,
 * security_elements, signaler, tagline, linea_de_fuego, work_at_height),
 * heredando los cooldowns de `pluma.config`.
 */

export const DEFAULT_CAMERAS = [
  {
    id: 'cam-test-01',
    name: 'Cámara de prueba 1',
    rtsp: 'rtsp://localhost:8554/cam-test-01',
    pluma: { enabled: true, config: { not_detected_cooldown: 5, detected_cooldown: 2 } },
    collision: { enabled: true, config: { collision_alarm_id: '', not_detected_cooldown: 5, detected_cooldown: 2 } },
  },
  {
    id: 'cam-test-02',
    name: 'Cámara de prueba 2',
    rtsp: 'rtsp://localhost:8554/cam-test-02',
    pluma: { enabled: true, config: { not_detected_cooldown: 5, detected_cooldown: 2 } },
    collision: { enabled: false, config: { collision_alarm_id: '', not_detected_cooldown: 5, detected_cooldown: 2 } },
  },
  {
    id: 'cam-test-03',
    name: 'Cámara de prueba 3',
    rtsp: 'rtsp://localhost:8554/cam-test-03',
    pluma: { enabled: false, config: { not_detected_cooldown: 5, detected_cooldown: 2 } },
    collision: { enabled: true, config: { collision_alarm_id: '', not_detected_cooldown: 5, detected_cooldown: 2 } },
  },
];
