/**
 * useSettings.js
 *
 * Estado de configuración del usuario, persistido en localStorage.
 * Defaults apuntan a localhost (ver settings.config.js) para testeo local.
 */

import { useState, useCallback, useEffect } from 'react';
import { SETTINGS_DEFAULTS, SETTINGS_STORAGE_KEY } from '../config/settings.config';

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? { ...SETTINGS_DEFAULTS, ...JSON.parse(raw) } : { ...SETTINGS_DEFAULTS };
  } catch {
    return { ...SETTINGS_DEFAULTS };
  }
}

export function useSettings() {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* localStorage lleno o no disponible — ignorar */
    }
  }, [settings]);

  const updateSettings = useCallback((partial) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({ ...SETTINGS_DEFAULTS });
  }, []);

  return { settings, updateSettings, resetSettings };
}
