import { useState } from 'react';
import { Modal, ModalFooter, Button, FormField } from '../common';
import { SETTINGS_FIELDS } from '../../config';

/**
 * Modal mínimo de configuración. Edita las URLs (API backend, gateway WebRTC,
 * base RTSP) persistidas en localStorage vía useSettings.
 *
 * @param {object} settings - valores actuales
 * @param {function} onSave - (partial) => void (updateSettings)
 * @param {function} onReset - () => void (resetSettings)
 * @param {function} onClose
 */
export default function SettingsModal({ settings, onSave, onReset, onClose }) {
  const [draft, setDraft] = useState({ ...settings });

  const set = (key, value) => setDraft(prev => ({ ...prev, [key]: value }));

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  return (
    <Modal onClose={onClose} title="Configuración" subtitle="URLs del backend y del gateway de video">
      {SETTINGS_FIELDS.map(f => (
        <FormField
          key={f.key}
          label={f.label}
          value={draft[f.key] ?? ''}
          onChange={(v) => set(f.key, v)}
          type="text"
          placeholder={f.placeholder}
          hint={f.hint}
        />
      ))}
      <ModalFooter>
        <Button variant="ghost" size="md" onClick={handleReset}>Restaurar defaults</Button>
        <Button variant="default" size="md" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" size="md" onClick={handleSave}>Guardar</Button>
      </ModalFooter>
    </Modal>
  );
}
