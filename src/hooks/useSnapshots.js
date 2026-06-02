/**
 * useSnapshots.js
 *
 * Store de snapshots (capturas de alerta) persistido en localStorage.
 * Cada snapshot: { id, camera_id, timestamp (ISO), alert, imageUrl }.
 *
 * Fuentes de snapshots:
 *  - Backend vía SSE: eventos de detección con imagen (ver useLogs).
 *  - Demo/local: captura de frame del feed al "Simular alerta" (ver CameraCard).
 *
 * Nota: si imageUrl es un dataURL (captura local), puede ser pesado; se cap-ea
 * la cantidad y se recorta ante QuotaExceeded.
 */

import { useState, useCallback } from 'react';

const STORAGE_KEY = 'monitor-aib:snapshots';
const MAX_SNAPSHOTS = 80;

let _seq = 0;
const genId = () => `snap-${Date.now().toString(36)}-${(_seq++).toString(36)}`;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Persiste recortando los más viejos si se excede la cuota de localStorage. */
function persist(list) {
  let arr = list;
  while (arr.length) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      return arr;
    } catch {
      arr = arr.slice(1); // drop oldest y reintentar
    }
  }
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
  return arr;
}

export function useSnapshots() {
  const [snapshots, setSnapshots] = useState(load);

  const addSnapshot = useCallback((snap) => {
    setSnapshots(prev => {
      const entry = {
        id: snap.id || genId(),
        camera_id: snap.camera_id || 'desconocida',
        timestamp: snap.timestamp || new Date().toISOString(),
        alert: snap.alert || 'detección',
        imageUrl: snap.imageUrl || null,
      };
      return persist([...prev, entry].slice(-MAX_SNAPSHOTS));
    });
  }, []);

  const clearSnapshots = useCallback((cameraId) => {
    setSnapshots(prev => persist(cameraId ? prev.filter(s => s.camera_id !== cameraId) : []));
  }, []);

  const removeSnapshot = useCallback((id) => {
    setSnapshots(prev => persist(prev.filter(s => s.id !== id)));
  }, []);

  return { snapshots, addSnapshot, clearSnapshots, removeSnapshot };
}
