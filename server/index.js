// Servidor de Torrent Remote: sirve la PWA (web/) y expone una API que hace de
// puente entre el celular y qBittorrent + el indexador de búsqueda.
// Sin dependencias externas: usa solo módulos nativos de Node.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';

import { loadConfig, saveConfig, publicConfig } from './config.js';
import * as qb from './qbittorrent.js';
import { searchTorrents } from './search.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_DIR = join(__dirname, '..', 'web');
const PORT = Number(process.env.PORT || 8088);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1e6) reject(new Error('Body demasiado grande'));
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

async function serveStatic(req, res, pathname) {
  let rel = pathname === '/' ? '/index.html' : pathname;
  // Evitar path traversal.
  const filePath = normalize(join(WEB_DIR, rel));
  if (!filePath.startsWith(WEB_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  try {
    const buf = await readFile(filePath);
    const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(buf);
  } catch {
    // Fallback a index.html para que la PWA maneje rutas (SPA).
    try {
      const buf = await readFile(join(WEB_DIR, 'index.html'));
      res.writeHead(200, { 'Content-Type': MIME['.html'] });
      res.end(buf);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  }
}

async function handleApi(req, res, pathname, url) {
  const cfg = await loadConfig();

  // --- Config / estado ---
  if (pathname === '/api/config' && req.method === 'GET') {
    return sendJson(res, 200, publicConfig(cfg));
  }
  if (pathname === '/api/config' && req.method === 'POST') {
    const patch = await readBody(req);
    const next = await saveConfig(patch);
    let qbStatus = { ok: false };
    try {
      qbStatus = await qb.testConnection(next);
    } catch (e) {
      qbStatus = { ok: false, error: e.message };
    }
    return sendJson(res, 200, { config: publicConfig(next), qb: qbStatus });
  }
  if (pathname === '/api/status' && req.method === 'GET') {
    let qbStatus;
    try {
      qbStatus = await qb.testConnection(cfg);
    } catch (e) {
      qbStatus = { ok: false, error: e.message };
    }
    return sendJson(res, 200, {
      qb: qbStatus,
      indexerConfigured: Boolean(cfg.indexerUrl),
    });
  }

  // --- Búsqueda ---
  if (pathname === '/api/search' && req.method === 'GET') {
    const q = (url.searchParams.get('q') || '').trim();
    if (!q) return sendJson(res, 400, { error: 'Falta el término de búsqueda.' });
    const results = await searchTorrents(cfg, q);
    return sendJson(res, 200, { results });
  }

  // --- Torrents ---
  if (pathname === '/api/torrents' && req.method === 'GET') {
    const torrents = await qb.listTorrents(cfg);
    return sendJson(res, 200, { torrents });
  }
  if (pathname === '/api/torrents/add' && req.method === 'POST') {
    const { link } = await readBody(req);
    const l = (link || '').trim();
    if (!/^(magnet:|https?:)/i.test(l)) {
      return sendJson(res, 400, { error: 'Enlace inválido. Debe ser un magnet: o una URL http(s) a un .torrent.' });
    }
    await qb.addTorrent(cfg, l);
    return sendJson(res, 200, { ok: true });
  }
  if (pathname === '/api/torrents/pause' && req.method === 'POST') {
    const { hash } = await readBody(req);
    await qb.pauseTorrent(cfg, hash);
    return sendJson(res, 200, { ok: true });
  }
  if (pathname === '/api/torrents/resume' && req.method === 'POST') {
    const { hash } = await readBody(req);
    await qb.resumeTorrent(cfg, hash);
    return sendJson(res, 200, { ok: true });
  }
  if (pathname === '/api/torrents/delete' && req.method === 'POST') {
    const { hash, deleteFiles } = await readBody(req);
    await qb.deleteTorrent(cfg, hash, Boolean(deleteFiles));
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 404, { error: 'Endpoint no encontrado.' });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;
  try {
    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, pathname, url);
    } else {
      await serveStatic(req, res, pathname);
    }
  } catch (e) {
    const status = e.statusCode || 500;
    sendJson(res, status, { error: e.message || 'Error interno del servidor.' });
  }
});

function localIps() {
  const out = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const ni of list || []) {
      if (ni.family === 'IPv4' && !ni.internal) out.push(ni.address);
    }
  }
  return out;
}

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n  🧲  Torrent Remote corriendo\n');
  console.log(`  En esta PC:     http://localhost:${PORT}`);
  for (const ip of localIps()) {
    console.log(`  Desde el celu:  http://${ip}:${PORT}   (misma WiFi)`);
  }
  console.log('\n  Abrí esa dirección en el navegador del celular y, la primera vez,');
  console.log('  cargá los datos de qBittorrent en Ajustes (⚙).\n');
});
