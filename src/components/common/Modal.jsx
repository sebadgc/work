import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MESSAGES } from '../../config';
import './Modal.css';

/**
 * Modal overlay reutilizable.
 * Cierra con Escape, click en el overlay (afuera), o la X arriba a la derecha.
 *
 * Se renderiza con un portal a document.body para que SIEMPRE cubra la pantalla,
 * aunque se declare dentro de un elemento con transform (que de otro modo
 * "contendría" el position:fixed y lo encerraría en ese recuadro).
 *
 * @param {'wide'} [size] - 'wide' para contenido ancho (ej: imágenes grandes)
 */
export default function Modal({ children, onClose, title, subtitle, size }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
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
    </div>,
    document.body,
  );
}

/**
 * Footer del modal con botones alineados.
 */
export function ModalFooter({ children }) {
  return <div className="modal-footer">{children}</div>;
}
