/**
 * cameraService.js
 * 
 * Servicio de cámara: encapsula todas las llamadas a la API
 * relacionadas con cámaras y procesamiento de video.
 */

import apiClient from './apiClient';
import { ENDPOINTS } from '../config';

const cameraService = {
  /**
   * Obtener lista de cámaras configuradas en el backend.
   * Devuelve array de { camera_id, name, source }.
   */
  async fetchCameras() {
    return apiClient.get(ENDPOINTS.GET_CAMERAS);
  },

  /**
   * Iniciar procesamiento pluma extendida.
   * @param {string} cameraId
   * @param {string} source - URL RTSP o path local
   * @param {object} plumaConfig - { not_detected_cooldown, detected_cooldown }
   */
  async startPlumaExtendida(cameraId, source, plumaConfig) {
    return apiClient.post(ENDPOINTS.START_PLUMA_EXTENDIDA, {
      camera_id: cameraId,
      source,
      pluma_config: plumaConfig,
    });
  },

  /**
   * Iniciar detección de colisión.
   * @param {string} cameraId
   * @param {string} source
   * @param {object} collisionConfig - { collision_alarm_id }
   */
  async startCollisionDetection(cameraId, source, collisionConfig) {
    return apiClient.post(ENDPOINTS.START_COLLISION_DETECTION, {
      camera_id: cameraId,
      source,
      collision_config: collisionConfig,
    });
  },

  /**
   * Detener cámara.
   * @param {string} cameraId
   */
  async deleteCamera(cameraId) {
    return apiClient.delete(ENDPOINTS.DELETE_CAMERA(cameraId));
  },

  /**
   * Agregar método de análisis a cámara con pluma extendida.
   * @param {string} cameraId
   * @param {string} methodId - nombre del método (patas, signaler, etc.)
   * @param {object} config - config específico del método + cooldowns heredados
   */
  async patchMethod(cameraId, methodId, config = {}) {
    const body = Object.keys(config).length > 0 ? config : undefined;
    return apiClient.patch(ENDPOINTS.PATCH_METHOD(cameraId, methodId), body);
  },
};

export default cameraService;
