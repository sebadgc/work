import { createContext, useContext, useState } from 'react';
import { isDev } from '../config';
import { useCameraState } from '../hooks/useCameraState';
import { useLogs } from '../hooks/useLogs';
import { useLocalFiles } from '../hooks/useLocalFiles';

const AppContext = createContext(null);

/**
 * Provider global.
 * Las cámaras no se fetchean — se crean desde el frontend al hacer POST.
 * "cameras" es la lista de cámaras registradas en la sesión (activas o detenidas).
 */
export function AppProvider({ children }) {
  const [devMode, setDevMode] = useState(isDev());
  const [cameras, setCameras] = useState([]);

  const cameraState = useCameraState();
  const logs = useLogs();
  const localFiles = useLocalFiles();

  /**
   * Registrar una cámara nueva en el estado local.
   * Se llama al hacer el POST exitoso o en modo dev.
   */
  const registerCamera = (cameraId, source, label) => {
    setCameras(prev => {
      if (prev.find(c => c.camera_id === cameraId)) return prev;
      return [...prev, { camera_id: cameraId, source, name: label || cameraId }];
    });
  };

  /**
   * Eliminar una cámara del estado local (al hacer DELETE).
   */
  const unregisterCamera = (cameraId) => {
    setCameras(prev => prev.filter(c => c.camera_id !== cameraId));
  };

  const value = {
    devMode,
    setDevMode,
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
