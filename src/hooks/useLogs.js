/**
 * useLogs.js
 * 
 * Hook para gestionar logs por cámara.
 * Mantiene un buffer limitado por cámara y expone operaciones simples.
 */

import { useState, useCallback, useRef } from 'react';
import { ENV, isDev, DEV_CONFIG, SIMULATED_LOG_MESSAGES } from '../config';

const timestamp = () =>
  new Date().toLocaleTimeString('es-AR', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

export function useLogs() {
  const [logsByCamera, setLogsByCamera] = useState({});
  const simIntervals = useRef({});

  const addLog = useCallback((cameraId, type, message) => {
    setLogsByCamera(prev => {
      const existing = prev[cameraId] || [];
      const updated = [...existing, { time: timestamp(), type, message }];
      // Mantener solo las últimas N líneas
      return { ...prev, [cameraId]: updated.slice(-ENV.MAX_LOG_LINES) };
    });
  }, []);

  const clearLogs = useCallback((cameraId) => {
    setLogsByCamera(prev => ({ ...prev, [cameraId]: [] }));
  }, []);

  const clearAllLogs = useCallback(() => {
    setLogsByCamera({});
  }, []);

  // ── Simulación de logs (solo dev) ──
  const startSimulatedLogs = useCallback((cameraId, processorType) => {
    if (!isDev() || !DEV_CONFIG.ENABLE_SIMULATED_LOGS) return;

    stopSimulatedLogs(cameraId);

    const messages = SIMULATED_LOG_MESSAGES[processorType] || [];
    if (messages.length === 0) return;

    let idx = 0;
    const tick = () => {
      const msg = messages[idx % messages.length];
      addLog(cameraId, msg.type, msg.message);
      idx++;
      const delay = DEV_CONFIG.SIMULATED_LOG_INTERVAL_BASE +
        Math.random() * DEV_CONFIG.SIMULATED_LOG_INTERVAL_JITTER;
      simIntervals.current[cameraId] = setTimeout(tick, delay);
    };
    tick();
  }, [addLog]);

  const stopSimulatedLogs = useCallback((cameraId) => {
    if (simIntervals.current[cameraId]) {
      clearTimeout(simIntervals.current[cameraId]);
      delete simIntervals.current[cameraId];
    }
  }, []);

  const stopAllSimulatedLogs = useCallback(() => {
    Object.keys(simIntervals.current).forEach(id => {
      clearTimeout(simIntervals.current[id]);
    });
    simIntervals.current = {};
  }, []);

  return {
    logsByCamera,
    addLog,
    clearLogs,
    clearAllLogs,
    startSimulatedLogs,
    stopSimulatedLogs,
    stopAllSimulatedLogs,
  };
}
