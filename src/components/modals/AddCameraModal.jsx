import { useState } from 'react';
import { Modal, ModalFooter, Button, FormField } from '../common';
import { MESSAGES } from '../../config';

const M = MESSAGES.addCamera;

/**
 * Modal unificado para agregar una cámara.
 * Paso 1: Camera ID + Source (RTSP) + tipo de procesador
 * Paso 2: Configuración específica del procesador elegido
 */
export default function AddCameraModal({ existingCameraIds, onConfirm, onClose }) {
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
  const step1Valid = cameraId.trim() && source.trim() && !idTaken;

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
      <Modal onClose={onClose} title={M.title} subtitle={M.subtitle}>
        <FormField
          label={M.cameraId}
          value={cameraId}
          onChange={setCameraId}
          type="text"
          required
          placeholder={M.cameraIdPlaceholder}
          hint={idTaken ? M.cameraIdTaken : M.cameraIdHint}
        />
        <FormField
          label={M.source}
          value={source}
          onChange={setSource}
          type="text"
          required
          placeholder={M.sourcePlaceholder}
          hint={M.sourceHint}
        />
        <FormField
          label={M.processorType}
          value={processorType}
          onChange={setProcessorType}
          options={[
            { value: 'pluma_extendida', label: M.optPluma },
            { value: 'collision_detection', label: M.optColision },
          ]}
        />
        <ModalFooter>
          <Button variant="default" size="md" onClick={onClose}>{M.cancel}</Button>
          <Button variant="primary" size="md" onClick={handleNext} disabled={!step1Valid}>
            {M.next}
          </Button>
        </ModalFooter>
      </Modal>
    );
  }

  // ── Step 2 ──
  return (
    <Modal
      onClose={onClose}
      title={processorType === 'pluma_extendida' ? M.configPluma : M.configColision}
      subtitle={`${cameraId}${source ? ` — ${source}` : ''}`}
    >
      {processorType === 'collision_detection' && (
        <FormField
          label={M.collisionAlarmId}
          value={collisionAlarmId}
          onChange={setCollisionAlarmId}
          type="text"
          required
          placeholder={M.collisionAlarmPlaceholder}
        />
      )}
      <FormField
        label={M.cooldownNoDetect}
        value={notDetectedCooldown}
        onChange={setNotDetectedCooldown}
        type="number"
        min={1}
        required
        hint={M.cooldownNoDetectHint}
      />
      <FormField
        label={M.cooldownDetect}
        value={detectedCooldown}
        onChange={setDetectedCooldown}
        type="number"
        min={1}
        required
        hint={M.cooldownDetectHint}
      />

      <ModalFooter>
        <Button variant="ghost" size="md" onClick={handleBack}>{M.back}</Button>
        <Button variant="default" size="md" onClick={onClose}>{M.cancel}</Button>
        <Button variant="primary" size="md" onClick={handleConfirm} disabled={!step2Valid}>
          {M.start}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
