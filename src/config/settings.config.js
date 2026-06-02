/**
 * settings.config.js
 *
 * Configuración editable por el usuario en runtime (persistida en localStorage
 * vía useSettings). Los defaults apuntan a localhost para que el flujo de testeo
 * local funcione sin tocar nada. Las URLs reales (RTSP / gateway / API) se
 * setean desde el modal de Settings (engranaje en el header).
 */

export const SETTINGS_STORAGE_KEY = 'monitor-aib:settings';

export const SETTINGS_DEFAULTS = {
  // URL base del backend de procesamiento (POST/DELETE/PATCH/SSE).
  apiBaseUrl: 'http://localhost:8000',
  // Base del gateway WebRTC (WHEP) que reexpone el RTSP como video reproducible
  // en el navegador. Default = MediaMTX local (ver el proyecto rtsp-sim).
  webrtcBaseUrl: 'http://localhost:8889',
  // Base RTSP que consume el backend. Informativo / para armar URLs de ejemplo.
  rtspBaseUrl: 'rtsp://localhost:8554',
};

/**
 * Campos editables en el modal de Settings (orden + labels + hints).
 */
export const SETTINGS_FIELDS = [
  {
    key: 'apiBaseUrl',
    label: 'API backend',
    placeholder: 'http://localhost:8000',
    hint: 'Backend de procesamiento (start/stop/PATCH + logs SSE).',
  },
  {
    key: 'webrtcBaseUrl',
    label: 'Gateway WebRTC (WHEP)',
    placeholder: 'http://localhost:8889',
    hint: 'Reexpone el RTSP como WebRTC para verlo en el navegador.',
  },
  {
    key: 'rtspBaseUrl',
    label: 'Base RTSP (referencia)',
    placeholder: 'rtsp://localhost:8554',
    hint: 'Base del RTSP que ingiere el backend. Solo informativo.',
  },
];

/**
 * Devuelve el "path" de una URL rtsp:// (lo que va después de host:port).
 * Ej: rtsp://10.11.6.111:654/00000011-.../live → "00000011-.../live"
 */
export function rtspPath(source = '') {
  try {
    // URL no parsea el esquema rtsp:; lo mapeamos a http: solo para extraer el path.
    const httpish = source.replace(/^rtsp:/i, 'http:');
    const u = new URL(httpish);
    return u.pathname.replace(/^\/+|\/+$/g, '');
  } catch {
    const m = source.match(/^\w+:\/\/[^/]+\/(.+)$/);
    return (m ? m[1] : '').replace(/^\/+|\/+$/g, '');
  }
}

/**
 * Construye la URL WHEP reproducible a partir del `source` de la cámara.
 * - source http(s):// → se asume gateway directo (se le agrega /whep si falta).
 * - source rtsp://    → se mapea a `${webrtcBaseUrl}/<path>/whep` (convención MediaMTX).
 * - otro (ruta local, etc.) → null (no hay preview por WebRTC).
 */
export function buildWhepUrl(webrtcBaseUrl, source) {
  if (!source || !webrtcBaseUrl) return null;

  if (/^https?:\/\//i.test(source)) {
    const clean = source.replace(/\/+$/, '');
    return clean.endsWith('/whep') ? clean : `${clean}/whep`;
  }

  if (/^rtsp:\/\//i.test(source)) {
    const path = rtspPath(source);
    if (!path) return null;
    return `${webrtcBaseUrl.replace(/\/+$/, '')}/${path}/whep`;
  }

  return null;
}
