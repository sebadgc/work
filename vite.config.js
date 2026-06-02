import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CAMERAS } from './src/config/cameras.config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = path.resolve(__dirname, 'cameras.local.json');

function readOverrides() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

/** Merge defaults (código) + overrides (cameras.local.json). Override gana por id. */
function mergeCameras() {
  const overrides = readOverrides();
  if (!Array.isArray(overrides)) return DEFAULT_CAMERAS;
  const byId = new Map(DEFAULT_CAMERAS.map(c => [c.id, c]));
  overrides.forEach(c => { if (c && c.id) byId.set(c.id, c); });
  return Array.from(byId.values());
}

/**
 * Plugin dev/preview: expone GET/PUT /api/cameras para leer/escribir los presets.
 * GET → defaults mergeados con cameras.local.json.
 * PUT → escribe cameras.local.json con la lista enviada.
 */
function camerasApiPlugin() {
  const attach = (server) => {
    server.middlewares.use('/api/cameras', (req, res) => {
      if (req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(mergeCameras()));
        return;
      }
      if (req.method === 'PUT') {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const list = JSON.parse(body);
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(list, null, 2), 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.end('{"ok":true}');
          } catch (e) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: String(e) }));
          }
        });
        return;
      }
      res.statusCode = 405;
      res.end();
    });
  };

  return {
    name: 'cameras-api',
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

export default defineConfig({
  plugins: [react(), camerasApiPlugin()],
  server: {
    port: 3000,
  },
});
