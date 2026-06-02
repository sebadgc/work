/**
 * messages.js
 *
 * Textos visibles para el usuario (popups, botones, estados, logs, avisos).
 * TODO el texto de la UI vive acá para editarlo en un solo lugar.
 *
 * Los mensajes con datos dinámicos son funciones: ej. MESSAGES.log.delError('...')
 */

export const MESSAGES = {
  // ── App / layout ──
  app: {
    loadingModule: 'Cargando módulo...',
    pageNotFound: 'Página no encontrada',
  },
  header: {
    brand: 'Monitor AIB',
    settings: 'Configuración',
  },
  sidebar: {
    expand: 'Expandir menú',
    collapse: 'Colapsar menú',
    pagesCount: (n) => `${n} página${n !== 1 ? 's' : ''}`,
  },
  // Nombres y descripciones de las páginas del sidebar (ver projects.config.js)
  pages: {
    cameras: { label: 'Cámaras', description: 'Monitoreo de cámaras y feeds en vivo' },
    logs: { label: 'Logs', description: 'Historial de logs por cámara' },
    snapshots: { label: 'Snapshots', description: 'Capturas de alertas por cámara' },
  },

  // ── Feed de video (CameraFeed) ──
  feed: {
    live: '● EN VIVO',
    connecting: 'Conectando…',
    noSignal: 'Sin señal',
    noSignalHint: 'Revisá el gateway WebRTC en Settings',
    noPreview: 'SIN PREVIEW',
  },

  // ── Card de cámara ──
  cameraCard: {
    stop: 'Detener',
    addMethod: '+ Método',
    capture: 'Capturar',
    stopping: 'Deteniendo…',
    activating: 'ACTIVANDO…',
    noDetectors: 'SIN DETECTORES',
    badgePluma: 'pluma',
    badgeColision: 'colisión',
    statusPluma: 'PLUMA',
    statusColision: 'COLISIÓN',
  },

  // ── Página Cámaras ──
  cameras: {
    addCamera: '+ Agregar cámara',
    noneActive: 'Sin cámaras activas',
    countActive: (n) => `${n} cámara${n > 1 ? 's' : ''} activa${n > 1 ? 's' : ''}`,
    emptyTitle: 'No hay cámaras encendidas',
    emptyHint: 'Encendé una cámara del panel de arriba, o usá "+ Agregar cámara".',
    loadingGrid: 'Cargando cámaras...',
    pillTitle: (name, on, rtsp) => `${name} — ${on ? 'encendida' : 'apagada'}\n${rtsp}`,
  },

  // ── Modal activar cámara ──
  activate: {
    title: (name) => `¿Activar Cámara ${name}?`,
    hint: 'Elegí qué detectores encender:',
    pluma: 'Pluma',
    plumaSub: '+ todos los opcionales',
    colision: 'Colisión',
    colisionSub: 'detección de colisión',
    confirm: 'Activar',
    cancel: 'Cancelar',
  },

  // ── Confirmación detener ──
  stopConfirm: {
    title: (id) => `¿Detener cámara ${id}?`,
    message: 'Se detienen TODOS sus detectores (pluma, opcionales y colisión). Para volver a tener solo uno, reactivá la cámara eligiendo el grupo.',
    confirm: 'Detener',
  },

  // ── Diálogos de error (popups) ──
  errors: {
    backendDownTitle: 'No se pudo conectar con el Backend',
    backendDownMsg: 'No se pudo conectar correctamente con el Backend. Revisá que esté corriendo y la configuración (⚙ → Conexión).\n\nLa cámara se cerró localmente igualmente.',
    activateFailTitle: (id) => `No pude levantar la cámara ${id}`,
    activateFailMsg: (error) => `Intenté iniciarla (y reiniciarla) sin éxito. Hablá con el equipo de desarrollo.\n\nError: ${error || 'desconocido'}`,
    ok: 'Entendido',
  },

  // ── Líneas de log (lo que se escribe en el panel/historial) ──
  log: {
    activateStarting: (name) => `Activando "${name}"...`,
    postPluma: 'POST start_pluma_extendida...',
    retry: (label, error) => `No pude iniciar ${label} (${error}). Intento detener y reiniciar la cámara...`,
    plumaOk: 'Pluma OK — activando opcionales...',
    methodOk: (label) => `+ ${label}`,
    methodError: (label, error) => `Método ${label}: ${error}`,
    plumaError: (error) => `Pluma error: ${error}`,
    postCollision: 'POST start_collision_detection...',
    collisionOk: 'Colisión OK',
    collisionError: (error) => `Colisión error: ${error}`,
    activateFail: (error) => `No pude levantar la cámara. Error: ${error || 'desconocido'}`,
    adhocStarting: (label, source) => `Iniciando ${label} — source: ${source}`,
    adhocBackendError: (error) => `Error del backend: ${error}`,
    adhocOk: 'Backend respondió OK — procesador iniciado',
    delSending: 'Enviando DELETE...',
    delOk: 'Backend respondió OK — cámara detenida',
    delNotFound: (error) => `La cámara ya no existía en el backend (${error}) — cerrando feed local`,
    delConnFail: (error) => `Sin conexión con el backend (${error}) — cerrando feed local`,
    delError: (error) => `Error al detener: ${error}`,
    patchSending: (id, method) => `Enviando PATCH /${id}/${method}...`,
    patchError: (error) => `Error PATCH: ${error}`,
    patchOk: (method) => `Backend respondió OK — método ${method} activo`,
    patchDisabling: (method) => `Desactivando método: ${method}...`,
    patchOffOk: (method) => `Backend respondió OK — método ${method} desactivado`,
    captureNoVideo: 'No se pudo capturar el frame (sin video)',
    captureOk: '⚑ Snapshot manual guardado',
    captureFail: 'No se pudo guardar el snapshot manual',
    streamClosed: 'Conexión de logs cerrada por el servidor',
    // etiquetas de procesador usadas dentro de otros mensajes
    procPluma: 'pluma extendida',
    procColision: 'detección de colisión',
  },

  // ── Panel de logs (derecha) ──
  logPanel: {
    title: 'LOGS',
    clear: 'Limpiar',
    selectCamera: 'Seleccioná una cámara para ver logs',
    noLogs: 'Sin logs todavía...',
  },

  // ── Página Logs ──
  logsPage: {
    allCameras: 'Todas las cámaras',
    allDays: 'Todos los días',
    search: 'Buscar en logs…',
    clearView: 'Limpiar vista',
    emptyNone: 'No hay logs todavía. Iniciá una cámara para empezar a registrar.',
    emptyNoMatch: 'Ningún log coincide con los filtros.',
    types: { all: 'Todos los tipos', info: 'Info', detection: 'Detección', warn: 'Warn', error: 'Error' },
  },

  // ── Página Snapshots ──
  snapshots: {
    allAlerts: 'Todas las alertas',
    refresh: 'Refrescar',
    loading: 'Cargando…',
    noCameras: '(sin cámaras)',
    noRootNote: '⚠ Sin "Carpeta de snapshots (root)" configurada (⚙ → Conexión) solo se ven las capturas manuales; las del backend no se cargan.',
    emptyTitle: 'Sin snapshots',
    emptyHint: (camera, day) => `No hay capturas para ${camera || 'esta cámara'} el ${day}.`,
    manualTag: ' · manual',
  },

  // ── Modal agregar cámara (ad-hoc) ──
  addCamera: {
    title: 'Agregar Cámara',
    subtitle: 'Configurar nueva instancia de cámara',
    cameraId: 'Camera ID',
    cameraIdPlaceholder: 'ej: cam-pluma-01',
    cameraIdTaken: '⚠ Este ID ya está en uso',
    cameraIdHint: 'Identificador único de la cámara en el backend',
    source: 'Source (RTSP URL)',
    sourcePlaceholder: 'rtsp://ip:port/id/live',
    sourceHint: 'URL del feed RTSP de la cámara',
    processorType: 'Tipo de procesamiento',
    optPluma: 'Pluma Extendida',
    optColision: 'Detección de Colisión',
    next: 'Siguiente →',
    cancel: 'Cancelar',
    back: '← Atrás',
    start: 'Iniciar cámara',
    configPluma: 'Config — Pluma Extendida',
    configColision: 'Config — Detección de Colisión',
    collisionAlarmId: 'Collision Alarm ID',
    collisionAlarmPlaceholder: 'ej: ALARM-001',
    cooldownNoDetect: 'Cooldown sin detección (seg)',
    cooldownNoDetectHint: 'Tiempo en segundos para volver a verificar cuando no hay detección',
    cooldownDetect: 'Cooldown con detección (seg)',
    cooldownDetectHint: 'Tiempo en segundos para volver a verificar cuando hubo detección',
  },

  // ── Modal métodos PATCH (opcionales pluma) ──
  patch: {
    title: 'Agregar Método',
    allActive: 'Todos los métodos ya están activos.',
    close: 'Cerrar',
    back: '← Atrás',
    cancel: 'Cancelar',
    apply: 'Aplicar',
    configTitle: (label) => `Configurar ${label}`,
    optional: 'Opcional',
  },

  // ── Modal de configuración (⚙) ──
  settings: {
    title: 'Configuración',
    tabConexion: 'Conexión',
    tabCamaras: 'Cámaras',
    restore: 'Restaurar defaults',
    cancel: 'Cancelar',
    save: 'Guardar',
    addCamera: '+ Agregar cámara',
    saveCameras: 'Guardar cámaras',
    noCameras: 'No hay cámaras preset. Agregá una.',
    camName: 'Nombre',
    camNamePlaceholder: 'Pluma Muelle 1',
    camId: 'Camera ID',
    camIdPlaceholder: 'cam-pluma-01',
    camRtsp: 'RTSP',
    camRtspPlaceholder: 'rtsp://ip:port/.../live',
    plumaEnabled: 'Pluma (+ opcionales) por default',
    colisionEnabled: 'Colisión por default',
    collisionAlarmId: 'Collision Alarm ID',
    collisionAlarmPlaceholder: 'ALARM-001',
    cooldownNoDetect: 'Cooldown sin detección (seg)',
    cooldownDetect: 'Cooldown con detección (seg)',
    delete: 'Eliminar',
  },

  // ── Confirmación genérica ──
  confirm: {
    confirm: 'Confirmar',
    cancel: 'Cancelar',
  },
};

export default MESSAGES;
