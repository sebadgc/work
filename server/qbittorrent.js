// Cliente mínimo para la Web API de qBittorrent (v2).
// Maneja login por cookie (SID), re-login automático al expirar, y un fallback
// para los nombres de endpoints que cambiaron en qBittorrent 5.x (pause→stop, resume→start).

let session = { sid: null, key: null };

function sessionKey(cfg) {
  return `${cfg.qbUrl}|${cfg.qbUser}`;
}

async function login(cfg) {
  const body = new URLSearchParams({ username: cfg.qbUser, password: cfg.qbPass });
  let res;
  try {
    res = await fetch(`${cfg.qbUrl}/api/v2/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: cfg.qbUrl,
      },
      body,
    });
  } catch (e) {
    throw new Error(`No se pudo conectar a qBittorrent en ${cfg.qbUrl}. ¿Está abierto y con la Web UI activada? (${e.code || e.message})`);
  }
  const text = (await res.text()).trim();
  if (res.status === 403) {
    throw new Error('qBittorrent rechazó el login (¿IP baneada por intentos fallidos?). Esperá unos minutos o reiniciá qBittorrent.');
  }
  if (text !== 'Ok.') {
    throw new Error('Usuario o contraseña de qBittorrent incorrectos. Revisalos en Ajustes.');
  }
  const setCookie = res.headers.get('set-cookie') || '';
  const match = setCookie.match(/SID=([^;]+)/);
  if (!match) throw new Error('qBittorrent no devolvió cookie de sesión (SID).');
  session = { sid: match[1], key: sessionKey(cfg) };
  return session.sid;
}

async function ensureLogin(cfg) {
  if (!session.sid || session.key !== sessionKey(cfg)) {
    await login(cfg);
  }
  return session.sid;
}

// Request autenticado con un reintento de re-login ante 403 (sesión vencida).
async function api(cfg, path, { method = 'GET', body } = {}) {
  await ensureLogin(cfg);
  const doFetch = () =>
    fetch(`${cfg.qbUrl}/api/v2${path}`, {
      method,
      headers: {
        Cookie: `SID=${session.sid}`,
        Referer: cfg.qbUrl,
        ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      },
      body,
    });

  let res = await doFetch();
  if (res.status === 403) {
    await login(cfg);
    res = await doFetch();
  }
  return res;
}

// Algunos endpoints cambiaron de nombre entre qB 4.x y 5.x. Probamos el primero
// y si da 404 caemos al alternativo.
async function apiWithFallback(cfg, primaryPath, fallbackPath, body) {
  let res = await api(cfg, primaryPath, { method: 'POST', body });
  if (res.status === 404) {
    res = await api(cfg, fallbackPath, { method: 'POST', body });
  }
  return res;
}

export async function testConnection(cfg) {
  await login(cfg);
  const res = await api(cfg, '/app/version');
  const version = (await res.text()).trim();
  return { ok: true, version };
}

export async function listTorrents(cfg) {
  const res = await api(cfg, '/torrents/info');
  if (!res.ok) throw new Error(`qBittorrent devolvió ${res.status} al listar torrents.`);
  const arr = await res.json();
  return arr.map((t) => ({
    hash: t.hash,
    name: t.name,
    progress: t.progress, // 0..1
    state: t.state,
    size: t.size,
    downloaded: t.completed,
    dlspeed: t.dlspeed,
    upspeed: t.upspeed,
    eta: t.eta, // segundos (8640000 = infinito)
    numSeeds: t.num_seeds,
    numLeechs: t.num_leechs,
    addedOn: t.added_on,
    category: t.category,
  }));
}

export async function addTorrent(cfg, link, savePath) {
  const params = new URLSearchParams();
  params.set('urls', link); // acepta magnet: o URL http(s) a un .torrent
  // Ruta elegida para este torrent; si no hay, cae a la default de la config.
  const dest = (savePath || '').trim() || cfg.savePath;
  if (dest) params.set('savepath', dest);
  const res = await api(cfg, '/torrents/add', { method: 'POST', body: params });
  const text = (await res.text()).trim();
  if (!res.ok || text === 'Fails.') {
    throw new Error('qBittorrent no aceptó el torrent (enlace inválido o duplicado).');
  }
  return { ok: true };
}

export async function pauseTorrent(cfg, hash) {
  const body = new URLSearchParams({ hashes: hash });
  await apiWithFallback(cfg, '/torrents/pause', '/torrents/stop', body);
  return { ok: true };
}

export async function resumeTorrent(cfg, hash) {
  const body = new URLSearchParams({ hashes: hash });
  await apiWithFallback(cfg, '/torrents/resume', '/torrents/start', body);
  return { ok: true };
}

export async function deleteTorrent(cfg, hash, deleteFiles) {
  const body = new URLSearchParams({
    hashes: hash,
    deleteFiles: deleteFiles ? 'true' : 'false',
  });
  await api(cfg, '/torrents/delete', { method: 'POST', body });
  return { ok: true };
}
