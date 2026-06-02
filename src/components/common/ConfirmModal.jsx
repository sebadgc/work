import Modal, { ModalFooter } from './Modal';
import Button from './Button';

/**
 * Diálogo de confirmación genérico.
 *
 * @param {string} title
 * @param {string} message
 * @param {string} [confirmLabel='Confirmar']
 * @param {string} [cancelLabel='Cancelar']
 * @param {'danger'|'primary'} [variant='danger']
 * @param {function} onConfirm
 * @param {function} onClose
 */
export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onClose,
}) {
  return (
    <Modal onClose={onClose} title={title}>
      {message && (
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, margin: 'var(--space-2) 0 var(--space-4)' }}>
          {message}
        </p>
      )}
      <ModalFooter>
        <Button variant="default" size="md" onClick={onClose}>{cancelLabel}</Button>
        <Button variant={variant} size="md" onClick={onConfirm}>{confirmLabel}</Button>
      </ModalFooter>
    </Modal>
  );
}
