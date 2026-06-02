/**
 * cameraConfigService.js
 *
 * Acceso a la config de cámaras preset. En dev/preview pega contra el endpoint
 * /api/cameras que sirve el plugin de Vite (lee/escribe cameras.local.json
 * mergeado con DEFAULT_CAMERAS). Si el endpoint no está (build estático), cae a
 * DEFAULT_CAMERAS. Abstraído para enchufar un backend real más adelante.
 */

import { DEFAULT_CAMERAS } from '../config/cameras.config';

const API = '/api/cameras';

export const cameraConfigService = {
  async getCameras() {
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : DEFAULT_CAMERAS;
    } catch {
      return DEFAULT_CAMERAS;
    }
  },

  async saveCameras(list) {
    try {
      const res = await fetch(API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(list),
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};

export default cameraConfigService;
