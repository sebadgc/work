/**
 * useCameraConfig.js
 *
 * Carga las cámaras preset (defaults + overrides) vía cameraConfigService y
 * expone helpers para editarlas/persistirlas (usado por el editor del ⚙).
 */

import { useState, useEffect, useCallback } from 'react';
import { cameraConfigService } from '../api/cameraConfigService';

export function useCameraConfig() {
  const [presets, setPresets] = useState([]);
  const [presetsLoaded, setPresetsLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    cameraConfigService.getCameras().then((list) => {
      if (alive) {
        setPresets(Array.isArray(list) ? list : []);
        setPresetsLoaded(true);
      }
    });
    return () => { alive = false; };
  }, []);

  // Reemplaza toda la lista y persiste (usado por el editor del ⚙).
  const savePresets = useCallback((list) => {
    setPresets(list);
    return cameraConfigService.saveCameras(list);
  }, []);

  return { presets, presetsLoaded, savePresets };
}
