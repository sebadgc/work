import { useState, useCallback, useEffect } from 'react';
import { cameraService, snapshotsService } from '../api';
import { buildWhepUrl, PLUMA_PATCH_METHODS, MESSAGES } from '../config';
import { useAppContext } from '../context';
import { Button, ConfirmModal, StatusDot, Modal, ModalFooter } from '../components/common';
import { CameraCard, CameraGrid } from '../components/cameras';
import { LogPanel } from '../components/logs';
import { AddCameraModal, PatchMethodModal, ActivateCameraModal } from '../components/modals';
import './CamerasPage.css';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const M = MESSAGES;

// El backend ya tiene la cámara corriendo (no hay que reiniciarla ni patchear).
const isAlreadyRunning = (res) =>
  /already\s*running|already\s*exists?|ya\s*(est|corr|ejecut|and)|en\s*ejecuci/i.test(res.error || '');

export default function CamerasPage() {
  const {
    settings,
    presets,
    cameras, registerCamera, unregisterCamera,
    cameraStates, activateGroup, removeCamera, addMethod, removeMethod,
    logsByCamera, unreadByCamera, setActiveCamera, addLog, clearLogs, loadHistory,
    startLogStream, stopLogStream,
  } = useAppContext();

  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [stoppingIds, setStoppingIds] = useState([]);
  const [activatingIds, setActivatingIds] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [patchModal, setPatchModal] = useState(null);
  const [activatePreset, setActivatePreset] = useState(null);
  const [confirmStop, setConfirmStop] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null);

  const selectCamera = useCallback((camId) => {
    setSelectedCameraId(camId);
  }, []);

  // Mantener siempre una cámara enfocada (la primera) y reparar si la actual se va.
  useEffect(() => {
    if (cameras.length === 0) {
      if (selectedCameraId !== null) setSelectedCameraId(null);
    } else if (!cameras.some(c => c.camera_id === selectedCameraId)) {
      setSelectedCameraId(cameras[0].camera_id);
    }
  }, [cameras, selectedCameraId]);

  // Al enfocar una cámara: marcarla como activa (resetea su contador de sin-ver)
  // y cargar su historial de logs (archivos) para scrollear días anteriores.
  useEffect(() => {
    setActiveCamera(selectedCameraId);
    if (selectedCameraId) loadHistory(selectedCameraId);
  }, [selectedCameraId, loadHistory, setActiveCamera]);

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
    addLog(id, 'info', M.log.activateStarting(preset.name || id));

    let streamStarted = false;
    let alreadyRunning = false;
    let lastError = null;

    // Intenta iniciar un procesador.
    //  - Si el backend dice "already running" → NO reiniciar ni patchear: se retoma la señal.
    //  - Si falla por otra cosa y todavía no arrancamos nada → delete + reintento una vez.
    const tryStart = async (startFn, label) => {
      let res = await startFn();
      if (!res.ok && isAlreadyRunning(res)) {
        return { res, alreadyRunning: true };
      }
      if (!res.ok && !streamStarted) {
        addLog(id, 'warn', M.log.retry(label, res.error));
        await cameraService.deleteCamera(id);
        await sleep(500);
        res = await startFn();
      }
      return { res, alreadyRunning: false };
    };

    // Adjuntar a un grupo que ya corría en el server (marcar activo + retomar logs/feed).
    const attachGroup = (group, label) => {
      alreadyRunning = true;
      activateGroup(id, group, preset[group]?.config || {});
      if (!streamStarted) { startLogStream(id); streamStarted = true; }
      addLog(id, 'warn', M.log.alreadyRunningGroup(label));
    };

    try {
      if (pluma) {
        addLog(id, 'info', M.log.postPluma);
        const { res, alreadyRunning: ar } = await tryStart(
          () => cameraService.startPlumaExtendida(id, preset.rtsp, preset.pluma?.config || {}),
          M.cameraCard.badgePluma,
        );
        if (ar) {
          attachGroup('pluma', M.cameraCard.badgePluma);
        } else if (res.ok) {
          activateGroup(id, 'pluma', preset.pluma?.config || {});
          if (!streamStarted) { startLogStream(id); streamStarted = true; }
          addLog(id, 'info', M.log.plumaOk);
          await sleep(600); // dar tiempo a que el procesador quede listo
          for (const method of PLUMA_PATCH_METHODS) {
            // PATCH sin body: el opcional usa los defaults del backend (los cooldowns
            // ya viajan en start_pluma_extendida). Mandar config acá daba 422.
            const r = await cameraService.patchMethod(id, method.id);
            if (r.ok) { addMethod(id, method.id); addLog(id, 'info', M.log.methodOk(method.label)); }
            else addLog(id, 'error', M.log.methodError(method.label, r.error));
            await sleep(150);
          }
        } else {
          lastError = res.error;
          addLog(id, 'error', M.log.plumaError(res.error));
        }
      }

      if (collision) {
        addLog(id, 'info', M.log.postCollision);
        const { res, alreadyRunning: ar } = await tryStart(
          () => cameraService.startCollisionDetection(id, preset.rtsp, preset.collision?.config || {}),
          M.cameraCard.badgeColision,
        );
        if (ar) {
          attachGroup('collision', M.cameraCard.badgeColision);
        } else if (res.ok) {
          activateGroup(id, 'collision', preset.collision?.config || {});
          if (!streamStarted) { startLogStream(id); streamStarted = true; }
          addLog(id, 'info', M.log.collisionOk);
        } else {
          lastError = res.error;
          addLog(id, 'error', M.log.collisionError(res.error));
        }
      }
    } finally {
      setActivatingIds(prev => prev.filter(x => x !== id));
      if (!streamStarted) {
        // No arrancó ningún detector: cerramos la card y avisamos.
        addLog(id, 'error', M.log.activateFail(lastError));
        teardownCamera(id);
        setErrorInfo({
          title: M.errors.activateFailTitle(id),
          message: M.errors.activateFailMsg(lastError),
        });
      } else if (alreadyRunning) {
        // Ya estaba corriendo en el server: se retomó la señal.
        setErrorInfo({
          title: M.errors.alreadyRunningTitle,
          message: M.errors.alreadyRunningMsg,
        });
      }
    }
  }, [cameras, registerCamera, activateGroup, addMethod, addLog, startLogStream, teardownCamera]);

  // ── Agregar cámara ad-hoc (un solo procesador) ──
  const handleAddCamera = useCallback(async ({ cameraId, source, processorType, config }) => {
    const label = processorType === 'pluma_extendida' ? M.log.procPluma : M.log.procColision;
    addLog(cameraId, 'info', M.log.adhocStarting(label, source));

    const res = processorType === 'pluma_extendida'
      ? await cameraService.startPlumaExtendida(cameraId, source, config)
      : await cameraService.startCollisionDetection(cameraId, source, config);

    if (!res.ok) {
      addLog(cameraId, 'error', M.log.adhocBackendError(res.error));
      setShowAddModal(false);
      return;
    }
    addLog(cameraId, 'info', M.log.adhocOk);

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
    addLog(cameraId, 'info', M.log.delSending);

    const res = await cameraService.deleteCamera(cameraId);
    const stopWaiting = () => setStoppingIds(prev => prev.filter(id => id !== cameraId));

    if (res.ok) {
      addLog(cameraId, 'info', M.log.delOk);
      teardownCamera(cameraId);
      stopWaiting();
      return;
    }

    // Si la cámara ya no existe en el backend, reconciliamos: cerramos igual el feed local.
    const notFound = res.status === 404
      || /not\s*found|no\s*existe|no\s*encontrad|not\s*exist|unknown/i.test(res.error || '');
    if (notFound) {
      addLog(cameraId, 'warn', M.log.delNotFound(res.error));
      teardownCamera(cameraId);
      stopWaiting();
      return;
    }

    // Backend caído / sin conexión: cerramos el video igual y avisamos.
    const connFail = res.status === 0
      || /failed to fetch|networkerror|network error|load failed/i.test(res.error || '');
    if (connFail) {
      addLog(cameraId, 'error', M.log.delConnFail(res.error));
      teardownCamera(cameraId);
      stopWaiting();
      setErrorInfo({ title: M.errors.backendDownTitle, message: M.errors.backendDownMsg });
      return;
    }

    // Otros errores: mantenemos la cámara para poder reintentar Detener.
    addLog(cameraId, 'error', M.log.delError(res.error));
    stopWaiting();
  }, [addLog, teardownCamera]);

  // ── Activar método PATCH (opcional de pluma) ──
  const confirmPatch = useCallback(async (cameraId, methodId, config) => {
    addLog(cameraId, 'info', M.log.patchSending(cameraId, methodId));
    const res = await cameraService.patchMethod(cameraId, methodId, config);
    if (!res.ok) {
      addLog(cameraId, 'error', M.log.patchError(res.error));
      setPatchModal(null);
      return;
    }
    addLog(cameraId, 'info', M.log.patchOk(methodId));
    addMethod(cameraId, methodId);
    setPatchModal(null);
  }, [addLog, addMethod]);

  // ── Desactivar método PATCH ──
  const handleToggleMethodOff = useCallback(async (cameraId, methodId) => {
    addLog(cameraId, 'info', M.log.patchDisabling(methodId));
    const res = await cameraService.patchMethod(cameraId, methodId);
    if (!res.ok) {
      addLog(cameraId, 'error', M.log.patchError(res.error));
      return;
    }
    addLog(cameraId, 'info', M.log.patchOffOk(methodId));
    removeMethod(cameraId, methodId);
    setPatchModal(null);
  }, [addLog, removeMethod]);

  // ── Capturar snapshot manual (se guarda en disco vía el dev server) ──
  const handleCapture = useCallback(async (cameraId, imageUrl) => {
    if (!imageUrl) {
      addLog(cameraId, 'warn', M.log.captureNoVideo);
      return;
    }
    const ok = await snapshotsService.saveManual({ camera: cameraId, dataUrl: imageUrl });
    addLog(cameraId, ok ? 'detection' : 'error', ok ? M.log.captureOk : M.log.captureFail);
  }, [addLog]);

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
            {M.cameras.addCamera}
          </Button>
          <span className="cameras-page__count">
            {cameras.length === 0 ? M.cameras.noneActive : M.cameras.countActive(cameras.length)}
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
                  title={M.cameras.pillTitle(p.name || p.id, on, p.rtsp)}
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
              <p className="cameras-page__empty-title">{M.cameras.emptyTitle}</p>
              <p className="cameras-page__empty-hint">{M.cameras.emptyHint}</p>
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
        unreadByCamera={unreadByCamera}
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
          title={M.stopConfirm.title(confirmStop)}
          message={M.stopConfirm.message}
          confirmLabel={M.stopConfirm.confirm}
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
            <Button variant="primary" size="md" onClick={() => setErrorInfo(null)}>{M.errors.ok}</Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
