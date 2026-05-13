import { createContext, useContext, useState } from 'react';
import { useCameraState } from '../hooks/useCameraState';
import { useLogs } from '../hooks/useLogs';
import { useLocalFiles } from '../hooks/useLocalFiles';

const AppContext = createContext(null);

/**
 * Provider para el módulo de seguridad.
 * Recibe devMode desde arriba (gestionado a nivel App global).
 */
export function AppProvider({ children, initialDevMode = false }) {
  const [devMode] = useState(initialDevMode);
  const [cameras, setCameras] = useState([]);

  const cameraState = useCameraState();
  const logs = useLogs();
  const localFiles = useLocalFiles();

  const registerCamera = (cameraId, source, label) => {
    setCameras(prev => {
      if (prev.find(c => c.camera_id === cameraId)) return prev;
      return [...prev, { camera_id: cameraId, source, name: label || cameraId }];
    });
  };

  const unregisterCamera = (cameraId) => {
    setCameras(prev => prev.filter(c => c.camera_id !== cameraId));
  };

  const value = {
    devMode,
    cameras,
    registerCamera,
    unregisterCamera,
    ...cameraState,
    ...logs,
    ...localFiles,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be inside AppProvider');
  return ctx;
}
