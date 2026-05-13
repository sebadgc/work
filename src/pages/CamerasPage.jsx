import { useState, useCallback, useRef, useEffect } from 'react';
import { cameraService } from '../api';
import { ENV } from '../config/app.config';
import { useAppContext } from '../context';
import { Button } from '../components/common';
import { CameraCard, CameraGrid } from '../components/cameras';
import { LogPanel } from '../components/logs';
import { AddCameraModal, PatchMethodModal } from '../components/modals';
import './CamerasPage.css';

export default function CamerasPage() {
  const {
    devMode,
    cameras, registerCamera, unregisterCamera,
    cameraStates, activateCamera, deactivateCamera, addMethod, removeMethod,
    logsByCamera, addLog, clearLogs,
    startLogStream, stopLogStream,
    fileInputRef, handleFileInput, getObjectUrl, requestFile,
  } = useAppContext();

  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [unreadCameras, setUnreadCameras] = useState([]);
  const prevLogCounts = useRef({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [patchModal, setPatchModal] = useState(null);

  // Wrapper para seleccionar cámara y limpiar su estado "no leído"
  const selectCamera = useCallback((camId) => {
    setSelectedCameraId(camId);
    setUnreadCameras(prev => prev.filter(id => id !== camId));
  }, []);

  // ── Agregar cámara ──
  const handleAddCamera = useCallback(async ({ cameraId, source, processorType, config }) => {
    let finalSource = source;

    if (devMode) {
      const file = await requestFile(cameraId);
      if (!file) return;
      finalSource = `${ENV.DEV_VIDEO_DIR}/${file.name}`;
    }

    const label = processorType === 'pluma_extendida' ? 'pluma extendida' : 'detección de colisión';
    addLog(cameraId, 'info', `Iniciando ${label} — source: ${finalSource}`);

    let res;
    if (processorType === 'pluma_extendida') {
      res = await cameraService.startPlumaExtendida(cameraId, finalSource, config);
    } else {
      res = await cameraService.startCollisionDetection(cameraId, finalSource, config);
    }
    if (!res.ok) {
      addLog(cameraId, 'error', `Error del backend: ${res.error}`);
      setShowAddModal(false);
      return;
    }
    addLog(cameraId, 'info', 'Backend respondió OK — procesador iniciado');

    registerCamera(cameraId, finalSource, cameraId);
    activateCamera(cameraId, processorType, config);
    setSelectedCameraId(cameraId);

    startLogStream(cameraId);
    addLog(cameraId, 'info', 'Conectado al stream de logs del backend');

    setShowAddModal(false);
  }, [devMode, addLog, registerCamera, activateCamera, startLogStream, requestFile]);

  // ── Detener cámara ──
  const handleDelete = useCallback(async (cameraId) => {
    addLog(cameraId, 'info', 'Enviando DELETE...');
    stopLogStream(cameraId);

    const res = await cameraService.deleteCamera(cameraId);
    if (!res.ok) {
      addLog(cameraId, 'error', `Error al detener: ${res.error}`);
      return;
    }
    addLog(cameraId, 'info', 'Backend respondió OK — procesador detenido');

    deactivateCamera(cameraId);
    unregisterCamera(cameraId);
  }, [addLog, deactivateCamera, unregisterCamera, stopLogStream]);

  // ── Activar método PATCH ──
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
  const selectedCamera = cameras.find(c => c.camera_id === selectedCameraId);
  const selectedLogs = logsByCamera[selectedCameraId] || [];
  const existingIds = cameras.map(c => c.camera_id);

  return (
    <div className="cameras-page">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/*"
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />

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

        {cameras.length === 0 ? (
          <div className="cameras-page__empty">
            <div className="cameras-page__empty-icon">◉</div>
            <p className="cameras-page__empty-title">No hay cámaras activas</p>
            <p className="cameras-page__empty-hint">
              Presioná "Agregar cámara" para iniciar un procesador con su camera_id y fuente.
            </p>
          </div>
        ) : (
          <CameraGrid>
            {cameras.map((cam) => (
              <CameraCard
                key={cam.camera_id}
                camera={cam}
                state={cameraStates[cam.camera_id]}
                isSelected={selectedCameraId === cam.camera_id}
                devMode={devMode}
                localVideoUrl={getObjectUrl(cam.camera_id)}
                onSelect={selectCamera}
                onDelete={handleDelete}
                onPatchMethod={(id) => setPatchModal(id)}
              />
            ))}
          </CameraGrid>
        )}
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
          devMode={devMode}
          existingCameraIds={existingIds}
          onConfirm={handleAddCamera}
          onClose={() => setShowAddModal(false)}
        />
      )}
      {patchModal && (
        <PatchMethodModal
          cameraId={patchModal}
          activeMethods={cameraStates[patchModal]?.activeMethods || []}
          onConfirm={(methodId, config) => confirmPatch(patchModal, methodId, config)}
          onToggleOff={(methodId) => handleToggleMethodOff(patchModal, methodId)}
          onClose={() => setPatchModal(null)}
        />
      )}
    </div>
  );
}
