# Vision Control — Frontend de Monitoreo de Cámaras

## Descripción

Frontend modular en React + Vite para monitoreo y control de cámaras en tiempo real.
Permite iniciar procesamiento de pluma extendida y detección de colisiones,
agregar métodos de análisis adicionales vía PATCH, y visualizar logs en vivo.

Diseñado para expansión futura con otros módulos (pestañas).

## Requisitos

- Node.js ≥ 18
- npm ≥ 9
- Backend API corriendo (URL configurable en `.env`)

## Instalación y uso

```bash
npm install
npm run dev        # Desarrollo → http://localhost:3000
npm run build      # Build para producción → dist/
npm run preview    # Preview del build
```

## Configuración

Crear un archivo `.env` en la raíz:

```env
VITE_APP_MODE=development           # development | production
VITE_API_BASE_URL=http://localhost:8000  # URL del backend
VITE_LOG_POLL_INTERVAL=2000         # Polling de logs en ms
VITE_MAX_LOG_LINES=500              # Máx líneas de log por cámara
```

## Flujo de uso

1. Click en **"+ Agregar cámara"**
2. Ingresar `camera_id` y `source` (URL RTSP). En modo dev, el source es opcional.
3. Elegir tipo de procesamiento: **Pluma Extendida** o **Detección de Colisión**
4. Configurar parámetros (cooldowns o alarm_id)
5. Se hace POST al backend → la cámara aparece activa en el grid
6. Para cámaras con pluma extendida: botón **"+ Método"** para agregar análisis PATCH

No hay GET de cámaras — las cámaras se crean al hacer POST y viven en el estado local.

## Arquitectura

```
src/
├── config/                     # Configuración centralizada
│   ├── app.config.js           # Variables de entorno y defaults
│   ├── endpoints.config.js     # Endpoints API + PLUMA_PATCH_METHODS + BASE_COOLDOWN_FIELDS
│   ├── dev.config.js           # Configuración solo-dev (logs simulados, archivos locales)
│   └── index.js
│
├── api/                        # Capa de comunicación con backend
│   ├── apiClient.js            # Cliente HTTP singleton (fetch wrapper)
│   ├── cameraService.js        # startPlumaExtendida, startCollisionDetection, deleteCamera, patchMethod
│   └── index.js
│
├── hooks/                      # Custom hooks reutilizables
│   ├── useCameraState.js       # Estado de cámaras activas + métodos
│   ├── useLogs.js              # Buffer de logs + simulación dev
│   ├── useLocalFiles.js        # Gestión de archivos MP4 locales (dev only)
│   └── index.js
│
├── context/                    # Estado global compartido
│   ├── AppContext.jsx          # Provider: registerCamera, unregisterCamera, dev mode
│   └── index.js
│
├── components/
│   ├── common/                 # Componentes base reutilizables
│   │   ├── StatusDot           # Indicador de estado
│   │   ├── Button              # Variantes: default, primary, danger, ghost
│   │   ├── FormField           # Input text/number/select
│   │   ├── Modal + ModalFooter # Overlay con escape/click-fuera
│   │   └── Badge               # Chip de estado con colores semánticos
│   │
│   ├── cameras/
│   │   ├── CameraCard          # Card con preview, estado, métodos, acciones
│   │   └── CameraGrid          # Grid responsive
│   │
│   ├── logs/
│   │   └── LogPanel            # Panel lateral con auto-scroll, tabs, colores por tipo
│   │
│   ├── modals/
│   │   ├── AddCameraModal      # 2 pasos: camera_id + source + tipo → config específica
│   │   ├── PatchMethodModal    # 2 pasos: selección de método → config dinámica
│   │   ├── StartPlumaModal     # (disponible si se necesita iniciar por separado)
│   │   └── StartCollisionModal # (disponible si se necesita iniciar por separado)
│   │
│   └── layout/
│       └── AppHeader           # Nav por módulos + toggle dev
│
├── styles/
│   ├── tokens.css              # Design tokens (CSS vars)
│   └── global.css              # Reset, scrollbar, animaciones
│
├── pages/
│   └── CamerasPage             # Orquestador: agregar cámara → POST → estado → logs
│
├── App.jsx                     # Shell: header + router de módulos
└── main.jsx                    # Entry point
```

## Endpoints del backend

| Método | Ruta | Body | Descripción |
|--------|------|------|-------------|
| POST | `/start_pluma_extendida` | `{ camera_id, source, pluma_config }` | Inicia procesamiento pluma |
| POST | `/start_collision_detection` | `{ camera_id, source, collision_config }` | Inicia detección colisión |
| DELETE | `/{camera_id}` | — | Detiene cámara |
| PATCH | `/{camera_id}/{method}` | `config` (opcional) | Agrega método a pluma extendida |

### Métodos PATCH disponibles (solo pluma extendida)

Todos los configs heredan `not_detected_cooldown` (int >0) y `detected_cooldown` (int >0).

| Método | Campos específicos opcionales |
|--------|------------------------------|
| `patas` | `alarm_id` |
| `security_elements` | `perimeter_alarm_id`, `helmet_alarm_id`, `coverall_alarm_id` |
| `signaler` | `signaler_alarm_id` |
| `tagline` | `tagline_alarm_id` |
| `linea_de_fuego` | `linea_fuego_alarm_id` |
| `work_at_height` | `work_at_height_alarm_id` |

## Modo desarrollo vs producción

- **Desarrollo**: toggle "Modo local" en el header. Videos desde MP4 locales, logs simulados, sin requests al backend.
- **Producción**: el toggle no aparece. Feeds RTSP reales, requests al backend.

## Expandir con nuevos módulos

1. Agregar entrada en `APP_MODULES` en `App.jsx`
2. Crear página en `src/pages/NuevoModulo.jsx`
3. Agregar case en `renderModule()` de `AppShell`
