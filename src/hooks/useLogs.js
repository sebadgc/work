/**
 * useLogs.js
 *
 * Logs por cámara. Se conecta al backend vía SSE (GET /{camera_id}/logs) y
 * mantiene los logs en memoria para la vista viva.
 *
 * Persistencia: cada entrada lleva `ts` (epoch) + `time` (HH:MM:SS). Los logs se
 * apendean por lotes (cada ~3s) a archivos JSONL por cámara/día vía logsService
 * (/api/logs). El historial multi-día se trae con loadHistory/loadAllHistory.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ENDPOINTS, ENV } from '../config';
import { logsService } from '../api';

const HISTORY_DAYS = 30;
const DISPLAY_CAP = 5000; // máx entradas en memoria por cámara

const timestamp = () =>
  new Date().toLocaleTimeString('es-AR', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

const keyOf = (e) => `${e.ts}|${e.type}|${e.message}`;

function mergeDedup(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    for (const e of list || []) {
      const k = keyOf(e);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(e);
    }
  }
  out.sort((a, b) => (a.ts || 0) - (b.ts || 0));
  return out;
}

export function useLogs() {
  const [logsByCamera, setLogsByCamera] = useState({});
  const eventSources = useRef({});
  const pendingRef = useRef({});       // camera -> entries sin flushear
  const loadedRef = useRef(new Set()); // cámaras cuyo historial ya cargamos
  const allLoadedRef = useRef(false);

  // ── Flush por lotes a archivos ──
  const flushPending = useCallback(async () => {
    const pend = pendingRef.current;
    const cams = Object.keys(pend).filter(c => pend[c]?.length);
    for (const cam of cams) {
      const batch = pend[cam];
      pend[cam] = [];
      const ok = await logsService.appendLogs(cam, batch);
      if (!ok) pend[cam] = [...batch, ...(pend[cam] || [])]; // reintentar luego
    }
  }, []);

  useEffect(() => {
    const t = setInterval(flushPending, 3000);
    return () => { clearInterval(t); flushPending(); };
  }, [flushPending]);

  const addLog = useCallback((cameraId, type, message) => {
    const entry = { ts: Date.now(), time: timestamp(), type, message };
    setLogsByCamera(prev => {
      const existing = prev[cameraId] || [];
      return { ...prev, [cameraId]: [...existing, entry].slice(-DISPLAY_CAP) };
    });
    (pendingRef.current[cameraId] ||= []).push(entry);
  }, []);

  // ── Carga de historial desde archivos ──
  const loadHistory = useCallback(async (cameraId) => {
    if (!cameraId || loadedRef.current.has(cameraId)) return;
    loadedRef.current.add(cameraId);
    const hist = await logsService.getLogs({ camera: cameraId, days: HISTORY_DAYS });
    if (!hist.length) return;
    setLogsByCamera(prev => ({
      ...prev,
      [cameraId]: mergeDedup(hist, prev[cameraId]).slice(-DISPLAY_CAP),
    }));
  }, []);

  const loadAllHistory = useCallback(async () => {
    if (allLoadedRef.current) return;
    allLoadedRef.current = true;
    const hist = await logsService.getLogs({ days: HISTORY_DAYS });
    if (!hist.length) return;
    const byCam = {};
    for (const e of hist) (byCam[e.camera_id] ||= []).push(e);
    setLogsByCamera(prev => {
      const next = { ...prev };
      for (const [cam, list] of Object.entries(byCam)) {
        next[cam] = mergeDedup(list, prev[cam]).slice(-DISPLAY_CAP);
        loadedRef.current.add(cam);
      }
      return next;
    });
  }, []);

  const clearLogs = useCallback((cameraId) => {
    setLogsByCamera(prev => ({ ...prev, [cameraId]: [] }));
  }, []);

  const clearAllLogs = useCallback(() => {
    setLogsByCamera({});
  }, []);

  /** Conectar al stream SSE de logs del backend para una cámara. */
  const startLogStream = useCallback((cameraId) => {
    stopLogStream(cameraId);

    const url = `${ENV.API_BASE_URL}${ENDPOINTS.STREAM_LOGS(cameraId)}`;
    const es = new EventSource(url);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        addLog(cameraId, data.type || 'info', data.message || event.data);
      } catch {
        addLog(cameraId, 'info', event.data);
      }
    };

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        addLog(cameraId, 'warn', 'Conexión de logs cerrada por el servidor');
        delete eventSources.current[cameraId];
      }
    };

    eventSources.current[cameraId] = es;
  }, [addLog]);

  const stopLogStream = useCallback((cameraId) => {
    const es = eventSources.current[cameraId];
    if (es) {
      es.close();
      delete eventSources.current[cameraId];
    }
  }, []);

  const stopAllLogStreams = useCallback(() => {
    Object.values(eventSources.current).forEach(es => es.close());
    eventSources.current = {};
  }, []);

  return {
    logsByCamera,
    addLog,
    clearLogs,
    clearAllLogs,
    loadHistory,
    loadAllHistory,
    startLogStream,
    stopLogStream,
    stopAllLogStreams,
  };
}
