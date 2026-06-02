/**
 * useLogs.js
 *
 * Hook para gestionar logs por cámara.
 * Se conecta al backend vía SSE (Server-Sent Events) en GET /{camera_id}/logs.
 * En modo dev sin backend, solo muestra logs de acciones del frontend.
 *
 * Los logs se persisten en localStorage (cap MAX_LOG_LINES por cámara) y NO se
 * borran al detener la cámara, para alimentar la página histórica de Logs.
 * Cada entrada incluye `ts` (epoch) para ordenar globalmente entre cámaras.
 *
 * Si el evento SSE trae imagen de detección (data.image | data.snapshot | data.frame),
 * se reenvía a `onSnapshot` para poblar la galería de Snapshots.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ENV } from '../config';
import { ENDPOINTS } from '../config';

const LOGS_STORAGE_KEY = 'monitor-aib:logs';

const timestamp = () =>
  new Date().toLocaleTimeString('es-AR', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

function loadLogs() {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function useLogs({ onSnapshot } = {}) {
  const [logsByCamera, setLogsByCamera] = useState(loadLogs);
  const eventSources = useRef({});

  // Callback de snapshot estable vía ref (evita re-crear startLogStream).
  const onSnapshotRef = useRef(onSnapshot);
  onSnapshotRef.current = onSnapshot;

  // Persistencia con debounce: guarda 800ms después del último cambio.
  const logsRef = useRef(logsByCamera);
  logsRef.current = logsByCamera;
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logsRef.current));
      } catch {
        /* localStorage lleno o no disponible — ignorar */
      }
    }, 800);
    return () => clearTimeout(t);
  }, [logsByCamera]);

  const addLog = useCallback((cameraId, type, message) => {
    setLogsByCamera(prev => {
      const existing = prev[cameraId] || [];
      const updated = [...existing, { time: timestamp(), ts: Date.now(), type, message }];
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
    stopLogStream(cameraId); // cerrar conexión previa si existe

    const url = `${ENV.API_BASE_URL}${ENDPOINTS.STREAM_LOGS(cameraId)}`;
    const es = new EventSource(url);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        addLog(cameraId, data.type || 'info', data.message || event.data);

        // Si el evento trae una captura de detección, alimentar Snapshots.
        const img = data.image || data.snapshot || data.frame;
        if (img && onSnapshotRef.current) {
          onSnapshotRef.current({
            camera_id: cameraId,
            timestamp: data.timestamp || new Date().toISOString(),
            alert: data.alert || data.method || data.type || 'detección',
            imageUrl: img,
          });
        }
      } catch {
        // No es JSON: texto plano.
        addLog(cameraId, 'info', event.data);
      }
    };

    es.onerror = () => {
      // EventSource reconecta automáticamente; si queda CLOSED, avisamos.
      if (es.readyState === EventSource.CLOSED) {
        addLog(cameraId, 'warn', 'Conexión de logs cerrada por el servidor');
        delete eventSources.current[cameraId];
      }
    };

    eventSources.current[cameraId] = es;
  }, [addLog]);

  /** Cerrar la conexión SSE de una cámara. */
  const stopLogStream = useCallback((cameraId) => {
    const es = eventSources.current[cameraId];
    if (es) {
      es.close();
      delete eventSources.current[cameraId];
    }
  }, []);

  /** Cerrar todas las conexiones SSE. */
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
