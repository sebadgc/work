import { useEffect } from 'react';
import { MESSAGES } from '../../config';
import './Modal.css';

/**
 * Modal overlay reutilizable.
 * Cierra con Escape, click en el overlay (afuera), o la X arriba a la derecha.
 *
 * @param {'wide'} [size] - 'wide' para contenido ancho (ej: imágenes grandes)
 */
export default function Modal({ children, onClose, title, subtitle, size }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content ${size === 'wide' ? 'modal-content--wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close"
          type="button"
          onClick={onClose}
          title={MESSAGES.modal.close}
          aria-label={MESSAGES.modal.close}
        >
          ×
        </button>
        {title && (
          <div className="modal-header">
            <h3 className="modal-title">{title}</h3>
            {subtitle && <p className="modal-subtitle">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/**
 * Footer del modal con botones alineados.
 */
export function ModalFooter({ children }) {
  return <div className="modal-footer">{children}</div>;
}
