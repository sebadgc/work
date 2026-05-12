/**
 * useCameraState.js
 * 
 * Hook para gestionar el estado de las cámaras activas.
 * Cada cámara activa tiene: mode, config, activeMethods[].
 */

import { useState, useCallback } from 'react';

/**
 * @typedef {Object} CameraState
 * @property {boolean} active
 * @property {'pluma_extendida'|'collision_detection'} mode
 * @property {object} config
 * @property {string[]} activeMethods - IDs de métodos PATCH activos (solo pluma)
 */

export function useCameraState() {
  const [cameraStates, setCameraStates] = useState({});

  const activateCamera = useCallback((cameraId, mode, config) => {
    setCameraStates(prev => ({
      ...prev,
      [cameraId]: { active: true, mode, config, activeMethods: [] },
    }));
  }, []);

  const deactivateCamera = useCallback((cameraId) => {
    setCameraStates(prev => {
      const next = { ...prev };
      delete next[cameraId];
      return next;
    });
  }, []);

  const addMethod = useCallback((cameraId, methodId) => {
    setCameraStates(prev => {
      const cam = prev[cameraId];
      if (!cam) return prev;
      return {
        ...prev,
        [cameraId]: {
          ...cam,
          activeMethods: [...cam.activeMethods, methodId],
        },
      };
    });
  }, []);

  const removeMethod = useCallback((cameraId, methodId) => {
    setCameraStates(prev => {
      const cam = prev[cameraId];
      if (!cam) return prev;
      return {
        ...prev,
        [cameraId]: {
          ...cam,
          activeMethods: cam.activeMethods.filter(m => m !== methodId),
        },
      };
    });
  }, []);

  const getState = useCallback((cameraId) => {
    return cameraStates[cameraId] || null;
  }, [cameraStates]);

  const getActiveCameras = useCallback(() => {
    return Object.entries(cameraStates)
      .filter(([, s]) => s.active)
      .map(([id, s]) => ({ cameraId: id, ...s }));
  }, [cameraStates]);

  return {
    cameraStates,
    activateCamera,
    deactivateCamera,
    addMethod,
    removeMethod,
    getState,
    getActiveCameras,
  };
}
