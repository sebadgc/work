import { useState, useEffect, useCallback } from 'react';
import { cameraService } from '../api';
import { useAppContext } from '../context';
import { CameraCard, CameraGrid } from '../components/cameras';
import { LogPanel } from '../components/logs';
import { StartPlumaModal, StartCollisionModal, PatchMethodModal } from '../components/modals';
import './CamerasPage.css';

/**
 * Página principal del módulo de cámaras.
 * Usa AppContext para estado compartido.
 * No inventa datos: las cámaras se obtienen del backend.
 */
export default function CamerasPage() {
  const {
    devMode,
    cameras, setCameras,
    cameraStates, activateCamera, deactivateCamera, addMethod,
    logsByCamera, addLog, clearLogs,
    startSimulatedLogs, stopSimulatedLogs,
    fileInputRef, handleFileInput, getObjectUrl, hasFile, requestFile,
  } = useAppContext();

  const [loadingCameras, setLoadingCameras] = useState(true);
  const [selectedCameraId, setSelectedCameraId] = useState(null);

  // ── Modales ──
  const [plumaModal, setPlumaModal] = useState(null);
  const [collisionModal, setCollisionModal] = useState(null);
  const [patchModal, setPatchModal] = useState(null);

  // ── Fetch cámaras del backend ──
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingCameras(true);
      const res = await cameraService.fetchCameras();
      if (cancelled) return;
      if (res.ok && Array.isArray(res.data)) {
        setCameras(res.data);
      } else {
        addLog('SYSTEM', 'error', `No se pudieron obtener cámaras: ${res.error || 'sin respuesta'}`);
        setCameras([]);
      }
      setLoadingCameras(false);
    }
    load();
    return () => { cancelled = true; };
  }, [setCameras, addLog]);

  // ── Start pluma extendida ──
  const handleStartPluma = useCallback(async (camera) => {
    if (devMode && !hasFile(camera.camera_id)) {
      const file = await requestFile(camera.camera_id);
      if (!file) return;
    }
    setPlumaModal(camera);
  }, [devMode, hasFile, requestFile]);

  const confirmPluma = useCallback(async (camera, config) => {
    const source = devMode ? `file://${camera.camera_id}.mp4` : camera.source;
    addLog(camera.camera_id, 'info', `Iniciando pluma extendida — cooldowns: ${config.not_detected_cooldown}s / ${config.detected_cooldown}s`);

    if (!devMode) {
      const res = await cameraService.startPlumaExtendida(camera.camera_id, source, config);
      if (!res.ok) {
        addLog(camera.camera_id, 'error', `Error: ${res.error}`);
        setPlumaModal(null);
        return;
      }
    }

    activateCamera(camera.camera_id, 'pluma_extendida', config);
    addLog(camera.camera_id, 'info', '✓ Cámara activa — pluma extendida');
    setSelectedCameraId(camera.camera_id);
    if (devMode) startSimulatedLogs(camera.camera_id, 'pluma_extendida');
    setPlumaModal(null);
  }, [devMode, addLog, activateCamera, startSimulatedLogs]);

  // ── Start collision detection ──
  const handleStartCollision = useCallback(async (camera) => {
    if (devMode && !hasFile(camera.camera_id)) {
      const file = await requestFile(camera.camera_id);
      if (!file) return;
    }
    setCollisionModal(camera);
  }, [devMode, hasFile, requestFile]);

  const confirmCollision = useCallback(async (camera, config) => {
    const source = devMode ? `file://${camera.camera_id}.mp4` : camera.source;
    addLog(camera.camera_id, 'info', `Iniciando detección de colisión — alarm: ${config.collision_alarm_id}`);

    if (!devMode) {
      const res = await cameraService.startCollisionDetection(camera.camera_id, source, config);
      if (!res.ok) {
        addLog(camera.camera_id, 'error', `Error: ${res.error}`);
        setCollisionModal(null);
        return;
      }
    }

    activateCamera(camera.camera_id, 'collision_detection', config);
    addLog(camera.camera_id, 'info', '✓ Cámara activa — detección de colisión');
    setSelectedCameraId(camera.camera_id);
    if (devMode) startSimulatedLogs(camera.camera_id, 'collision_detection');
    setCollisionModal(null);
  }, [devMode, addLog, activateCamera, startSimulatedLogs]);

  // ── Delete camera ──
  const handleDelete = useCallback(async (cameraId) => {
    addLog(cameraId, 'warn', 'Deteniendo cámara...');
    if (!devMode) {
      const res = await cameraService.deleteCamera(cameraId);
      if (!res.ok) {
        addLog(cameraId, 'error', `Error al detener: ${res.error}`);
        return;
      }
    }
    stopSimulatedLogs(cameraId);
    deactivateCamera(cameraId);
    addLog(cameraId, 'info', '✗ Cámara detenida');
  }, [devMode, addLog, deactivateCamera, stopSimulatedLogs]);

  // ── Patch method ──
  const confirmPatch = useCallback(async (cameraId, methodId, config) => {
    addLog(cameraId, 'info', `Agregando método: ${methodId}`);
    if (!devMode) {
      const res = await cameraService.patchMethod(cameraId, methodId, config);
      if (!res.ok) {
        addLog(cameraId, 'error', `Error PATCH: ${res.error}`);
        setPatchModal(null);
        return;
      }
    }
    addMethod(cameraId, methodId);
    addLog(cameraId, 'info', `✓ Método activo: ${methodId}`);
    if (devMode) startSimulatedLogs(cameraId, methodId);
    setPatchModal(null);
  }, [devMode, addLog, addMethod, startSimulatedLogs]);

  // ── Derived ──
  const selectedCamera = cameras.find(c => c.camera_id === selectedCameraId);
  const selectedLogs = logsByCamera[selectedCameraId] || [];

  return (
    <div className="cameras-page">
      {/* File input oculto para modo dev */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/*"
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />

      <div className="cameras-page__main">
        <CameraGrid loading={loadingCameras}>
          {cameras.map((cam) => (
            <CameraCard
              key={cam.camera_id}
              camera={cam}
              state={cameraStates[cam.camera_id]}
              isSelected={selectedCameraId === cam.camera_id}
              devMode={devMode}
              localVideoUrl={getObjectUrl(cam.camera_id)}
              onSelect={setSelectedCameraId}
              onStartPluma={handleStartPluma}
              onStartCollision={handleStartCollision}
              onDelete={handleDelete}
              onPatchMethod={(id) => setPatchModal(id)}
            />
          ))}
        </CameraGrid>
      </div>

      <LogPanel
        logs={selectedLogs}
        selectedCameraId={selectedCameraId}
        selectedCameraName={selectedCamera?.name}
        allCameras={cameras}
        cameraStates={cameraStates}
        onSelectCamera={setSelectedCameraId}
        onClearLogs={() => clearLogs(selectedCameraId)}
      />

      {/* Modales */}
      {plumaModal && (
        <StartPlumaModal
          camera={plumaModal}
          onConfirm={(config) => confirmPluma(plumaModal, config)}
          onClose={() => setPlumaModal(null)}
        />
      )}
      {collisionModal && (
        <StartCollisionModal
          camera={collisionModal}
          onConfirm={(config) => confirmCollision(collisionModal, config)}
          onClose={() => setCollisionModal(null)}
        />
      )}
      {patchModal && (
        <PatchMethodModal
          cameraId={patchModal}
          activeMethods={cameraStates[patchModal]?.activeMethods || []}
          onConfirm={(methodId, config) => confirmPatch(patchModal, methodId, config)}
          onClose={() => setPatchModal(null)}
        />
      )}
    </div>
  );
}
