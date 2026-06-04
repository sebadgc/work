import { useState, useCallback, useEffect } from 'react';
import { cameraService } from '../api';
import { PLUMA_PATCH_METHODS, MESSAGES, START_DEFAULTS } from '../config';
import { useAppContext } from '../context';
import { Button, ConfirmModal, StatusDot, Modal, ModalFooter } from '../components/common';
import { MonitorCard } from '../components/cameras';
import { LogPanel } from '../components/logs';
import { ActivateCameraModal } from '../components/modals';
import './MonitorPage.css';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const M = MESSAGES;

const isAlreadyRunning = (res) =>
  /already[\s_-]*running|already[\s_-]*active|ya\s+est[áa]\s+(corriendo|activa|andando|en\s+ejecuci[óo]n)|en\s+ejecuci[óo]n/i
    .test(res.error || '');

/**
 * Módulo Monitoreo: versión simple de Cámaras, sin feed RTSP ni config.
 * Activás cámaras desde el panel de presets; cada una se muestra como recuadro
 * con sus procesadores + la última alarma del backend, y el log a la derecha.
 */
export default function MonitorPage() {
  const {
    settings,
    presets,
    cameras, registerCamera, unregisterCamera,
    cameraStates, activateGroup, removeCamera, addMethod,
    logsByCamera, unreadByCamera, setActiveCamera, addLog, clearLogs, loadHistory,
    startLogStream, stopLogStream,
  } = useAppContext();

  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [stoppingIds, setStoppingIds] = useState([]);
  const [activatingIds, setActivatingIds] = useState([]);
  const [activatePreset, setActivatePreset] = useState(null);
  const [confirmStop, setConfirmStop] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null);

  const selectCamera = useCallback((camId) => setSelectedCameraId(camId), []);

  useEffect(() => {
    if (cameras.length === 0) {
      if (selectedCameraId !== null) setSelectedCameraId(null);
    } else if (!cameras.some(c => c.camera_id === selectedCameraId)) {
      setSelectedCameraId(cameras[0].camera_id);
    }
  }, [cameras, selectedCameraId]);

  useEffect(() => {
    setActiveCamera(selectedCameraId);
    if (selectedCameraId) loadHistory(selectedCameraId);
  }, [selectedCameraId, loadHistory, setActiveCamera]);

  const teardownCamera = useCallback((cameraId) => {
    stopLogStream(cameraId);
    removeCamera(cameraId);
    unregisterCamera(cameraId);
  }, [stopLogStream, removeCamera, unregisterCamera]);

  // ── Activar cámara (mismo flujo que Cámaras, sin feed) ──
  const handleActivate = useCallback(async (preset, { pluma, collision }) => {
    setActivatePreset(null);
    const id = preset.id;
    if (cameras.some(c => c.camera_id === id)) return;

    const plumaCfg = preset.pluma?.config || START_DEFAULTS.pluma;
    const collisionCfg = preset.collision?.config || START_DEFAULTS.collision;

    registerCamera(id, preset.rtsp, preset.name);
    setSelectedCameraId(id);
    setActivatingIds(prev => [...prev, id]);
    addLog(id, 'info', M.log.activateStarting(preset.name || id));

    let streamStarted = false;
    let alreadyRunning = false;
    let lastError = null;

    const tryStart = async (startFn, label) => {
      let res = await startFn();
      if (res.ok) return { res, alreadyRunning: false };
      if (isAlreadyRunning(res)) {
        if (streamStarted) return { res: { ok: true }, alreadyRunning: false };
        return { res, alreadyRunning: true };
      }
      if (!streamStarted) {
        addLog(id, 'warn', M.log.retry(label, res.error));
        await cameraService.deleteCamera(id);
        await sleep(500);
        res = await startFn();
      }
      return { res, alreadyRunning: false };
    };

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
          () => cameraService.startPlumaExtendida(id, preset.rtsp, plumaCfg),
          M.cameraCard.badgePluma,
        );
        if (ar) {
          attachGroup('pluma', M.cameraCard.badgePluma);
        } else if (res.ok) {
          activateGroup(id, 'pluma', plumaCfg);
          if (!streamStarted) { startLogStream(id); streamStarted = true; }
          addLog(id, 'info', M.log.plumaOk);
          await sleep(600);
          for (const method of PLUMA_PATCH_METHODS) {
            const r = await cameraService.patchMethod(id, method.id, START_DEFAULTS.methods[method.id] || {});
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
          () => cameraService.startCollisionDetection(id, preset.rtsp, collisionCfg),
          M.cameraCard.badgeColision,
        );
        if (ar) {
          attachGroup('collision', M.cameraCard.badgeColision);
        } else if (res.ok) {
          activateGroup(id, 'collision', collisionCfg);
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
        addLog(id, 'error', M.log.activateFail(lastError));
        teardownCamera(id);
        setErrorInfo({ title: M.errors.activateFailTitle(id), message: M.errors.activateFailMsg(lastError) });
      } else if (alreadyRunning) {
        setErrorInfo({ title: M.errors.alreadyRunningTitle, message: M.errors.alreadyRunningMsg });
      }
    }
  }, [cameras, registerCamera, activateGroup, addMethod, addLog, startLogStream, teardownCamera]);

  // ── Detener cámara (igual que Cámaras) ──
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
    const notFound = res.status === 404
      || /not\s*found|no\s*existe|no\s*encontrad|not\s*exist/i.test(res.error || '');
    if (notFound) {
      addLog(cameraId, 'warn', M.log.delNotFound(res.error));
      teardownCamera(cameraId);
      stopWaiting();
      return;
    }
    const connFail = res.status === 0
      || /failed to fetch|networkerror|network error|load failed/i.test(res.error || '');
    if (connFail) {
      addLog(cameraId, 'error', M.log.delConnFail(res.error));
      teardownCamera(cameraId);
      stopWaiting();
      setErrorInfo({ title: M.errors.backendDownTitle, message: M.errors.backendDownMsg });
      return;
    }
    addLog(cameraId, 'error', M.log.delError(res.error));
    stopWaiting();
  }, [addLog, teardownCamera]);

  // ── Derived ──
  const runningIds = cameras.map(c => c.camera_id);
  const selectedCamera = cameras.find(c => c.camera_id === selectedCameraId);
  const selectedLogs = logsByCamera[selectedCameraId] || [];

  return (
    <div className="monitor-page">
      <div className="monitor-page__main">
        {presets.length > 0 && (
          <div className="monitor-page__panel">
            {presets.map((p) => {
              const on = runningIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  className={`cam-pill ${on ? 'cam-pill--on' : ''}`}
                  title={p.name || p.id}
                  onClick={() => (on ? selectCamera(p.id) : setActivatePreset(p))}
                >
                  <StatusDot status={on ? 'active' : 'inactive'} size="md" />
                  <span className="cam-pill__name">{p.name || p.id}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="monitor-page__scroll">
          {cameras.length > 0 ? (
            <div className="monitor-grid">
              {cameras.map((cam) => (
                <MonitorCard
                  key={cam.camera_id}
                  camera={cam}
                  state={cameraStates[cam.camera_id]}
                  isSelected={selectedCameraId === cam.camera_id}
                  isStopping={stoppingIds.includes(cam.camera_id)}
                  snapshotsRoot={settings.snapshotsRoot || ''}
                  logs={logsByCamera[cam.camera_id] || []}
                  onSelect={selectCamera}
                  onDelete={(id) => setConfirmStop(id)}
                />
              ))}
            </div>
          ) : (
            <div className="monitor-page__empty">
              <p className="monitor-page__empty-title">{M.monitor.emptyTitle}</p>
              <p className="monitor-page__empty-hint">{M.monitor.emptyHint}</p>
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

      {activatePreset && (
        <ActivateCameraModal
          preset={activatePreset}
          onActivate={(groups) => handleActivate(activatePreset, groups)}
          onClose={() => setActivatePreset(null)}
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
