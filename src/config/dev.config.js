/**
 * dev.config.js
 * 
 * Configuración exclusiva para desarrollo/local.
 * En producción este módulo no debería importarse.
 * Solo contiene configuración para simular feeds de video sin RTSP.
 */

export const DEV_CONFIG = {
  // Si true, permite cargar archivos MP4 locales como fuente de video
  ENABLE_LOCAL_FILES: true,
};
