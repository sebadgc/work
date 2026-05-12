import { useState } from 'react';
import { Modal, ModalFooter, Button, FormField } from '../common';

/**
 * Modal para configurar e iniciar detección de colisión.
 */
export default function StartCollisionModal({ camera, onConfirm, onClose }) {
  const [collisionAlarmId, setCollisionAlarmId] = useState('');

  const handleConfirm = () => {
    onConfirm({
      collision_alarm_id: collisionAlarmId,
    });
  };

  return (
    <Modal
      onClose={onClose}
      title="Iniciar Detección de Colisión"
      subtitle={`${camera.name || camera.camera_id} — ${camera.camera_id}`}
    >
      <FormField
        label="Collision Alarm ID"
        value={collisionAlarmId}
        onChange={setCollisionAlarmId}
        type="text"
        required
        placeholder="ej: ALARM-001"
      />
      <ModalFooter>
        <Button variant="default" size="md" onClick={onClose}>Cancelar</Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleConfirm}
          disabled={!collisionAlarmId.trim()}
        >
          Iniciar
        </Button>
      </ModalFooter>
    </Modal>
  );
}
