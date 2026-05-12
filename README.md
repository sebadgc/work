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

## Arquitectura

```
src/
├── config/                     # Configuración centralizada
│   ├── app.config.js           # Variables de entorno y defaults
│   ├── endpoints.config.js     # Endpoints API + PLUMA_PATCH_METHODS + BASE_COOLDOWN_FIELDS
│   ├── dev.config.js           # Configuración solo-dev (logs simulados, archivos locales)
│   └── index.js                # Barrel export
│
├── api/                        # Capa de comunicación con backend
│   ├── apiClient.js            # Cliente HTTP singleton (fetch wrapper)
│   ├── cameraService.js        # Servicio de dominio: fetchCameras, start*, delete, patch
│   └── index.js
│
├── hooks/                      # Custom hooks reutilizables
│   ├── useCameraState.js       # Estado de cámaras activas + métodos
│   ├── useLogs.js              # Buffer de logs + simulación dev
│   ├── useLocalFiles.js        # Gestión de archivos MP4 locales (dev only)
│   └── index.js
│
├── context/                    # Estado global compartido
│   ├── AppContext.jsx          # Provider que compone hooks + dev mode
│   └── index.js
│
├── components/
│   ├── common/                 # Componentes base reutilizables
│   │   ├── StatusDot           # Indicador de estado (activo/inactivo/warning)
│   │   ├── Button              # Variantes: default, primary, danger, ghost
│   │   ├── FormField           # Input con soporte text/number/select
│   │   ├── Modal + ModalFooter # Overlay con escape/click-fuera
│   │   └── Badge               # Chip de estado con colores semánticos
│   │
│   ├── cameras/                # Módulo de cámaras
│   │   ├── CameraCard          # Card con preview (RTSP/MP4), estado, métodos, acciones
│   │   └── CameraGrid          # Grid responsive para cards
│   │
│   ├── logs/                   # Módulo de logs
│   │   └── LogPanel            # Panel lateral con auto-scroll, tabs por cámara, colores por tipo
│   │
│   ├── modals/                 # Modales de configuración
│   │   ├── StartPlumaModal     # Config cooldowns para pluma extendida
│   │   ├── StartCollisionModal # Config collision_alarm_id
│   │   └── PatchMethodModal    # 2 pasos: selección de método → config dinámica
│   │
│   └── layout/
│       └── AppHeader           # Barra superior con nav por módulos + toggle dev
│
├── styles/
│   ├── tokens.css              # Design tokens: colores, tipografía, spacing, radios
│   └── global.css              # Reset, scrollbar, animaciones base
│
├── pages/
│   └── CamerasPage             # Orquestador del módulo: fetch, modales, estado
│
├── App.jsx                     # Shell: header + router de módulos
└── main.jsx                    # Entry point React
```

## Endpoints esperados del backend

| Método | Ruta | Body | Descripción |
|--------|------|------|-------------|
| GET | `/cameras` | — | Lista de cámaras configuradas `[{ camera_id, name, source }]` |
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

- **Desarrollo (`VITE_APP_MODE=development`)**: aparece toggle "Modo local" en el header.
  Al activarlo, los videos se cargan desde archivos MP4 locales y los logs se simulan.
  No se hacen requests al backend.

- **Producción (`VITE_APP_MODE=production`)**: el toggle no aparece.
  Los feeds son RTSP reales obtenidos del backend.
  Todos los requests van a la API.

Para deploy limpio: los archivos `dev.config.js` y `useLocalFiles.js` solo se importan
condicionalmente, y el toggle no se renderiza. No es necesario eliminar archivos.

## Expandir con nuevos módulos

1. Agregar entrada en `APP_MODULES` en `App.jsx`
2. Crear página en `src/pages/NuevoModulo.jsx`
3. Agregar case en `renderModule()` de `AppShell`
4. (Opcional) agregar servicios en `src/api/`, hooks en `src/hooks/`
