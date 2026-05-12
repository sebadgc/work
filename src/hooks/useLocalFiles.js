/**
 * useLocalFiles.js
 * 
 * Hook para gestionar archivos MP4 locales en modo desarrollo.
 * Permite cargar videos y expone tanto la URL para preview
 * como el nombre real del archivo para enviar al backend.
 */

import { useState, useCallback, useRef } from 'react';

export function useLocalFiles() {
  const [files, setFiles] = useState({}); // { [cameraId]: File }
  const [objectUrls, setObjectUrls] = useState({}); // { [cameraId]: string }
  const fileInputRef = useRef(null);
  const pendingCallback = useRef(null);

  const setFile = useCallback((cameraId, file) => {
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

  const getFileName = useCallback((cameraId) => {
    return files[cameraId]?.name || null;
  }, [files]);

  const hasFile = useCallback((cameraId) => {
    return !!files[cameraId];
  }, [files]);

  /**
   * Solicita al usuario que seleccione un archivo MP4.
   * Devuelve el File object (con .name para obtener la ruta real).
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
    getFileName,
    hasFile,
    requestFile,
  };
}
