import { createContext, useContext, useState } from 'react';
import { isDev } from '../config';
import { useCameraState } from '../hooks/useCameraState';
import { useLogs } from '../hooks/useLogs';
import { useLocalFiles } from '../hooks/useLocalFiles';

const AppContext = createContext(null);

/**
 * Provider global que comparte estado entre App (header) y módulos.
 * Centraliza: camera states, logs, local files, dev mode.
 */
export function AppProvider({ children }) {
  const [devMode, setDevMode] = useState(isDev());
  const [cameras, setCameras] = useState([]);

  const cameraState = useCameraState();
  const logs = useLogs();
  const localFiles = useLocalFiles();

  const value = {
    devMode,
    setDevMode,
    cameras,
    setCameras,
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
