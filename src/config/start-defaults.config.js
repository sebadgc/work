/**
 * start-defaults.config.js
 *
 * ⭐ ÚNICO lugar para editar lo que el front le manda al backend POR DEFAULT al
 * ENCENDER una cámara preset (pluma, colisión y cada método PATCH opcional).
 *
 * Qué se manda exactamente (al activar una cámara):
 *   POST /cameras/start_pluma_extendida      → body: { camera_id, source, pluma_config: <pluma> }
 *   POST /cameras/start_collision_detection  → body: { camera_id, source, collision_config: <collision> }
 *   PATCH /{camera_id}/{metodo}              → body: <methods[metodo]>   ({} = SIN body)
 *
 * Precedencia:
 *   - pluma / colisión: si el preset (cameras.config.js o ⚙ → Cámaras) define su
 *     config, ESA gana; si no, se usa la de acá.
 *   - métodos PATCH: SIEMPRE se usa lo de `methods` de acá. `{}` = no se manda body
 *     y el backend aplica sus propios defaults. Completá campos para sobrescribir.
 */

export const START_DEFAULTS = {
  // pluma_config (POST start_pluma_extendida)
  pluma: {
    not_detected_cooldown: 5,
    detected_cooldown: 2,
  },

  // collision_config (POST start_collision_detection)
  collision: {
    collision_alarm_id: '',
    not_detected_cooldown: 5,
    detected_cooldown: 2,
  },

  // Body del PATCH de cada opcional de pluma. {} = sin body → defaults del backend.
  // Los campos posibles de cada uno están en endpoints.config.js (PLUMA_PATCH_METHODS).
  methods: {
    patas: {},                 // { alarm_id }
    security_elements: {},     // { perimeter_alarm_id, helmet_alarm_id, coverall_alarm_id }
    signaler: {},              // { signaler_alarm_id }
    tagline: {},               // { tagline_alarm_id }
    linea_de_fuego: {},        // { linea_fuego_alarm_id }
    work_at_height: {},        // { work_at_height_alarm_id }
  },
};

export default START_DEFAULTS;
