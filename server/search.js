// Búsqueda de torrents vía Torznab (Jackett "all" o Prowlarr).
// Torznab devuelve un RSS/XML; lo parseamos sin dependencias externas.

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&'); // último, para no romper las otras entidades
}

// Devuelve el contenido del primer <tag>...</tag> dentro de block (maneja CDATA).
function tagText(block, tag) {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = block.match(re);
  if (!m) return null;
  let v = m[1].trim();
  const cdata = v.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) return cdata[1];
  return decodeEntities(v);
}

// Atributo Torznab: <torznab:attr name="seeders" value="123"/>
function torznabAttr(block, name) {
  const re = new RegExp(`<torznab:attr\\b[^>]*\\bname="${name}"[^>]*\\bvalue="([^"]*)"`, 'i');
  const m = block.match(re);
  // Decodificar entidades: en un magnet, &amp; debe volver a ser & o qB lo recibe roto.
  return m ? decodeEntities(m[1]) : null;
}

function enclosureUrl(block) {
  const m = block.match(/<enclosure\b[^>]*\burl="([^"]+)"/i);
  return m ? decodeEntities(m[1]) : null;
}

function parseTorznab(xml) {
  const items = [];
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRe.exec(xml)) !== null) {
    const block = match[1];
    const title = tagText(block, 'title') || '(sin título)';
    const link = tagText(block, 'link');
    const magnet = torznabAttr(block, 'magneturl');
    const sizeAttr = torznabAttr(block, 'size');
    const size = Number(sizeAttr || tagText(block, 'size') || 0);
    const seeders = Number(torznabAttr(block, 'seeders') || 0);
    const peers = Number(torznabAttr(block, 'peers') || 0);
    const indexer = torznabAttr(block, 'jackettindexer') || tagText(block, 'jackettindexer') || '';
    const pubDate = tagText(block, 'pubDate');

    // Enlace para mandar a qBittorrent: preferimos magnet, luego enclosure, luego link.
    const sendLink = magnet || enclosureUrl(block) || link;
    if (!sendLink) continue;

    items.push({
      title,
      size,
      seeders,
      leechers: Math.max(0, peers - seeders),
      indexer,
      pubDate,
      link: sendLink,
      isMagnet: sendLink.startsWith('magnet:'),
    });
  }
  // Ordenar por más seeders (más probable que baje rápido).
  items.sort((a, b) => b.seeders - a.seeders);
  return items;
}

export async function searchTorrents(cfg, query) {
  if (!cfg.indexerUrl) {
    const err = new Error('No hay indexador configurado. Cargá la URL Torznab de Jackett/Prowlarr en Ajustes.');
    err.statusCode = 400;
    throw err;
  }
  const url = new URL(cfg.indexerUrl);
  url.searchParams.set('t', 'search');
  url.searchParams.set('q', query);
  if (cfg.indexerApiKey) url.searchParams.set('apikey', cfg.indexerApiKey);

  let res;
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/xml, text/xml, */*' },
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    throw new Error(`No se pudo contactar al indexador (${e.name === 'TimeoutError' ? 'timeout' : e.code || e.message}).`);
  }
  const text = await res.text();
  if (!res.ok) {
    // Jackett devuelve XML <error code="..." description="..."/> ante problemas.
    const errDesc = text.match(/description="([^"]+)"/);
    throw new Error(`El indexador devolvió ${res.status}${errDesc ? `: ${errDesc[1]}` : ''}.`);
  }
  return parseTorrents(text);
}

function parseTorrents(text) {
  // Detectar error de Jackett aunque venga con HTTP 200.
  const errDesc = text.match(/<error\b[^>]*\bdescription="([^"]+)"/i);
  if (errDesc) throw new Error(`Indexador: ${errDesc[1]}`);
  return parseTorznab(text);
}
