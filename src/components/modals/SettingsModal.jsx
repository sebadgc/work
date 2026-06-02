import { useState } from 'react';
import { Modal, ModalFooter, Button, FormField } from '../common';
import { SETTINGS_FIELDS, MESSAGES } from '../../config';
import './SettingsModal.css';

const M = MESSAGES.settings;

const blankCamera = () => ({
  id: '',
  name: '',
  rtsp: '',
  pluma: { enabled: true, config: { not_detected_cooldown: 5, detected_cooldown: 2 } },
  collision: { enabled: true, config: { collision_alarm_id: '', not_detected_cooldown: 5, detected_cooldown: 2 } },
});

/**
 * Modal de configuración con dos pestañas:
 *  - Conexión: URLs (persistido en localStorage).
 *  - Cámaras: editor de cámaras preset (persistido vía cameras.local.json).
 */
export default function SettingsModal({ settings, onSave, onReset, presets = [], onSavePresets, onClose }) {
  const [tab, setTab] = useState('conexion');

  // ── Conexión ──
  const [draft, setDraft] = useState({ ...settings });
  const setUrl = (key, value) => setDraft(prev => ({ ...prev, [key]: value }));
  const handleSaveConn = () => { onSave(draft); onClose(); };
  const handleReset = () => { onReset(); onClose(); };

  // ── Cámaras ──
  const [cams, setCams] = useState(() => JSON.parse(JSON.stringify(presets)));
  const updateCam = (i, fn) => setCams(prev => prev.map((c, idx) => (idx === i ? fn(c) : c)));
  const setCamField = (i, key, val) => updateCam(i, c => ({ ...c, [key]: val }));
  const setGroupEnabled = (i, group, val) => updateCam(i, c => ({ ...c, [group]: { ...c[group], enabled: val } }));
  const setGroupCfg = (i, group, key, val) =>
    updateCam(i, c => ({ ...c, [group]: { ...c[group], config: { ...c[group].config, [key]: val } } }));
  const addCam = () => setCams(prev => [...prev, blankCamera()]);
  const removeCam = (i) => setCams(prev => prev.filter((_, idx) => idx !== i));
  const handleSaveCams = () => {
    const clean = cams.filter(c => c.id.trim());
    onSavePresets?.(clean);
    onClose();
  };

  return (
    <Modal onClose={onClose} title={M.title}>
      <div className="settings-tabs">
        <button
          className={`settings-tab ${tab === 'conexion' ? 'settings-tab--active' : ''}`}
          onClick={() => setTab('conexion')}
        >
          {M.tabConexion}
        </button>
        <button
          className={`settings-tab ${tab === 'camaras' ? 'settings-tab--active' : ''}`}
          onClick={() => setTab('camaras')}
        >
          {M.tabCamaras}
        </button>
      </div>

      {tab === 'conexion' ? (
        <>
          {SETTINGS_FIELDS.map(f => (
            <FormField
              key={f.key}
              label={f.label}
              value={draft[f.key] ?? ''}
              onChange={(v) => setUrl(f.key, v)}
              type="text"
              placeholder={f.placeholder}
              hint={f.hint}
            />
          ))}
          <ModalFooter>
            <Button variant="ghost" size="md" onClick={handleReset}>{M.restore}</Button>
            <Button variant="default" size="md" onClick={onClose}>{M.cancel}</Button>
            <Button variant="primary" size="md" onClick={handleSaveConn}>{M.save}</Button>
          </ModalFooter>
        </>
      ) : (
        <>
          <div className="settings-cams">
            {cams.length === 0 && (
              <p className="settings-cams__empty">{M.noCameras}</p>
            )}
            {cams.map((c, i) => (
              <div className="settings-cam" key={i}>
                <FormField label={M.camName} value={c.name} onChange={(v) => setCamField(i, 'name', v)} placeholder={M.camNamePlaceholder} />
                <FormField label={M.camId} value={c.id} onChange={(v) => setCamField(i, 'id', v)} placeholder={M.camIdPlaceholder} required />
                <FormField label={M.camRtsp} value={c.rtsp} onChange={(v) => setCamField(i, 'rtsp', v)} placeholder={M.camRtspPlaceholder} />

                <div className="settings-cam__group">
                  <label className="settings-cam__check">
                    <input type="checkbox" checked={!!c.pluma?.enabled} onChange={(e) => setGroupEnabled(i, 'pluma', e.target.checked)} />
                    <span>{M.plumaEnabled}</span>
                  </label>
                  <FormField label={M.cooldownNoDetect} type="number" min={1}
                    value={c.pluma?.config?.not_detected_cooldown ?? 5}
                    onChange={(v) => setGroupCfg(i, 'pluma', 'not_detected_cooldown', v)} />
                  <FormField label={M.cooldownDetect} type="number" min={1}
                    value={c.pluma?.config?.detected_cooldown ?? 2}
                    onChange={(v) => setGroupCfg(i, 'pluma', 'detected_cooldown', v)} />
                </div>

                <div className="settings-cam__group">
                  <label className="settings-cam__check">
                    <input type="checkbox" checked={!!c.collision?.enabled} onChange={(e) => setGroupEnabled(i, 'collision', e.target.checked)} />
                    <span>{M.colisionEnabled}</span>
                  </label>
                  <FormField label={M.collisionAlarmId} value={c.collision?.config?.collision_alarm_id ?? ''}
                    onChange={(v) => setGroupCfg(i, 'collision', 'collision_alarm_id', v)} placeholder={M.collisionAlarmPlaceholder} />
                  <FormField label={M.cooldownNoDetect} type="number" min={1}
                    value={c.collision?.config?.not_detected_cooldown ?? 5}
                    onChange={(v) => setGroupCfg(i, 'collision', 'not_detected_cooldown', v)} />
                  <FormField label={M.cooldownDetect} type="number" min={1}
                    value={c.collision?.config?.detected_cooldown ?? 2}
                    onChange={(v) => setGroupCfg(i, 'collision', 'detected_cooldown', v)} />
                </div>

                <Button variant="danger" size="sm" className="settings-cam__del" onClick={() => removeCam(i)}>
                  {M.delete}
                </Button>
              </div>
            ))}
          </div>
          <ModalFooter>
            <Button variant="default" size="md" onClick={addCam}>{M.addCamera}</Button>
            <Button variant="default" size="md" onClick={onClose}>{M.cancel}</Button>
            <Button variant="primary" size="md" onClick={handleSaveCams}>{M.saveCameras}</Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
