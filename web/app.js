// Lógica del frontend (PWA). Habla con la API del servidor local.

const $ = (sel) => document.querySelector(sel);

// Config cacheada en el cliente (para saber los destinos al enviar).
let appConfig = { destinations: [], savePath: '' };

// ---------- Helpers de red ----------
async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

// ---------- Formato ----------
function fmtSize(bytes) {
  if (!bytes || bytes < 0) return '—';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0, n = bytes;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}
function fmtSpeed(bps) {
  return bps > 0 ? `${fmtSize(bps)}/s` : '';
}
function fmtEta(s) {
  if (!s || s >= 8640000) return '';
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}min`;
  return `${Math.round(s / 3600)}h`;
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// ---------- Toast ----------
let toastTimer;
function toast(msg, kind = '') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = `toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 2800);
}

// ---------- Navegación por pestañas ----------
let currentTab = 'search';
function showTab(name) {
  currentTab = name;
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  $(`#tab-${name}`).classList.add('active');
  if (name === 'downloads') refreshDownloads();
  if (name === 'settings') loadSettings();
}
document.querySelectorAll('.tab-btn').forEach((b) => {
  b.addEventListener('click', () => showTab(b.dataset.tab));
});

// ---------- Búsqueda ----------
$('#search-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = $('#search-input').value.trim();
  if (!q) return;
  const box = $('#search-results');
  $('#search-empty').style.display = 'none';
  box.innerHTML = '<div class="empty"><span class="spinner"></span> Buscando…</div>';
  try {
    const { results } = await api(`/api/search?q=${encodeURIComponent(q)}`);
    renderSearch(results);
  } catch (err) {
    box.innerHTML = '';
    $('#search-empty').style.display = 'block';
    $('#search-empty').textContent = err.message;
  }
});

function renderSearch(results) {
  const box = $('#search-results');
  if (!results.length) {
    box.innerHTML = '';
    $('#search-empty').style.display = 'block';
    $('#search-empty').textContent = 'Sin resultados.';
    return;
  }
  $('#search-empty').style.display = 'none';
  box.innerHTML = results.slice(0, 60).map((r, i) => `
    <div class="card">
      <div class="title">${esc(r.title)}</div>
      <div class="meta">
        <span>${fmtSize(r.size)}</span>
        <span class="seeds">▲ ${r.seeders}</span>
        <span class="leech">▼ ${r.leechers}</span>
        ${r.indexer ? `<span>${esc(r.indexer)}</span>` : ''}
      </div>
      <div class="actions">
        <button class="btn-sm send" data-i="${i}">Enviar a la PC</button>
      </div>
    </div>
  `).join('');
  box.querySelectorAll('.send').forEach((btn) => {
    btn.addEventListener('click', () => sendLink(results[btn.dataset.i].link, btn));
  });
}

async function sendLink(link, btn) {
  const dests = appConfig.destinations || [];
  let savePath = '';
  if (dests.length) {
    const choice = await chooseDestination(dests);
    if (choice === null) return; // cancelado
    savePath = choice;
  }
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }
  try {
    await api('/api/torrents/add', { method: 'POST', body: JSON.stringify({ link, savePath }) });
    toast('✅ Enviado a la PC', 'ok');
    if (btn) btn.textContent = '✓ Enviado';
  } catch (err) {
    toast(err.message, 'bad');
    if (btn) { btn.disabled = false; btn.textContent = 'Enviar a la PC'; }
  }
}

// Bottom sheet para elegir carpeta. Resuelve: null (cancelar), '' (default) o una ruta.
function chooseDestination(dests) {
  return new Promise((resolve) => {
    const overlay = $('#chooser');
    const list = $('#chooser-list');
    const cancelBtn = $('#chooser-cancel');
    const cleanup = () => { overlay.classList.remove('show'); list.innerHTML = ''; cancelBtn.onclick = null; };

    const opts = [
      { label: '📁 Carpeta por defecto', sub: appConfig.savePath || 'la default de qBittorrent', value: '', cls: 'default' },
      ...dests.map((d) => ({ label: `📂 ${d.label}`, sub: d.path, value: d.path })),
      { label: '✏️ Otra carpeta…', sub: 'escribir una ruta', value: '__custom__' },
    ];
    for (const o of opts) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `chooser-opt ${o.cls || ''}`;
      b.innerHTML = `${esc(o.label)}${o.sub ? `<span class="sub">${esc(o.sub)}</span>` : ''}`;
      b.onclick = () => {
        if (o.value === '__custom__') {
          const p = prompt('Ruta de destino en la PC:', appConfig.savePath || '');
          if (p === null) return; // mantener abierto el selector
          cleanup(); resolve(p.trim());
        } else {
          cleanup(); resolve(o.value);
        }
      };
      list.appendChild(b);
    }
    cancelBtn.onclick = () => { cleanup(); resolve(null); };
    overlay.classList.add('show');
  });
}

// Magnet manual
$('#magnet-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const link = $('#magnet-input').value.trim();
  if (!link) return;
  await sendLink(link);
  $('#magnet-input').value = '';
});

// ---------- Descargas ----------
let downloadsTimer;
async function refreshDownloads() {
  try {
    const { torrents } = await api('/api/torrents');
    renderDownloads(torrents);
    setDot(true);
  } catch (err) {
    setDot(false);
    if (currentTab === 'downloads') {
      $('#downloads-list').innerHTML = '';
      $('#downloads-empty').style.display = 'block';
      $('#downloads-empty').textContent = err.message;
    }
  }
}

const PAUSED_STATES = ['pausedDL', 'pausedUP', 'stoppedDL', 'stoppedUP'];
function renderDownloads(torrents) {
  const box = $('#downloads-list');
  if (!torrents.length) {
    box.innerHTML = '';
    $('#downloads-empty').style.display = 'block';
    $('#downloads-empty').textContent = 'No hay descargas todavía.';
    return;
  }
  $('#downloads-empty').style.display = 'none';
  torrents.sort((a, b) => b.addedOn - a.addedOn);
  box.innerHTML = torrents.map((t) => {
    const pct = Math.round(t.progress * 100);
    const paused = PAUSED_STATES.includes(t.state);
    const done = t.progress >= 1;
    const dl = fmtSpeed(t.dlspeed);
    const eta = fmtEta(t.eta);
    return `
    <div class="card" data-hash="${t.hash}">
      <div class="title">${esc(t.name)}</div>
      <div class="progress ${done ? 'done' : ''} ${paused ? 'paused' : ''}"><i style="width:${pct}%"></i></div>
      <div class="meta">
        <span>${pct}%</span>
        <span>${fmtSize(t.downloaded)} / ${fmtSize(t.size)}</span>
        ${done ? '<span class="seeds">Completado</span>'
          : paused ? '<span>En pausa</span>'
          : `${dl ? `<span class="seeds">↓ ${dl}</span>` : ''}${eta ? `<span>${eta}</span>` : ''}`}
      </div>
      <div class="actions">
        <button class="btn-sm toggle">${paused ? '▶ Reanudar' : '⏸ Pausar'}</button>
        <button class="btn-sm danger del">🗑 Borrar</button>
      </div>
    </div>`;
  }).join('');

  box.querySelectorAll('.card').forEach((card) => {
    const hash = card.dataset.hash;
    const t = torrents.find((x) => x.hash === hash);
    const paused = PAUSED_STATES.includes(t.state);
    card.querySelector('.toggle').addEventListener('click', async () => {
      try {
        await api(`/api/torrents/${paused ? 'resume' : 'pause'}`, {
          method: 'POST', body: JSON.stringify({ hash }),
        });
        refreshDownloads();
      } catch (err) { toast(err.message, 'bad'); }
    });
    card.querySelector('.del').addEventListener('click', () => confirmDelete(hash, t.name));
  });
}

async function confirmDelete(hash, name) {
  const withFiles = confirm(`Borrar "${name}".\n\nAceptar = borrar también los archivos descargados.\nCancelar = mantener el torrent.`);
  // confirm() es binario; usamos un segundo prompt simple para no borrar archivos sin querer.
  if (!withFiles) {
    const justEntry = confirm('¿Querés quitar el torrent de la lista pero CONSERVAR los archivos?');
    if (!justEntry) return;
    await doDelete(hash, false);
  } else {
    await doDelete(hash, true);
  }
}
async function doDelete(hash, deleteFiles) {
  try {
    await api('/api/torrents/delete', { method: 'POST', body: JSON.stringify({ hash, deleteFiles }) });
    toast('Torrent borrado', 'ok');
    refreshDownloads();
  } catch (err) { toast(err.message, 'bad'); }
}

// Auto-refresco mientras se ve la pestaña de descargas.
setInterval(() => {
  if (currentTab === 'downloads' && document.visibilityState === 'visible') {
    refreshDownloads();
  }
}, 2500);

// ---------- Ajustes ----------
async function loadSettings() {
  try {
    const cfg = await api('/api/config');
    appConfig = cfg; // cachear para el selector de carpeta al enviar
    const f = $('#settings-form');
    f.qbUrl.value = cfg.qbUrl || '';
    f.qbUser.value = cfg.qbUser || '';
    f.indexerUrl.value = cfg.indexerUrl || '';
    f.savePath.value = cfg.savePath || '';
    $('#qbpass-hint').textContent = cfg.qbPassSet ? '(guardada — dejá en blanco para no cambiar)' : '';
    $('#apikey-hint').textContent = cfg.indexerApiKeySet ? '(guardada)' : '';
    renderDests(cfg.destinations || []);
  } catch (err) {
    toast(err.message, 'bad');
  }
}

function destRow(d = { label: '', path: '' }) {
  const row = document.createElement('div');
  row.className = 'dest-row';
  row.innerHTML = `
    <input class="label-in" type="text" placeholder="Nombre" value="${esc(d.label)}" />
    <input class="path-in" type="text" placeholder="Ruta (C:\\...)" value="${esc(d.path)}" />
    <button type="button" class="rm" title="Quitar">×</button>`;
  row.querySelector('.rm').onclick = () => row.remove();
  return row;
}
function renderDests(dests) {
  const list = $('#dest-list');
  list.innerHTML = '';
  dests.forEach((d) => list.appendChild(destRow(d)));
}
function collectDests() {
  return [...$('#dest-list').querySelectorAll('.dest-row')]
    .map((r) => ({
      label: r.querySelector('.label-in').value.trim(),
      path: r.querySelector('.path-in').value.trim(),
    }))
    .filter((d) => d.path);
}
$('#add-dest').addEventListener('click', () => $('#dest-list').appendChild(destRow()));

$('#settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const status = $('#settings-status');
  status.className = 'settings-status';
  status.innerHTML = '<span class="spinner"></span> Probando…';
  const patch = {
    qbUrl: f.qbUrl.value.trim(),
    qbUser: f.qbUser.value.trim(),
    qbPass: f.qbPass.value, // si está vacío, el server no lo cambia
    indexerUrl: f.indexerUrl.value.trim(),
    indexerApiKey: f.indexerApiKey.value.trim(),
    savePath: f.savePath.value.trim(),
    destinations: collectDests(),
  };
  try {
    const { qb } = await api('/api/config', { method: 'POST', body: JSON.stringify(patch) });
    f.qbPass.value = '';
    if (qb.ok) {
      status.className = 'settings-status ok';
      status.textContent = `✅ Conectado a qBittorrent ${qb.version || ''}`;
      setDot(true);
    } else {
      status.className = 'settings-status bad';
      status.textContent = `⚠ ${qb.error || 'No se pudo conectar.'}`;
      setDot(false);
    }
    loadSettings();
  } catch (err) {
    status.className = 'settings-status bad';
    status.textContent = err.message;
  }
});

// ---------- Estado (dot del header) ----------
function setDot(ok) {
  $('#status-dot').className = `dot ${ok ? 'ok' : 'bad'}`;
}
async function checkStatus() {
  try {
    const s = await api('/api/status');
    setDot(s.qb.ok);
  } catch { setDot(false); }
}

// ---------- Init ----------
loadSettings(); // cachea config (destinos) y rellena el form de Ajustes
checkStatus();
setInterval(checkStatus, 15000);

// Registrar service worker (instalable como PWA).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
