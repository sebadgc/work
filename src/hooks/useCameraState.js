/**
 * useCameraState.js
 *
 * Estado de los detectores activos por cámara. Una cámara (camera_id) puede
 * correr pluma y/o colisión al mismo tiempo:
 *
 *   cameraStates[id] = {
 *     pluma:     { active, config, methods: [] },  // methods = ids de opcionales activos
 *     collision: { active, config },
 *   }
 */

import { useState, useCallback } from 'react';

const emptyCamera = () => ({
  pluma: { active: false, config: null, methods: [] },
  collision: { active: false, config: null },
});

export function useCameraState() {
  const [cameraStates, setCameraStates] = useState({});

  const activateGroup = useCallback((cameraId, group, config) => {
    setCameraStates(prev => {
      const cam = prev[cameraId] || emptyCamera();
      return {
        ...prev,
        [cameraId]: {
          ...cam,
          [group]: { ...cam[group], active: true, config: config ?? cam[group].config },
        },
      };
    });
  }, []);

  const deactivateGroup = useCallback((cameraId, group) => {
    setCameraStates(prev => {
      const cam = prev[cameraId];
      if (!cam) return prev;
      const next = { ...cam[group], active: false };
      if (group === 'pluma') next.methods = [];
      return { ...prev, [cameraId]: { ...cam, [group]: next } };
    });
  }, []);

  // Saca la cámara entera del estado (al hacer DELETE / Detener).
  const removeCamera = useCallback((cameraId) => {
    setCameraStates(prev => {
      const next = { ...prev };
      delete next[cameraId];
      return next;
    });
  }, []);

  const addMethod = useCallback((cameraId, methodId) => {
    setCameraStates(prev => {
      const cam = prev[cameraId];
      if (!cam || cam.pluma.methods.includes(methodId)) return prev;
      return {
        ...prev,
        [cameraId]: { ...cam, pluma: { ...cam.pluma, methods: [...cam.pluma.methods, methodId] } },
      };
    });
  }, []);

  const removeMethod = useCallback((cameraId, methodId) => {
    setCameraStates(prev => {
      const cam = prev[cameraId];
      if (!cam) return prev;
      return {
        ...prev,
        [cameraId]: { ...cam, pluma: { ...cam.pluma, methods: cam.pluma.methods.filter(m => m !== methodId) } },
      };
    });
  }, []);

  const getCamera = useCallback((cameraId) => cameraStates[cameraId] || null, [cameraStates]);

  return {
    cameraStates,
    activateGroup,
    deactivateGroup,
    removeCamera,
    addMethod,
    removeMethod,
    getCamera,
  };
}
