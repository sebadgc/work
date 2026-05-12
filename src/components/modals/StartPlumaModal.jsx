import { useState } from 'react';
import { Modal, ModalFooter, Button, FormField } from '../common';

/**
 * Modal para configurar e iniciar pluma extendida.
 * Recibe la cámara y devuelve el config vía onConfirm.
 */
export default function StartPlumaModal({ camera, onConfirm, onClose }) {
  const [notDetectedCooldown, setNotDetectedCooldown] = useState(5);
  const [detectedCooldown, setDetectedCooldown] = useState(2);

  const handleConfirm = () => {
    onConfirm({
      not_detected_cooldown: notDetectedCooldown,
      detected_cooldown: detectedCooldown,
    });
  };

  return (
    <Modal
      onClose={onClose}
      title="Iniciar Pluma Extendida"
      subtitle={`${camera.name || camera.camera_id} — ${camera.camera_id}`}
    >
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
        <Button variant="default" size="md" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" size="md" onClick={handleConfirm}>Iniciar</Button>
      </ModalFooter>
    </Modal>
  );
}
