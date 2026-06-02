/**
 * app.config.js
 * 
 * Configuración centralizada de la aplicación.
 * Todos los valores que dependen del entorno o del backend se definen aquí.
 * Nada está hardcodeado en componentes — todo sale de este archivo o del backend.
 */

const ENV = {
  // Cambiar a 'production' para deploy
  MODE: import.meta.env?.VITE_APP_MODE || 'development',
  
  // URL base de la API de procesamiento de cámaras
  API_BASE_URL: import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000',
  
  // Intervalo de polling para logs (ms)
  LOG_POLL_INTERVAL: Number(import.meta.env?.VITE_LOG_POLL_INTERVAL) || 2000,
  
  // Máximo de líneas de log en memoria por cámara
  MAX_LOG_LINES: Number(import.meta.env?.VITE_MAX_LOG_LINES) || 500,

  // Carpeta (en el server del backend) donde viven los videos de prueba en dev.
  // Se usa para armar el `source` cuando se elige un archivo local.
  DEV_VIDEO_DIR: import.meta.env?.VITE_DEV_VIDEO_DIR || './videos',
};

const isDev = () => ENV.MODE === 'development';

export { ENV, isDev };
