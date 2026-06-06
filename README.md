# 🧲 Torrent Remote

Buscá torrents y mandalos a descargar en tu **PC** desde el navegador de tu
**celular**. La PC hace el trabajo pesado (qBittorrent baja los archivos); el
celu es solo el control remoto.

```
[ Celular (PWA) ]  ──WiFi──>  [ Servidor Node en tu PC ]  ──>  qBittorrent  +  Jackett/Prowlarr
   buscar / enviar / ver               (este proyecto)            (descarga)      (búsqueda)
```

- **Sin dependencias** de npm: solo necesitás Node.js ≥ 18.
- **Sin build**: `npm start` y listo.
- Funciona como **PWA**: podés "instalarla" en la pantalla de inicio del celu.

---

## Qué necesitás en tu PC

1. **Node.js ≥ 18** (este proyecto).
2. **qBittorrent** con la **Web UI activada**:
   `Herramientas → Opciones → Web UI` → marcá "Web User Interface (Remote control)",
   anotá el puerto (default `8080`), usuario y contraseña.
3. **(Para buscar)** un indexador **Jackett** o **Prowlarr** corriendo en tu PC.
   Te da una URL *Torznab* y una *API Key*. Sin esto, igual podés pegar magnets a mano.

> El celu y la PC tienen que estar en la **misma red WiFi**.

---

## Cómo arrancarlo

En la PC, dentro de esta carpeta:

```bash
npm start
```

Vas a ver algo así:

```
  🧲  Torrent Remote corriendo

  En esta PC:     http://localhost:8088
  Desde el celu:  http://192.168.0.42:8088   (misma WiFi)
```

En el **celular**, abrí esa dirección `http://192.168.0.x:8088` en el navegador.
La primera vez, andá a **Ajustes (⚙)** y cargá:

- **qBittorrent**: URL (`http://localhost:8080`), usuario y contraseña.
- **Búsqueda** (opcional): URL Torznab y API Key de Jackett/Prowlarr.

Tocá **Guardar y probar conexión**. El puntito del header se pone verde 🟢 cuando
qBittorrent responde.

---

## Cómo se usa

- **🔍 Buscar**: escribí y tocá *Buscar*. En cada resultado, **"Enviar a la PC"**
  agrega el torrent a qBittorrent y empieza a bajar.
  También podés desplegar *"Pegar un enlace magnet"* y enviar uno a mano.
- **⬇️ Descargas**: lista en vivo con progreso, velocidad y ETA. Pausar / reanudar /
  borrar (te pregunta si querés borrar también los archivos).
- **⚙️ Ajustes**: conexión a qBittorrent, indexador y carpeta de destino.

---

## Configuración

Todo se edita desde **Ajustes** y se guarda en `data/config.json` (ignorado por git).
También podés sembrar defaults con variables de entorno — ver `.env.example`.

| Variable | Default | Qué es |
|---|---|---|
| `PORT` | `8088` | Puerto del servidor (lo que abrís en el celu) |
| `QB_URL` | `http://localhost:8080` | Web UI de qBittorrent |
| `QB_USER` / `QB_PASS` | `admin` / `adminadmin` | Credenciales de qBittorrent |
| `INDEXER_URL` | — | URL Torznab de Jackett ("all") o Prowlarr |
| `INDEXER_APIKEY` | — | API Key del indexador |
| `SAVE_PATH` | — | Carpeta de descarga (vacío = default de qB) |

### Ejemplo de URL Torznab (Jackett)

En Jackett, en el indexador agregado **"all"**, copiá el botón *Torznab Feed*. Queda:

```
http://localhost:9117/api/v2.0/indexers/all/results/torznab/api
```

y la **API Key** está arriba a la derecha en Jackett.

---

## Estructura

```
.
├── server/
│   ├── index.js         # Servidor HTTP: sirve la PWA + API puente
│   ├── config.js        # Carga/guarda configuración (data/config.json)
│   ├── qbittorrent.js   # Cliente de la Web API de qBittorrent
│   └── search.js        # Búsqueda Torznab (Jackett/Prowlarr)
├── web/                 # PWA mobile-first (HTML/CSS/JS, sin build)
│   ├── index.html  styles.css  app.js
│   ├── manifest.webmanifest  sw.js  icon.svg
├── data/                # config.json (generado, ignorado por git)
└── package.json
```

---

## Notas

- **Compatibilidad qBittorrent 4.x y 5.x**: en 5.x los endpoints `pause`/`resume`
  pasaron a `stop`/`start`; el cliente prueba uno y cae al otro automáticamente.
- **Acceso desde fuera de casa**: este proyecto asume red local. Para usarlo por
  internet, lo recomendable es una VPN como **Tailscale** (entrás a la IP de
  Tailscale de tu PC, sin abrir puertos). No expongas esto directo a internet sin
  una capa de autenticación/VPN.
- **Seguridad**: la API no tiene login propio (pensada para LAN de confianza).
  Las contraseñas se guardan en `data/config.json` en tu PC.

---

## Solución de problemas

| Síntoma | Causa probable |
|---|---|
| Puntito rojo 🔴 / "No se pudo conectar" | qBittorrent cerrado o Web UI desactivada; URL/puerto mal |
| "Usuario o contraseña incorrectos" | Credenciales de la Web UI de qBittorrent |
| "IP baneada" | Demasiados logins fallidos; reiniciá qBittorrent o esperá |
| Búsqueda da error | Falta `INDEXER_URL`/API Key, o Jackett/Prowlarr no está corriendo |
| El celu no abre la página | No están en la misma WiFi, o el firewall de la PC bloquea el puerto |
```
