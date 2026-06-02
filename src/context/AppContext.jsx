import { createContext, useContext, useState, useEffect } from 'react';
import { useCameraState } from '../hooks/useCameraState';
import { useLogs } from '../hooks/useLogs';
import { useLocalFiles } from '../hooks/useLocalFiles';
import { useSettings } from '../hooks/useSettings';
import { useSnapshots } from '../hooks/useSnapshots';
import apiClient from '../api/apiClient';

const AppContext = createContext(null);

/**
 * Provider global de la plataforma. Envuelve TODAS las páginas (Cámaras, Logs,
 * Snapshots) para que compartan el mismo estado: cámaras, logs, snapshots y
 * settings. `devMode` se recibe desde App (toggle del header).
 */
export function AppProvider({ children, devMode = false }) {
  const [cameras, setCameras] = useState([]);

  const settingsApi = useSettings();
  const snapshots = useSnapshots();
  const cameraState = useCameraState();
  const logs = useLogs({ onSnapshot: snapshots.addSnapshot });
  const localFiles = useLocalFiles();

  // Mantener el apiClient sincronizado con la URL de settings.
  useEffect(() => {
    if (settingsApi.settings.apiBaseUrl) {
      apiClient.setBaseUrl(settingsApi.settings.apiBaseUrl);
    }
  }, [settingsApi.settings.apiBaseUrl]);

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
    ...settingsApi,
    ...cameraState,
    ...logs,
    ...snapshots,
    ...localFiles,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be inside AppProvider');
  return ctx;
}
