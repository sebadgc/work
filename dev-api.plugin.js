/**
 * dev-api.plugin.js
 *
 * Plugin de Vite (dev + preview) que expone endpoints de filesystem para:
 *  - Logs:      /api/logs           (GET historial por cámara/día, POST append)
 *  - Snapshots: /api/snapshots*     (GET fechas/lista/archivo, POST captura manual)
 *
 * Logs:      data/logs/<camera>/<YYYY-MM-DD>.jsonl   (una línea JSON por entrada)
 * Manual:    data/manual-snapshots/<camera>/<YYYY-MM-DD>/manual_*.jpg
 * Backend:   <root>/snapshots/<camera>/<YYYY-MM-DD>/*.jpg   (root viene por query)
 *
 * Solo dev/local. En producción estos endpoints los proveería el backend.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, 'data');
const LOGS_DIR = path.join(DATA_DIR, 'logs');
const MANUAL_DIR = path.join(DATA_DIR, 'manual-snapshots');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SAFE_SEG = /^[\w.\- ]+$/;          // sin separadores ni ".."
const JPG_RE = /\.jpe?g$/i;

// ── helpers ──
const pad = (n) => String(n).padStart(2, '0');
const localDate = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const sendJson = (res, data, status = 200) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
};
const readBody = (req) => new Promise((resolve) => {
  let b = '';
  req.on('data', (c) => { b += c; });
  req.on('end', () => resolve(b));
});
const safe = (seg) => typeof seg === 'string' && SAFE_SEG.test(seg) && !seg.includes('..');
const listDirs = (dir) => {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory()).map((e) => e.name);
  } catch { return []; }
};
const listFiles = (dir) => {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile()).map((e) => e.name);
  } catch { return []; }
};

// risk_14-18-33-919.jpg → { alert:'risk', time:'14:18:33' }
function parseSnapName(name) {
  const base = name.replace(JPG_RE, '');
  const i = base.indexOf('_');
  const alert = i > 0 ? base.slice(0, i) : 'snapshot';
  const rest = i > 0 ? base.slice(i + 1) : base;
  const m = rest.match(/(\d{2})-(\d{2})-(\d{2})/);
  const time = m ? `${m[1]}:${m[2]}:${m[3]}` : '';
  return { alert, time };
}

// ── Logs ──
function appendLogs(camera, entries) {
  if (!safe(camera) || !Array.isArray(entries)) return;
  const byDate = {};
  for (const e of entries) {
    if (!e || !e.ts) continue;
    const date = localDate(e.ts);
    (byDate[date] ||= []).push(e);
  }
  for (const [date, list] of Object.entries(byDate)) {
    const dir = path.join(LOGS_DIR, camera);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${date}.jsonl`);
    fs.appendFileSync(file, list.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf-8');
  }
}

function readLogs(camera, days) {
  const cutoff = Date.now() - days * 86400000;
  const cameras = camera ? [camera] : listDirs(LOGS_DIR);
  const out = [];
  for (const cam of cameras) {
    if (!safe(cam)) continue;
    const dir = path.join(LOGS_DIR, cam);
    for (const f of listFiles(dir)) {
      const date = f.replace(/\.jsonl$/, '');
      if (!DATE_RE.test(date)) continue;
      if (new Date(date).getTime() < cutoff - 86400000) continue;
      let raw = '';
      try { raw = fs.readFileSync(path.join(dir, f), 'utf-8'); } catch { continue; }
      for (const line of raw.split('\n')) {
        if (!line.trim()) continue;
        try {
          const e = JSON.parse(line);
          if ((e.ts || 0) >= cutoff) out.push({ ...e, camera_id: cam });
        } catch { /* línea corrupta — ignorar */ }
      }
    }
  }
  out.sort((a, b) => (a.ts || 0) - (b.ts || 0));
  return out;
}

// ── Snapshots ──
function snapDates(camera, root) {
  if (!safe(camera)) return [];
  const set = new Set();
  if (root) listDirs(path.join(root, 'snapshots', camera)).forEach((d) => DATE_RE.test(d) && set.add(d));
  listDirs(path.join(MANUAL_DIR, camera)).forEach((d) => DATE_RE.test(d) && set.add(d));
  return Array.from(set).sort().reverse();
}

function snapList(camera, date, root) {
  if (!safe(camera) || !DATE_RE.test(date)) return [];
  const mk = (source, dir) => listFiles(dir)
    .filter((n) => JPG_RE.test(n))
    .map((name) => {
      const { alert, time } = parseSnapName(name);
      const q = new URLSearchParams({ source, camera, date, name });
      if (source === 'backend' && root) q.set('root', root);
      return { name, source, alert, time, date, url: `/api/snapshots/file?${q.toString()}` };
    });
  const backend = root ? mk('backend', path.join(root, 'snapshots', camera, date)) : [];
  const manual = mk('manual', path.join(MANUAL_DIR, camera, date));
  return [...backend, ...manual].sort((a, b) => b.time.localeCompare(a.time));
}

function snapFilePath({ source, camera, date, name, root }) {
  if (!safe(camera) || !DATE_RE.test(date) || !safe(name) || !JPG_RE.test(name)) return null;
  if (source === 'manual') return path.join(MANUAL_DIR, camera, date, name);
  if (source === 'backend' && root) return path.join(root, 'snapshots', camera, date, name);
  return null;
}

function saveManual(camera, dataUrl) {
  if (!safe(camera) || typeof dataUrl !== 'string') return null;
  const m = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
  if (!m) return null;
  const now = new Date();
  const date = localDate(now.getTime());
  const ms = pad(now.getMilliseconds()).padEnd(3, '0').slice(0, 3);
  const name = `manual_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}-${ms}.jpg`;
  const dir = path.join(MANUAL_DIR, camera, date);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), Buffer.from(m[1], 'base64'));
  return { name, date, source: 'manual' };
}

// ── plugin ──
export function devApiPlugin() {
  const attach = (server) => {
    // Logs
    server.middlewares.use('/api/logs', async (req, res) => {
      const u = new URL(req.url, 'http://localhost');
      if (req.method === 'GET') {
        const camera = u.searchParams.get('camera') || null;
        const days = Math.max(1, Number(u.searchParams.get('days')) || 30);
        return sendJson(res, readLogs(camera, days));
      }
      if (req.method === 'POST') {
        try {
          const { camera, entries } = JSON.parse(await readBody(req));
          appendLogs(camera, entries);
          return sendJson(res, { ok: true });
        } catch (e) {
          return sendJson(res, { ok: false, error: String(e) }, 400);
        }
      }
      res.statusCode = 405; res.end();
    });

    // Snapshots
    server.middlewares.use('/api/snapshots', async (req, res) => {
      const u = new URL(req.url, 'http://localhost');
      const sp = u.searchParams;

      if (req.method === 'GET' && u.pathname === '/dates') {
        return sendJson(res, snapDates(sp.get('camera'), sp.get('root') || ''));
      }
      if (req.method === 'GET' && u.pathname === '/file') {
        const fp = snapFilePath({
          source: sp.get('source'), camera: sp.get('camera'),
          date: sp.get('date'), name: sp.get('name'), root: sp.get('root') || '',
        });
        if (!fp || !fs.existsSync(fp)) { res.statusCode = 404; return res.end(); }
        res.setHeader('Content-Type', 'image/jpeg');
        return fs.createReadStream(fp).pipe(res);
      }
      if (req.method === 'GET' && (u.pathname === '/' || u.pathname === '')) {
        return sendJson(res, snapList(sp.get('camera'), sp.get('date'), sp.get('root') || ''));
      }
      if (req.method === 'POST' && u.pathname === '/manual') {
        try {
          const { camera, dataUrl } = JSON.parse(await readBody(req));
          const saved = saveManual(camera, dataUrl);
          return saved ? sendJson(res, { ok: true, ...saved }) : sendJson(res, { ok: false }, 400);
        } catch (e) {
          return sendJson(res, { ok: false, error: String(e) }, 400);
        }
      }
      res.statusCode = 405; res.end();
    });
  };

  return {
    name: 'dev-api',
    configureServer: attach,
    configurePreviewServer: attach,
  };
}
