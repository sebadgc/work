/**
 * apiClient.js
 * 
 * Cliente HTTP centralizado. Todos los requests al backend pasan por acá.
 * Permite cambiar la URL base, interceptar errores, agregar headers, etc.
 */

import { ENV } from '../config';

class ApiClient {
  constructor() {
    this.baseUrl = ENV.API_BASE_URL;
  }

  setBaseUrl(url) {
    this.baseUrl = url;
  }

  async request(method, path, body = null) {
    const url = `${this.baseUrl}${path}`;
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);

    try {
      const res = await fetch(url, opts);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        // FastAPI puede devolver `detail` como objeto/array (errores de validación);
        // lo serializamos para que el log no muestre "[object Object]".
        const detail = data?.detail ?? data?.message;
        const error = detail == null
          ? `${res.status} ${res.statusText}`
          : (typeof detail === 'string' ? detail : JSON.stringify(detail));
        return { ok: false, status: res.status, error };
      }
      return { ok: true, data };
    } catch (err) {
      return { ok: false, status: 0, error: err.message };
    }
  }

  get(path) { return this.request('GET', path); }
  post(path, body) { return this.request('POST', path, body); }
  patch(path, body) { return this.request('PATCH', path, body); }
  delete(path) { return this.request('DELETE', path); }
}

// Singleton
const apiClient = new ApiClient();
export default apiClient;
