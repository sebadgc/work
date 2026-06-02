import { useState } from 'react';
import { Modal, ModalFooter, Button } from '../common';
import { MESSAGES } from '../../config';
import './ActivateCameraModal.css';

const M = MESSAGES.activate;

/**
 * Modal de activación de una cámara preset. Permite elegir qué grupos de
 * detectores encender (Pluma + opcionales / Colisión). Prechequea según el preset.
 *
 * @param {object} preset - { id, name, rtsp, pluma:{enabled}, collision:{enabled} }
 * @param {function} onActivate - ({ pluma:boolean, collision:boolean }) => void
 * @param {function} onClose
 */
export default function ActivateCameraModal({ preset, onActivate, onClose }) {
  const [pluma, setPluma] = useState(preset.pluma?.enabled ?? true);
  const [collision, setCollision] = useState(preset.collision?.enabled ?? true);
  const canActivate = pluma || collision;

  return (
    <Modal
      onClose={onClose}
      title={M.title(preset.name || preset.id)}
      subtitle={preset.rtsp}
    >
      <p className="activate-hint">{M.hint}</p>
      <div className="activate-chips">
        <button
          type="button"
          className={`activate-chip ${pluma ? 'activate-chip--on' : ''}`}
          onClick={() => setPluma(v => !v)}
        >
          <span className="activate-chip__title">{M.pluma}</span>
          <small className="activate-chip__sub">{M.plumaSub}</small>
        </button>
        <button
          type="button"
          className={`activate-chip ${collision ? 'activate-chip--on' : ''}`}
          onClick={() => setCollision(v => !v)}
        >
          <span className="activate-chip__title">{M.colision}</span>
          <small className="activate-chip__sub">{M.colisionSub}</small>
        </button>
      </div>

      <ModalFooter>
        <Button variant="default" size="md" onClick={onClose}>{M.cancel}</Button>
        <Button variant="primary" size="md" disabled={!canActivate} onClick={() => onActivate({ pluma, collision })}>
          {M.confirm}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
