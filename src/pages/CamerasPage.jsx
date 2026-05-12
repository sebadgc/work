import { useState, useCallback } from 'react';
import { cameraService } from '../api';
import { useAppContext } from '../context';
import { Button } from '../components/common';
import { CameraCard, CameraGrid } from '../components/cameras';
import { LogPanel } from '../components/logs';
import { AddCameraModal, PatchMethodModal } from '../components/modals';
import './CamerasPage.css';

/**
 * Página principal del módulo de cámaras.
 * 
 * Flujo: el usuario agrega cámaras manualmente → configura tipo + params → POST al backend.
 * Las cámaras viven en el estado local de la sesión.
 */
export default function CamerasPage() {
  const {
    devMode,
    cameras, registerCamera, unregisterCamera,
    cameraStates, activateCamera, deactivateCamera, addMethod,
    logsByCamera, addLog, clearLogs,
    startSimulatedLogs, stopSimulatedLogs,
    fileInputRef, handleFileInput, getObjectUrl, requestFile,
  } = useAppContext();

  const [selectedCameraId, setSelectedCameraId] = useState(null);

  // ── Modales ──
  const [showAddModal, setShowAddModal] = useState(false);
  const [patchModal, setPatchModal] = useState(null);

  // ── Agregar cámara (flujo unificado) ──
  const handleAddCamera = useCallback(async ({ cameraId, source, processorType, config }) => {
    // En dev, pedir archivo MP4 si no hay uno
    if (devMode) {
      await requestFile(cameraId);
    }

    const finalSource = devMode ? `file://${cameraId}.mp4` : source;

    addLog(cameraId, 'info', `Iniciando ${processorType === 'pluma_extendida' ? 'pluma extendida' : 'detección de colisión'}...`);

    // POST al backend (skip en dev)
    if (!devMode) {
      let res;
      if (processorType === 'pluma_extendida') {
        res = await cameraService.startPlumaExtendida(cameraId, finalSource, config);
      } else {
        res = await cameraService.startCollisionDetection(cameraId, finalSource, config);
      }
      if (!res.ok) {
        addLog(cameraId, 'error', `Error: ${res.error}`);
        setShowAddModal(false);
        return;
      }
    }

    // Registrar en estado local
    registerCamera(cameraId, source || finalSource, cameraId);
    activateCamera(cameraId, processorType, config);
    addLog(cameraId, 'info', `✓ Cámara activa — ${processorType === 'pluma_extendida' ? 'pluma extendida' : 'detección de colisión'}`);
    setSelectedCameraId(cameraId);

    if (devMode) startSimulatedLogs(cameraId, processorType);
    setShowAddModal(false);
  }, [devMode, addLog, registerCamera, activateCamera, startSimulatedLogs, requestFile]);

  // ── Detener cámara ──
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
    unregisterCamera(cameraId);
    addLog(cameraId, 'info', '✗ Cámara detenida y removida');
  }, [devMode, addLog, deactivateCamera, unregisterCamera, stopSimulatedLogs]);

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
  const existingIds = cameras.map(c => c.camera_id);

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
        {/* Toolbar */}
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

        {/* Grid o empty state */}
        {cameras.length === 0 ? (
          <div className="cameras-page__empty">
            <div className="cameras-page__empty-icon">◉</div>
            <p className="cameras-page__empty-title">No hay cámaras activas</p>
            <p className="cameras-page__empty-hint">
              Presioná "Agregar cámara" para iniciar un procesador con su camera_id y fuente RTSP.
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
                onSelect={setSelectedCameraId}
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
        onSelectCamera={setSelectedCameraId}
        onClearLogs={() => clearLogs(selectedCameraId)}
      />

      {/* Modales */}
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
          onClose={() => setPatchModal(null)}
        />
      )}
    </div>
  );
}
