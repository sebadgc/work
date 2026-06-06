// Carga y guarda la configuración de la app (qBittorrent + indexador de búsqueda).
// Los valores se persisten en data/config.json y se pueden editar desde la web (Ajustes).
// Los defaults se pueden sembrar con variables de entorno.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const CONFIG_FILE = join(DATA_DIR, 'config.json');

const DEFAULTS = {
  // qBittorrent Web UI (Opciones → Web UI). adminadmin es la clave por defecto de qB.
  qbUrl: process.env.QB_URL || 'http://localhost:8080',
  qbUser: process.env.QB_USER || 'admin',
  qbPass: process.env.QB_PASS || 'adminadmin',
  // Indexador Torznab (Jackett "all" o Prowlarr). Ejemplo Jackett:
  //   http://localhost:9117/api/v2.0/indexers/all/results/torznab/api
  indexerUrl: process.env.INDEXER_URL || '',
  indexerApiKey: process.env.INDEXER_APIKEY || '',
  // Carpeta de descarga por defecto (vacío = la default de qBittorrent).
  savePath: process.env.SAVE_PATH || '',
  // Destinos rápidos para elegir al enviar un torrent: [{ label, path }].
  destinations: [],
};

let cache = null;

export async function loadConfig() {
  if (cache) return cache;
  try {
    const raw = await readFile(CONFIG_FILE, 'utf8');
    cache = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

export async function saveConfig(patch) {
  const current = await loadConfig();
  // Ignorar strings vacíos para campos sensibles: permite "dejar en blanco para no cambiar".
  const clean = { ...patch };
  for (const k of ['qbPass', 'indexerApiKey']) {
    if (clean[k] === '' || clean[k] === undefined) delete clean[k];
  }
  // Normalizar destinos: descartar filas sin ruta.
  if (Array.isArray(clean.destinations)) {
    clean.destinations = clean.destinations
      .map((d) => ({ label: String(d.label || '').trim(), path: String(d.path || '').trim() }))
      .filter((d) => d.path)
      .map((d) => ({ label: d.label || d.path, path: d.path }));
  }
  cache = { ...current, ...clean };
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CONFIG_FILE, JSON.stringify(cache, null, 2), 'utf8');
  return cache;
}

// Versión segura para enviar al cliente: oculta secretos pero indica si están seteados.
export function publicConfig(cfg) {
  return {
    qbUrl: cfg.qbUrl,
    qbUser: cfg.qbUser,
    qbPassSet: Boolean(cfg.qbPass),
    indexerUrl: cfg.indexerUrl,
    indexerApiKeySet: Boolean(cfg.indexerApiKey),
    savePath: cfg.savePath,
    destinations: Array.isArray(cfg.destinations) ? cfg.destinations : [],
  };
}
