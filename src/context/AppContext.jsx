import { createContext, useContext, useState, useEffect } from 'react';
import { useCameraState } from '../hooks/useCameraState';
import { useCameraConfig } from '../hooks/useCameraConfig';
import { useLogs } from '../hooks/useLogs';
import { useSettings } from '../hooks/useSettings';
import apiClient from '../api/apiClient';

const AppContext = createContext(null);

/**
 * Provider global de la plataforma. Envuelve TODAS las páginas (Cámaras, Logs,
 * Snapshots) para que compartan el mismo estado: cámaras, logs, snapshots y
 * settings.
 */
export function AppProvider({ children }) {
  const [cameras, setCameras] = useState([]);

  const settingsApi = useSettings();
  const cameraState = useCameraState();
  const cameraConfig = useCameraConfig();
  const logs = useLogs();

  // Mantener el apiClient sincronizado con la URL de settings.
  useEffect(() => {
    if (settingsApi.settings.apiBaseUrl) {
      apiClient.setBaseUrl(settingsApi.settings.apiBaseUrl);
    }
  }, [settingsApi.settings.apiBaseUrl]);

  const registerCamera = (cameraId, source, label) => {
    setCameras(prev => {
      if (prev.find(c => c.camera_id === cameraId)) return prev;
      // startedAt: marca de tiempo de encendido en esta sesión (para filtrar snapshots viejos).
      return [...prev, { camera_id: cameraId, source, name: label || cameraId, startedAt: Date.now() }];
    });
  };

  const unregisterCamera = (cameraId) => {
    setCameras(prev => prev.filter(c => c.camera_id !== cameraId));
  };

  const value = {
    cameras,
    registerCamera,
    unregisterCamera,
    ...settingsApi,
    ...cameraState,
    ...cameraConfig,
    ...logs,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be inside AppProvider');
  return ctx;
}
