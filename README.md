# Monitor AIB — Frontend de Monitoreo de Cámaras

## Descripción

Frontend modular en React + Vite para monitoreo y control de cámaras en tiempo real.
Permite iniciar procesamiento de pluma extendida y detección de colisiones,
agregar métodos de análisis adicionales vía PATCH, **ver el feed en vivo (WebRTC)**,
y revisar el **historial de logs** y la **galería de snapshots** por cámara.

Habla con un backend separado (Python) que ingiere el RTSP y procesa frame a frame.

## Requisitos

- Node.js ≥ 18
- npm ≥ 9
- Backend API corriendo (URL configurable en Settings o `.env`)

## Instalación y uso

```bash
npm install
npm run dev        # Desarrollo → http://localhost:3000
npm run build      # Build para producción → dist/
npm run preview    # Preview del build
```

> Para testear el feed sin acceso al server real de cámaras, usá el simulador
> **`rtsp-sim`** (proyecto aparte). Ver sección más abajo.

## Páginas (sidebar)

| Página | Descripción |
|--------|-------------|
| **Cámaras** | Agregar/detener cámaras, ver el feed en vivo, métodos PATCH, logs en vivo |
| **Logs** | Historial de logs (persistido) por cámara, con filtros y búsqueda |
| **Snapshots** | Galería de capturas de alerta (cámara, alerta, timestamp) |

## Feed en vivo (RTSP → WebRTC)

Los navegadores no reproducen `rtsp://` directo. El feed se ve vía **WebRTC (WHEP)**
servido por un gateway (MediaMTX). El front mapea el `source` de la cámara:

```
rtsp://host:port/<path>   →   http://<gateway-webrtc>/<path>/whep
```

El gateway (`webrtcBaseUrl`) se configura en **Settings (⚙)**; default
`http://localhost:8889`. En modo dev también se puede usar un **archivo MP4 local**
(dejá el `Source` vacío al agregar la cámara).

## Configuración

### Settings (⚙ en el header) — persistido en localStorage

| Campo | Default | Descripción |
|-------|---------|-------------|
| `apiBaseUrl` | `http://localhost:8000` | Backend de procesamiento (POST/DELETE/PATCH/SSE) |
| `webrtcBaseUrl` | `http://localhost:8889` | Gateway WebRTC (WHEP) para el feed |
| `rtspBaseUrl` | `rtsp://localhost:8554` | Base RTSP de referencia |

### `.env` (opcional, defaults de build)

```env
VITE_APP_MODE=development                 # development | production
VITE_API_BASE_URL=http://localhost:8000   # default de apiBaseUrl
VITE_LOG_POLL_INTERVAL=2000
VITE_MAX_LOG_LINES=500
VITE_DEV_VIDEO_DIR=./videos               # carpeta de videos de prueba (dev)
```

## Testear con un RTSP simulado (sin acceso al server real)

El simulador es un **proyecto independiente** (`rtsp-sim`), separado de este
frontend. Levanta un RTSP en vivo en `localhost` a partir de un video, que sirve
al front (WebRTC) y al back (RTSP). Sin instalación manual (ffmpeg vía
`ffmpeg-static`, MediaMTX auto-descargado).

```bash
cd ../rtsp-sim
npm install
node index.mjs ./mi-video.mp4 --name cam-test-01
# luego, en Cámaras → Agregar: Source = rtsp://localhost:8554/cam-test-01
```

Ver detalles y fallback en el `README.md` del proyecto `rtsp-sim`.

## Flujo de uso

1. Click en **"+ Agregar cámara"**.
2. Ingresar `camera_id` y `source` (URL RTSP). En dev, el source vacío usa un MP4 local.
3. Elegir tipo: **Pluma Extendida** o **Detección de Colisión**.
4. Configurar parámetros (cooldowns o alarm_id) → POST al backend → la cámara aparece activa.
5. Para pluma extendida: botón **"+ Método"** para agregar análisis PATCH.

No hay GET de cámaras — se crean al hacer POST y viven en el estado local.

## Arquitectura

```
src/
├── config/                     # Configuración centralizada
│   ├── app.config.js           # Variables de entorno y defaults
│   ├── endpoints.config.js     # Endpoints API + PLUMA_PATCH_METHODS
│   ├── settings.config.js      # Settings de usuario (defaults) + buildWhepUrl()
│   ├── projects.config.js      # Páginas del sidebar (Cámaras/Logs/Snapshots)
│   └── dev.config.js
│
├── api/                        # Cliente HTTP + cameraService
├── hooks/
│   ├── useCameraState.js       # Estado de cámaras activas + métodos
│   ├── useLogs.js              # Logs por cámara (persistidos) + ingesta SSE de snapshots
│   ├── useSnapshots.js         # Store de snapshots (persistido)
│   ├── useSettings.js          # Settings de usuario (localStorage)
│   ├── useLocalFiles.js        # Archivos MP4 locales (dev)
│   └── useWhepStream.js        # Reproductor WebRTC/WHEP (RTCPeerConnection)
│
├── context/AppContext.jsx      # Provider global (envuelve todas las páginas)
│
├── components/
│   ├── common/                 # StatusDot, Button, FormField, Modal, Badge
│   ├── cameras/                # CameraCard, CameraGrid, CameraFeed (feed en vivo)
│   ├── logs/                   # LogPanel (vivo)
│   ├── modals/                 # AddCameraModal, PatchMethodModal, SettingsModal
│   └── layout/                 # AppHeader (+ Settings), Sidebar
│
├── pages/                      # CamerasPage, LogsPage, SnapshotsPage
├── styles/                     # tokens.css, global.css
├── App.jsx                     # Shell: Sidebar + Header + página activa
└── main.jsx
```

## Endpoints del backend

| Método | Ruta | Body | Descripción |
|--------|------|------|-------------|
| POST | `/start_pluma_extendida` | `{ camera_id, source, pluma_config }` | Inicia procesamiento pluma |
| POST | `/start_collision_detection` | `{ camera_id, source, collision_config }` | Inicia detección colisión |
| DELETE | `/{camera_id}` | — | Detiene cámara |
| PATCH | `/{camera_id}/{method}` | `config` (opcional) | Agrega método a pluma extendida |
| GET (SSE) | `/{camera_id}/logs` | — | Stream de logs (y snapshots de detección) |

### Snapshots vía SSE

Si un evento SSE trae `image` / `snapshot` / `frame` (URL o dataURL) junto con
`alert`/`method`, se agrega automáticamente a la galería de Snapshots.

## Modo desarrollo vs producción

- **Desarrollo**: toggle "Modo local" en el header. Feed por WebRTC (con `rtsp-sim`)
  o por MP4 local. Botón "⚠ Simular alerta" para generar snapshots de prueba.
- **Producción**: feeds RTSP reales (vía gateway WebRTC), requests al backend.

## Agregar una nueva página

1. Crear el componente en `src/pages/NuevaPage.jsx`.
2. Agregar una entrada (lazy) en `src/config/projects.config.js`.
3. (Si necesita estado compartido, ya está disponible vía `useAppContext`.)
