import { useState, useCallback, useRef, useEffect } from 'react';
import { cameraService, snapshotsService } from '../api';
import { buildWhepUrl, PLUMA_PATCH_METHODS } from '../config';
import { useAppContext } from '../context';
import { Button, ConfirmModal, StatusDot, Modal, ModalFooter } from '../components/common';
import { CameraCard, CameraGrid } from '../components/cameras';
import { LogPanel } from '../components/logs';
import { AddCameraModal, PatchMethodModal, ActivateCameraModal } from '../components/modals';
import './CamerasPage.css';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export default function CamerasPage() {
  const {
    settings,
    presets,
    cameras, registerCamera, unregisterCamera,
    cameraStates, activateGroup, removeCamera, addMethod, removeMethod,
    logsByCamera, addLog, clearLogs, loadHistory,
    startLogStream, stopLogStream,
  } = useAppContext();

  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [unreadCameras, setUnreadCameras] = useState([]);
  const [stoppingIds, setStoppingIds] = useState([]);
  const [activatingIds, setActivatingIds] = useState([]);
  const prevLogCounts = useRef({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [patchModal, setPatchModal] = useState(null);
  const [activatePreset, setActivatePreset] = useState(null);
  const [confirmStop, setConfirmStop] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null);

  const selectCamera = useCallback((camId) => {
    setSelectedCameraId(camId);
    setUnreadCameras(prev => prev.filter(id => id !== camId));
  }, []);

  // Mantener siempre una cámara enfocada (la primera) y reparar si la actual se va.
  useEffect(() => {
    if (cameras.length === 0) {
      if (selectedCameraId !== null) setSelectedCameraId(null);
    } else if (!cameras.some(c => c.camera_id === selectedCameraId)) {
      setSelectedCameraId(cameras[0].camera_id);
    }
  }, [cameras, selectedCameraId]);

  // Al enfocar una cámara, cargar su historial de logs (archivos) para poder
  // scrollear días anteriores en el panel de la derecha.
  useEffect(() => {
    if (selectedCameraId) loadHistory(selectedCameraId);
  }, [selectedCameraId, loadHistory]);

  // Cierre local de una cámara: corta el SSE, saca la card (desmonta el feed
  // WebRTC → se deja de streamear el RTSP) y limpia el estado.
  const teardownCamera = useCallback((cameraId) => {
    stopLogStream(cameraId);
    removeCamera(cameraId);
    unregisterCamera(cameraId);
  }, [stopLogStream, removeCamera, unregisterCamera]);

  // ── Activar una cámara preset: orquesta los procesadores secuencialmente ──
  const handleActivate = useCallback(async (preset, { pluma, collision }) => {
    setActivatePreset(null);
    const id = preset.id;
    if (cameras.some(c => c.camera_id === id)) return;

    // Feed primero: registramos la cámara → aparece la card + el feed WebRTC.
    registerCamera(id, preset.rtsp, preset.name);
    setSelectedCameraId(id);
    setActivatingIds(prev => [...prev, id]);
    addLog(id, 'info', `Activando "${preset.name || id}"...`);

    let streamStarted = false;
    let lastError = null;

    // Intenta iniciar un procesador. Si falla y todavía no arrancamos nada (el
    // backend puede tenerla ya corriendo por su cuenta → 400 "already running"),
    // la damos de baja y reintentamos una vez.
    const tryStart = async (startFn, label) => {
      let res = await startFn();
      if (!res.ok && !streamStarted) {
        addLog(id, 'warn', `No pude iniciar ${label} (${res.error}). Intento detener y reiniciar la cámara...`);
        await cameraService.deleteCamera(id);
        await sleep(500);
        res = await startFn();
      }
      return res;
    };

    try {
      if (pluma) {
        addLog(id, 'info', 'POST start_pluma_extendida...');
        const res = await tryStart(
          () => cameraService.startPlumaExtendida(id, preset.rtsp, preset.pluma?.config || {}),
          'pluma',
        );
        if (res.ok) {
          activateGroup(id, 'pluma', preset.pluma?.config || {});
          if (!streamStarted) { startLogStream(id); streamStarted = true; }
          addLog(id, 'info', 'Pluma OK — activando opcionales...');
          await sleep(600); // dar tiempo a que el procesador quede listo
          for (const method of PLUMA_PATCH_METHODS) {
            // PATCH sin body: el opcional usa los defaults del backend (los cooldowns
            // ya viajan en start_pluma_extendida). Mandar config acá daba 422.
            const r = await cameraService.patchMethod(id, method.id);
            if (r.ok) { addMethod(id, method.id); addLog(id, 'info', `+ ${method.label}`); }
            else addLog(id, 'error', `Método ${method.label}: ${r.error}`);
            await sleep(150);
          }
        } else {
          lastError = res.error;
          addLog(id, 'error', `Pluma error: ${res.error}`);
        }
      }

      if (collision) {
        addLog(id, 'info', 'POST start_collision_detection...');
        const res = await tryStart(
          () => cameraService.startCollisionDetection(id, preset.rtsp, preset.collision?.config || {}),
          'colisión',
        );
        if (res.ok) {
          activateGroup(id, 'collision', preset.collision?.config || {});
          if (!streamStarted) { startLogStream(id); streamStarted = true; }
          addLog(id, 'info', 'Colisión OK');
        } else {
          lastError = res.error;
          addLog(id, 'error', `Colisión error: ${res.error}`);
        }
      }
    } finally {
      setActivatingIds(prev => prev.filter(x => x !== id));
      // Si no arrancó ningún detector, cerramos la card y avisamos al usuario.
      if (!streamStarted) {
        addLog(id, 'error', `No pude levantar la cámara. Error: ${lastError || 'desconocido'}`);
        teardownCamera(id);
        setErrorInfo({
          title: `No pude levantar la cámara ${id}`,
          message: `Intenté iniciarla (y reiniciarla) sin éxito. Hablá con el equipo de desarrollo.\n\nError: ${lastError || 'desconocido'}`,
        });
      }
    }
  }, [cameras, registerCamera, activateGroup, addMethod, addLog, startLogStream, teardownCamera]);

  // ── Agregar cámara ad-hoc (un solo procesador) ──
  const handleAddCamera = useCallback(async ({ cameraId, source, processorType, config }) => {
    const label = processorType === 'pluma_extendida' ? 'pluma extendida' : 'detección de colisión';
    addLog(cameraId, 'info', `Iniciando ${label} — source: ${source}`);

    const res = processorType === 'pluma_extendida'
      ? await cameraService.startPlumaExtendida(cameraId, source, config)
      : await cameraService.startCollisionDetection(cameraId, source, config);

    if (!res.ok) {
      addLog(cameraId, 'error', `Error del backend: ${res.error}`);
      setShowAddModal(false);
      return;
    }
    addLog(cameraId, 'info', 'Backend respondió OK — procesador iniciado');

    registerCamera(cameraId, source, cameraId);
    activateGroup(cameraId, processorType === 'pluma_extendida' ? 'pluma' : 'collision', config);
    setSelectedCameraId(cameraId);
    startLogStream(cameraId);
    setShowAddModal(false);
  }, [addLog, registerCamera, activateGroup, startLogStream]);

  // ── Detener cámara (DELETE total, tras confirmación) ──
  const handleDelete = useCallback(async (cameraId) => {
    setConfirmStop(null);
    setStoppingIds(prev => prev.includes(cameraId) ? prev : [...prev, cameraId]);
    addLog(cameraId, 'info', 'Enviando DELETE...');

    const res = await cameraService.deleteCamera(cameraId);
    const stopWaiting = () => setStoppingIds(prev => prev.filter(id => id !== cameraId));

    if (res.ok) {
      addLog(cameraId, 'info', 'Backend respondió OK — cámara detenida');
      teardownCamera(cameraId);
      stopWaiting();
      return;
    }

    // Si la cámara ya no existe en el backend, reconciliamos: cerramos igual el
    // feed local y sacamos la card (no tiene sentido seguir streameando el RTSP).
    const notFound = res.status === 404
      || /not\s*found|no\s*existe|no\s*encontrad|not\s*exist|unknown/i.test(res.error || '');
    if (notFound) {
      addLog(cameraId, 'warn', `La cámara ya no existía en el backend (${res.error}) — cerrando feed local`);
      teardownCamera(cameraId);
      stopWaiting();
      return;
    }

    // Otros errores: mantenemos la cámara para poder reintentar Detener.
    addLog(cameraId, 'error', `Error al detener: ${res.error}`);
    stopWaiting();
  }, [addLog, teardownCamera]);

  // ── Activar método PATCH (opcional de pluma) ──
  const confirmPatch = useCallback(async (cameraId, methodId, config) => {
    addLog(cameraId, 'info', `Enviando PATCH /${cameraId}/${methodId}...`);
    const res = await cameraService.patchMethod(cameraId, methodId, config);
    if (!res.ok) {
      addLog(cameraId, 'error', `Error PATCH: ${res.error}`);
      setPatchModal(null);
      return;
    }
    addLog(cameraId, 'info', `Backend respondió OK — método ${methodId} activo`);
    addMethod(cameraId, methodId);
    setPatchModal(null);
  }, [addLog, addMethod]);

  // ── Desactivar método PATCH ──
  const handleToggleMethodOff = useCallback(async (cameraId, methodId) => {
    addLog(cameraId, 'info', `Desactivando método: ${methodId}...`);
    const res = await cameraService.patchMethod(cameraId, methodId);
    if (!res.ok) {
      addLog(cameraId, 'error', `Error PATCH: ${res.error}`);
      return;
    }
    addLog(cameraId, 'info', `Backend respondió OK — método ${methodId} desactivado`);
    removeMethod(cameraId, methodId);
    setPatchModal(null);
  }, [addLog, removeMethod]);

  // ── Capturar snapshot manual (se guarda en disco vía el dev server) ──
  const handleCapture = useCallback(async (cameraId, imageUrl) => {
    if (!imageUrl) {
      addLog(cameraId, 'warn', 'No se pudo capturar el frame (sin video)');
      return;
    }
    const ok = await snapshotsService.saveManual({ camera: cameraId, dataUrl: imageUrl });
    addLog(cameraId, ok ? 'detection' : 'error',
      ok ? '⚑ Snapshot manual guardado' : 'No se pudo guardar el snapshot manual');
  }, [addLog]);

  // Detectar logs nuevos en cámaras que no estamos mirando
  useEffect(() => {
    Object.entries(logsByCamera).forEach(([camId, logs]) => {
      const prevCount = prevLogCounts.current[camId] || 0;
      if (logs.length > prevCount && camId !== selectedCameraId) {
        setUnreadCameras(prev => prev.includes(camId) ? prev : [...prev, camId]);
      }
      prevLogCounts.current[camId] = logs.length;
    });
  }, [logsByCamera, selectedCameraId]);

  // ── Derived ──
  const runningIds = cameras.map(c => c.camera_id);
  const selectedCamera = cameras.find(c => c.camera_id === selectedCameraId);
  const selectedLogs = logsByCamera[selectedCameraId] || [];
  const existingIds = Array.from(new Set([...runningIds, ...presets.map(p => p.id)]));

  return (
    <div className="cameras-page">
      <div className="cameras-page__main">
        <div className="cameras-page__toolbar">
          <Button variant="primary" size="md" onClick={() => setShowAddModal(true)}>
            + Agregar cámara
          </Button>
          <span className="cameras-page__count">
            {cameras.length === 0
              ? 'Sin cámaras activas'
              : `${cameras.length} cámara${cameras.length > 1 ? 's' : ''} activa${cameras.length > 1 ? 's' : ''}`}
          </span>
        </div>

        {presets.length > 0 && (
          <div className="cameras-page__panel">
            {presets.map((p) => {
              const on = runningIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  className={`cam-pill ${on ? 'cam-pill--on' : ''}`}
                  title={`${p.name || p.id} — ${on ? 'encendida' : 'apagada'}\n${p.rtsp}`}
                  onClick={() => (on ? selectCamera(p.id) : setActivatePreset(p))}
                >
                  <StatusDot status={on ? 'active' : 'inactive'} size="md" />
                  <span className="cam-pill__name">{p.name || p.id}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="cameras-page__scroll">
          {cameras.length > 0 ? (
            <CameraGrid showDivider={cameras.length > 1}>
              {cameras.map((cam) => (
                <CameraCard
                  key={cam.camera_id}
                  camera={cam}
                  state={cameraStates[cam.camera_id]}
                  isSelected={selectedCameraId === cam.camera_id}
                  isStopping={stoppingIds.includes(cam.camera_id)}
                  isActivating={activatingIds.includes(cam.camera_id)}
                  whepUrl={buildWhepUrl(settings.webrtcBaseUrl, cam.source)}
                  onSelect={selectCamera}
                  onDelete={(id) => setConfirmStop(id)}
                  onPatchMethod={(id) => setPatchModal(id)}
                  onCapture={handleCapture}
                />
              ))}
            </CameraGrid>
          ) : (
            <div className="cameras-page__empty">
              <p className="cameras-page__empty-title">No hay cámaras encendidas</p>
              <p className="cameras-page__empty-hint">
                Encendé una cámara del panel de arriba, o usá "+ Agregar cámara".
              </p>
            </div>
          )}
        </div>
      </div>

      <LogPanel
        logs={selectedLogs}
        selectedCameraId={selectedCameraId}
        selectedCameraName={selectedCamera?.name}
        allCameras={cameras}
        cameraStates={cameraStates}
        unreadCameras={unreadCameras}
        onSelectCamera={selectCamera}
        onClearLogs={() => clearLogs(selectedCameraId)}
      />

      {showAddModal && (
        <AddCameraModal
          existingCameraIds={existingIds}
          onConfirm={handleAddCamera}
          onClose={() => setShowAddModal(false)}
        />
      )}
      {activatePreset && (
        <ActivateCameraModal
          preset={activatePreset}
          onActivate={(groups) => handleActivate(activatePreset, groups)}
          onClose={() => setActivatePreset(null)}
        />
      )}
      {patchModal && (
        <PatchMethodModal
          cameraId={patchModal}
          activeMethods={cameraStates[patchModal]?.pluma?.methods || []}
          onConfirm={(methodId, config) => confirmPatch(patchModal, methodId, config)}
          onToggleOff={(methodId) => handleToggleMethodOff(patchModal, methodId)}
          onClose={() => setPatchModal(null)}
        />
      )}
      {confirmStop && (
        <ConfirmModal
          title={`¿Detener cámara ${confirmStop}?`}
          message="Se detienen TODOS sus detectores (pluma, opcionales y colisión). Para volver a tener solo uno, reactivá la cámara eligiendo el grupo."
          confirmLabel="Detener"
          variant="danger"
          onConfirm={() => handleDelete(confirmStop)}
          onClose={() => setConfirmStop(null)}
        />
      )}
      {errorInfo && (
        <Modal onClose={() => setErrorInfo(null)} title={errorInfo.title}>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-line', margin: 'var(--space-2) 0 var(--space-4)' }}>
            {errorInfo.message}
          </p>
          <ModalFooter>
            <Button variant="primary" size="md" onClick={() => setErrorInfo(null)}>Entendido</Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
