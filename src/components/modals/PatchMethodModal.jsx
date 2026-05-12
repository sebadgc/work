import { useState } from 'react';
import { Modal, ModalFooter, Button, FormField } from '../common';
import { PLUMA_PATCH_METHODS, BASE_COOLDOWN_FIELDS } from '../../config';
import './PatchMethodModal.css';

/**
 * Modal para agregar métodos de análisis a una cámara con pluma extendida.
 * 
 * Paso 1: Seleccionar método disponible
 * Paso 2: Configurar campos específicos + cooldowns heredados
 * 
 * @param {string} cameraId
 * @param {string[]} activeMethods - métodos ya activos
 * @param {function} onConfirm - (methodId, config) => void
 * @param {function} onClose
 */
export default function PatchMethodModal({ cameraId, activeMethods, onConfirm, onClose }) {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [config, setConfig] = useState({});

  const availableMethods = PLUMA_PATCH_METHODS.filter(
    m => !activeMethods.includes(m.id)
  );

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleConfirm = () => {
    // Limpiar campos vacíos
    const cleanConfig = {};
    Object.entries(config).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) {
        cleanConfig[k] = v;
      }
    });
    onConfirm(selectedMethod.id, cleanConfig);
  };

  const handleBack = () => {
    setSelectedMethod(null);
    setConfig({});
  };

  // ── Paso 1: Selección de método ──
  if (!selectedMethod) {
    return (
      <Modal onClose={onClose} title="Agregar Método" subtitle={cameraId}>
        {availableMethods.length === 0 ? (
          <p className="patch-modal__empty">Todos los métodos ya están activos.</p>
        ) : (
          <div className="patch-modal__method-list">
            {availableMethods.map(method => (
              <button
                key={method.id}
                className="patch-modal__method-item"
                onClick={() => setSelectedMethod(method)}
              >
                <span className="patch-modal__method-label">{method.label}</span>
                <span className="patch-modal__method-id">{method.id}</span>
              </button>
            ))}
          </div>
        )}
        <ModalFooter>
          <Button variant="default" size="md" onClick={onClose}>Cerrar</Button>
        </ModalFooter>
      </Modal>
    );
  }

  // ── Paso 2: Configuración ──
  const allFields = [...selectedMethod.configFields, ...BASE_COOLDOWN_FIELDS];

  return (
    <Modal
      onClose={onClose}
      title={`Configurar ${selectedMethod.label}`}
      subtitle={`${cameraId} — PATCH /${cameraId}/${selectedMethod.id}`}
    >
      {allFields.map(field => (
        <FormField
          key={field.key}
          label={field.label}
          value={config[field.key] ?? (field.type === 'number' ? '' : '')}
          onChange={(v) => updateConfig(field.key, v)}
          type={field.type === 'number' ? 'number' : 'text'}
          min={field.min}
          required={field.required}
          hint={field.required ? undefined : 'Opcional'}
        />
      ))}
      <ModalFooter>
        <Button variant="ghost" size="md" onClick={handleBack}>← Atrás</Button>
        <Button variant="default" size="md" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" size="md" onClick={handleConfirm}>Aplicar</Button>
      </ModalFooter>
    </Modal>
  );
}
