/**
 * cameraService.js
 * 
 * Servicio de cámara: encapsula todas las llamadas a la API.
 * Solo expone los métodos que existen en el backend real.
 */

import apiClient from './apiClient';
import { ENDPOINTS } from '../config';

const cameraService = {
  /**
   * Iniciar procesamiento pluma extendida.
   * POST /start_pluma_extendida
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
   * POST /start_collision_detection
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
   * DELETE /{camera_id}
   */
  async deleteCamera(cameraId) {
    return apiClient.delete(ENDPOINTS.DELETE_CAMERA(cameraId));
  },

  /**
   * Agregar método de análisis a cámara con pluma extendida.
   * PATCH /{camera_id}/{method}
   */
  async patchMethod(cameraId, methodId, config = {}) {
    const body = Object.keys(config).length > 0 ? config : undefined;
    return apiClient.patch(ENDPOINTS.PATCH_METHOD(cameraId, methodId), body);
  },
};

export default cameraService;
