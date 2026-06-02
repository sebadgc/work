/**
 * snapshotsService.js
 *
 * Lee/escribe snapshots vía el plugin del dev server (/api/snapshots):
 *  - backend: <root>/snapshots/<cam>/<fecha>/*.jpg  (root configurable en settings)
 *  - manual:  data/manual-snapshots/<cam>/<fecha>/manual_*.jpg
 */

const API = '/api/snapshots';

export const snapshotsService = {
  async getDates({ camera, root }) {
    if (!camera) return [];
    try {
      const qs = new URLSearchParams({ camera });
      if (root) qs.set('root', root);
      const res = await fetch(`${API}/dates?${qs.toString()}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async getSnapshots({ camera, date, root }) {
    if (!camera || !date) return [];
    try {
      const qs = new URLSearchParams({ camera, date });
      if (root) qs.set('root', root);
      const res = await fetch(`${API}?${qs.toString()}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async saveManual({ camera, dataUrl }) {
    if (!camera || !dataUrl) return false;
    try {
      const res = await fetch(`${API}/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ camera, dataUrl }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};

export default snapshotsService;
