/**
 * useLocalFiles.js
 * 
 * Hook para gestionar archivos MP4 locales en modo desarrollo.
 * Permite cargar videos que simulan feeds RTSP.
 */

import { useState, useCallback, useRef } from 'react';

export function useLocalFiles() {
  const [files, setFiles] = useState({}); // { [cameraId]: File }
  const [objectUrls, setObjectUrls] = useState({}); // { [cameraId]: string }
  const fileInputRef = useRef(null);
  const pendingCallback = useRef(null);

  const setFile = useCallback((cameraId, file) => {
    // Revocar URL anterior si existe
    setObjectUrls(prev => {
      if (prev[cameraId]) URL.revokeObjectURL(prev[cameraId]);
      return { ...prev, [cameraId]: URL.createObjectURL(file) };
    });
    setFiles(prev => ({ ...prev, [cameraId]: file }));
  }, []);

  const removeFile = useCallback((cameraId) => {
    setObjectUrls(prev => {
      if (prev[cameraId]) URL.revokeObjectURL(prev[cameraId]);
      const next = { ...prev };
      delete next[cameraId];
      return next;
    });
    setFiles(prev => {
      const next = { ...prev };
      delete next[cameraId];
      return next;
    });
  }, []);

  const getObjectUrl = useCallback((cameraId) => {
    return objectUrls[cameraId] || null;
  }, [objectUrls]);

  const hasFile = useCallback((cameraId) => {
    return !!files[cameraId];
  }, [files]);

  /**
   * Solicita al usuario que seleccione un archivo MP4.
   * Devuelve una promise que resuelve cuando el usuario selecciona o cancela.
   */
  const requestFile = useCallback((cameraId) => {
    return new Promise((resolve) => {
      pendingCallback.current = (file) => {
        if (file) {
          setFile(cameraId, file);
          resolve(file);
        } else {
          resolve(null);
        }
      };
      fileInputRef.current?.click();
    });
  }, [setFile]);

  const handleFileInput = useCallback((e) => {
    const file = e.target.files?.[0] || null;
    if (pendingCallback.current) {
      pendingCallback.current(file);
      pendingCallback.current = null;
    }
    e.target.value = '';
  }, []);

  return {
    files,
    fileInputRef,
    handleFileInput,
    setFile,
    removeFile,
    getObjectUrl,
    hasFile,
    requestFile,
  };
}
