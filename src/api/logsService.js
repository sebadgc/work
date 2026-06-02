/**
 * logsService.js
 *
 * Persistencia de logs en archivos (vía el plugin del dev server, /api/logs).
 * appendLogs apendea por lotes; getLogs trae el historial por cámara/día.
 * Best-effort: si el endpoint no está, falla silencioso (los logs viven en memoria).
 */

const API = '/api/logs';

export const logsService = {
  async appendLogs(camera, entries) {
    if (!camera || !entries?.length) return false;
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ camera, entries }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async getLogs({ camera, days = 30 } = {}) {
    try {
      const qs = new URLSearchParams({ days: String(days) });
      if (camera) qs.set('camera', camera);
      const res = await fetch(`${API}?${qs.toString()}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },
};

export default logsService;
