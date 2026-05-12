import { useState } from 'react';
import { Modal, ModalFooter, Button, FormField } from '../common';

/**
 * Modal unificado para agregar una cámara.
 * 
 * Paso 1: Camera ID + Source (RTSP, solo en producción) + tipo de procesador
 * Paso 2: Configuración específica del procesador elegido
 * 
 * Collision config requiere: collision_alarm_id + not_detected_cooldown + detected_cooldown
 * Pluma config requiere: not_detected_cooldown + detected_cooldown
 */
export default function AddCameraModal({ devMode, existingCameraIds, onConfirm, onClose }) {
  const [step, setStep] = useState(1);

  // Step 1
  const [cameraId, setCameraId] = useState('');
  const [source, setSource] = useState('');
  const [processorType, setProcessorType] = useState('pluma_extendida');

  // Step 2 - Shared cooldowns
  const [notDetectedCooldown, setNotDetectedCooldown] = useState(5);
  const [detectedCooldown, setDetectedCooldown] = useState(2);

  // Step 2 - Collision specific
  const [collisionAlarmId, setCollisionAlarmId] = useState('');

  const idTaken = existingCameraIds.includes(cameraId.trim());
  const step1Valid = cameraId.trim() && (devMode || source.trim()) && !idTaken;

  const handleNext = () => setStep(2);
  const handleBack = () => setStep(1);

  const handleConfirm = () => {
    const config = processorType === 'pluma_extendida'
      ? { not_detected_cooldown: notDetectedCooldown, detected_cooldown: detectedCooldown }
      : {
          collision_alarm_id: collisionAlarmId,
          not_detected_cooldown: notDetectedCooldown,
          detected_cooldown: detectedCooldown,
        };

    onConfirm({
      cameraId: cameraId.trim(),
      source: source.trim(),
      processorType,
      config,
    });
  };

  const step2Valid = processorType === 'pluma_extendida'
    ? notDetectedCooldown > 0 && detectedCooldown > 0
    : collisionAlarmId.trim().length > 0 && notDetectedCooldown > 0 && detectedCooldown > 0;

  // ── Step 1 ──
  if (step === 1) {
    return (
      <Modal onClose={onClose} title="Agregar Cámara" subtitle="Configurar nueva instancia de cámara">
        <FormField
          label="Camera ID"
          value={cameraId}
          onChange={setCameraId}
          type="text"
          required
          placeholder="ej: cam-pluma-01"
          hint={idTaken ? '⚠ Este ID ya está en uso' : 'Identificador único de la cámara en el backend'}
        />
        {!devMode && (
          <FormField
            label="Source (RTSP URL)"
            value={source}
            onChange={setSource}
            type="text"
            required
            placeholder="rtsp://ip:port/id/live"
            hint="URL del feed RTSP de la cámara"
          />
        )}
        <FormField
          label="Tipo de procesamiento"
          value={processorType}
          onChange={setProcessorType}
          options={[
            { value: 'pluma_extendida', label: 'Pluma Extendida' },
            { value: 'collision_detection', label: 'Detección de Colisión' },
          ]}
        />
        <ModalFooter>
          <Button variant="default" size="md" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" size="md" onClick={handleNext} disabled={!step1Valid}>
            Siguiente →
          </Button>
        </ModalFooter>
      </Modal>
    );
  }

  // ── Step 2 ──
  return (
    <Modal
      onClose={onClose}
      title={processorType === 'pluma_extendida' ? 'Config — Pluma Extendida' : 'Config — Detección de Colisión'}
      subtitle={`${cameraId}${source ? ` — ${source}` : ''}`}
    >
      {processorType === 'collision_detection' && (
        <FormField
          label="Collision Alarm ID"
          value={collisionAlarmId}
          onChange={setCollisionAlarmId}
          type="text"
          required
          placeholder="ej: ALARM-001"
        />
      )}
      <FormField
        label="Cooldown sin detección (seg)"
        value={notDetectedCooldown}
        onChange={setNotDetectedCooldown}
        type="number"
        min={1}
        required
        hint="Tiempo en segundos para volver a verificar cuando no hay detección"
      />
      <FormField
        label="Cooldown con detección (seg)"
        value={detectedCooldown}
        onChange={setDetectedCooldown}
        type="number"
        min={1}
        required
        hint="Tiempo en segundos para volver a verificar cuando hubo detección"
      />

      <ModalFooter>
        <Button variant="ghost" size="md" onClick={handleBack}>← Atrás</Button>
        <Button variant="default" size="md" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" size="md" onClick={handleConfirm} disabled={!step2Valid}>
          Iniciar cámara
        </Button>
      </ModalFooter>
    </Modal>
  );
}
