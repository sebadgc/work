/**
 * dev.config.js
 * 
 * Configuración exclusiva para desarrollo/local.
 * En producción este módulo no debería importarse.
 * Contiene todo lo necesario para simular feeds sin acceso RTSP.
 */

export const DEV_CONFIG = {
  // Si true, permite cargar archivos MP4 locales como fuente de video
  ENABLE_LOCAL_FILES: true,

  // Si true, genera logs simulados para testing de la UI
  ENABLE_SIMULATED_LOGS: true,

  // Intervalo base (ms) entre logs simulados
  SIMULATED_LOG_INTERVAL_BASE: 2000,

  // Variación aleatoria (ms) sobre el intervalo base
  SIMULATED_LOG_INTERVAL_JITTER: 1500,
};

/**
 * Mensajes simulados por tipo de procesador.
 * Se usan solo cuando ENABLE_SIMULATED_LOGS es true.
 */
export const SIMULATED_LOG_MESSAGES = {
  pluma_extendida: [
    { type: 'info', message: 'Frame procesado — sin detección' },
    { type: 'detection', message: 'Pluma extendida detectada — confianza: 0.94' },
    { type: 'info', message: 'Cooldown activo — esperando siguiente ciclo' },
    { type: 'warn', message: 'Frame con baja luminosidad' },
    { type: 'detection', message: 'Vehículo en zona de pluma' },
  ],
  collision_detection: [
    { type: 'info', message: 'Frame analizado — tráfico normal' },
    { type: 'detection', message: 'Proximidad peligrosa detectada' },
    { type: 'warn', message: 'Velocidad relativa alta entre objetos' },
    { type: 'detection', message: 'Colisión detectada — activando alarma' },
  ],
  patas: [
    { type: 'detection', message: 'Pata de pluma detectada fuera de posición' },
    { type: 'info', message: 'Patas en posición correcta' },
  ],
  security_elements: [
    { type: 'detection', message: 'Casco no detectado en zona obligatoria' },
    { type: 'detection', message: 'Mameluco no detectado' },
    { type: 'info', message: 'Elementos de seguridad OK' },
  ],
  signaler: [
    { type: 'detection', message: 'Señalero no presente en zona de operación' },
    { type: 'info', message: 'Señalero detectado correctamente' },
  ],
  tagline: [
    { type: 'detection', message: 'Tagline no detectada en carga suspendida' },
    { type: 'info', message: 'Tagline presente' },
  ],
  linea_de_fuego: [
    { type: 'detection', message: 'Persona en línea de fuego' },
    { type: 'info', message: 'Zona despejada' },
  ],
  work_at_height: [
    { type: 'detection', message: 'Trabajo en altura sin arnés detectado' },
    { type: 'info', message: 'Arnés detectado correctamente' },
  ],
};
