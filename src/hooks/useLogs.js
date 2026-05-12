/**
 * useLogs.js
 * 
 * Hook para gestionar logs por cámara.
 * Se conecta al backend vía SSE (Server-Sent Events) en GET /{camera_id}/logs.
 * En modo dev sin backend, solo muestra logs de acciones del frontend.
 */

import { useState, useCallback, useRef } from 'react';
import { ENV } from '../config';
import { ENDPOINTS } from '../config';

const timestamp = () =>
  new Date().toLocaleTimeString('es-AR', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

export function useLogs() {
  const [logsByCamera, setLogsByCamera] = useState({});
  const eventSources = useRef({});

  const addLog = useCallback((cameraId, type, message) => {
    setLogsByCamera(prev => {
      const existing = prev[cameraId] || [];
      const updated = [...existing, { time: timestamp(), type, message }];
      return { ...prev, [cameraId]: updated.slice(-ENV.MAX_LOG_LINES) };
    });
  }, []);

  const clearLogs = useCallback((cameraId) => {
    setLogsByCamera(prev => ({ ...prev, [cameraId]: [] }));
  }, []);

  const clearAllLogs = useCallback(() => {
    setLogsByCamera({});
  }, []);

  /**
   * Conectar al stream SSE de logs del backend para una cámara.
   * El backend debe exponer GET /{camera_id}/logs como text/event-stream.
   */
  const startLogStream = useCallback((cameraId) => {
    // Cerrar conexión previa si existe
    stopLogStream(cameraId);

    const url = `${ENV.API_BASE_URL}${ENDPOINTS.STREAM_LOGS(cameraId)}`;
    const es = new EventSource(url);

    es.onmessage = (event) => {
      // Intentar parsear como JSON por si el backend manda { type, message }
      try {
        const data = JSON.parse(event.data);
        addLog(cameraId, data.type || 'info', data.message || event.data);
      } catch {
        // Si no es JSON, tratar como texto plano
        addLog(cameraId, 'info', event.data);
      }
    };

    es.onerror = () => {
      // EventSource reconecta automáticamente.
      // Si se cierra definitivamente, queda en CLOSED.
      if (es.readyState === EventSource.CLOSED) {
        addLog(cameraId, 'warn', 'Conexión de logs cerrada por el servidor');
        delete eventSources.current[cameraId];
      }
    };

    eventSources.current[cameraId] = es;
  }, [addLog]);

  /**
   * Cerrar la conexión SSE de una cámara.
   */
  const stopLogStream = useCallback((cameraId) => {
    const es = eventSources.current[cameraId];
    if (es) {
      es.close();
      delete eventSources.current[cameraId];
    }
  }, []);

  /**
   * Cerrar todas las conexiones SSE.
   */
  const stopAllLogStreams = useCallback(() => {
    Object.values(eventSources.current).forEach(es => es.close());
    eventSources.current = {};
  }, []);

  return {
    logsByCamera,
    addLog,
    clearLogs,
    clearAllLogs,
    startLogStream,
    stopLogStream,
    stopAllLogStreams,
  };
}
