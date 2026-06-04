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
import { ENDPOINTS, ENV, MESSAGES } from '../config';
import { logsService } from '../api';

const HISTORY_DAYS = 30;
const DISPLAY_CAP = 5000; // máx entradas en memoria por cámara

const timestamp = () =>
  new Date().toLocaleTimeString('es-AR', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

const keyOf = (e) => `${e.ts}|${e.type}|${e.message}`;

// Severidad para el contador de "sin ver": error/critical → error, warn → warn, resto → info.
const severity = (type) =>
  (type === 'error' || type === 'critical') ? 'error'
    : type === 'warn' ? 'warn'
      : 'info';

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
  const [unreadByCamera, setUnreadByCamera] = useState({}); // cam -> { info, warn, error }
  const [alarms, setAlarms] = useState({}); // cam -> 'warn' | 'error' (alarma sin revisar, módulo Monitoreo)
  const eventSources = useRef({});
  const pendingRef = useRef({});       // camera -> entries sin flushear
  const loadedRef = useRef(new Set()); // cámaras cuyo historial ya cargamos
  const allLoadedRef = useRef(false);
  const activeCameraRef = useRef(null); // cámara que se está mirando (no acumula sin-ver)

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

  const addLog = useCallback((cameraId, type, message, opts = {}) => {
    const entry = { ts: Date.now(), time: timestamp(), type, message };
    setLogsByCamera(prev => {
      const existing = prev[cameraId] || [];
      return { ...prev, [cameraId]: [...existing, entry].slice(-DISPLAY_CAP) };
    });
    (pendingRef.current[cameraId] ||= []).push(entry);

    const s = severity(type);

    // Si no estamos mirando esa cámara, cuenta como "sin ver" (por severidad).
    if (activeCameraRef.current !== cameraId) {
      setUnreadByCamera(prev => {
        const cur = prev[cameraId] || { info: 0, warn: 0, error: 0 };
        return { ...prev, [cameraId]: { ...cur, [s]: cur[s] + 1 } };
      });
    }

    // Alarma (módulo Monitoreo): warn/error que viene del backend (SSE).
    // error pisa a warn; se apaga con acknowledgeAlarm.
    if (opts.source === 'backend' && (s === 'warn' || s === 'error')) {
      setAlarms(prev => {
        const cur = prev[cameraId];
        if (cur === 'error') return prev;
        if (s === 'error' || cur !== 'warn') return { ...prev, [cameraId]: s };
        return prev;
      });
    }
  }, []);

  const acknowledgeAlarm = useCallback((cameraId) => {
    setAlarms(prev => {
      if (!prev[cameraId]) return prev;
      const next = { ...prev };
      delete next[cameraId];
      return next;
    });
  }, []);

  // Marca la cámara que se está mirando (resetea su contador de sin-ver).
  const setActiveCamera = useCallback((cameraId) => {
    activeCameraRef.current = cameraId;
    if (cameraId) {
      setUnreadByCamera(prev => (
        prev[cameraId] ? { ...prev, [cameraId]: { info: 0, warn: 0, error: 0 } } : prev
      ));
    }
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
        addLog(cameraId, data.type || 'info', data.message || event.data, { source: 'backend' });
      } catch {
        addLog(cameraId, 'info', event.data, { source: 'backend' });
      }
    };

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        addLog(cameraId, 'warn', MESSAGES.log.streamClosed);
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
    unreadByCamera,
    alarms,
    acknowledgeAlarm,
    setActiveCamera,
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
