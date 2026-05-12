import { useEffect } from 'react';
import './Modal.css';

/**
 * Modal overlay reutilizable.
 * Cierra con Escape o click en overlay.
 */
export default function Modal({ children, onClose, title, subtitle }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
