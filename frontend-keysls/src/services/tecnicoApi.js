import axios from 'axios';
import { BACKEND_URL } from './api';

// Cliente APARTE del panel a propósito (mismo motivo que en el backend, ver
// tecnico-auth.guard.ts): un token de técnico nunca debe poder colarse en una llamada del
// panel de gestor/cobrador, ni al revés — cada uno vive en su propio axios/localStorage.
const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tecnicoToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/tecnico/login')) {
      localStorage.removeItem('tecnicoToken');
      localStorage.removeItem('tecnico');
      window.location.href = '/tecnico/login';
    }
    return Promise.reject(err);
  }
);

api.interceptors.response.use(undefined, (err) => {
  const data = err.response?.data;
  if (data && data.message && !data.error) {
    data.error = Array.isArray(data.message) ? data.message.join(', ') : data.message;
  }
  return Promise.reject(err);
});

export const tecnicoAuthApi = {
  login: (payload) => api.post('/auth/tecnico/login', payload),
  me:    () => api.get('/portal-tecnico/perfil'),
};

// Cablera no tiene "tomar" (autoasignarse una orden sin dueño) ni un endpoint de historial
// aparte — /portal-tecnico/ordenes?estado=completada cubre el historial vía filtro.
export const tecnicoOrdenesApi = {
  listar:    (params) => api.get('/portal-tecnico/ordenes', { params }),
  historial: () => api.get('/portal-tecnico/ordenes', { params: { estado: 'completada' } }),
  obtener:   (id) => api.get(`/portal-tecnico/ordenes/${id}`),
  aceptar:   (id) => api.post(`/portal-tecnico/ordenes/${id}/aceptar`),
  iniciar:   (id) => api.post(`/portal-tecnico/ordenes/${id}/iniciar`),
  completar: (id, payload) => api.post(`/portal-tecnico/ordenes/${id}/completar`, payload),
};

// Sin equivalente: un técnico autenticado no pasa por JwtAuthGuard/RolesGuard (su auth es un
// guard totalmente aparte, ver tecnico-auth.guard.ts), así que /puntos-red del panel le
// devuelve 401. Si el Mapa del portal de técnico se necesita de verdad, hay que agregar un
// GET /portal-tecnico/puntos-red al backend — no se construyó en esta fusión.
export const tecnicoPuntosRedApi = {
  listar: () => api.get('/puntos-red'),
};

export const tecnicoInventarioApi = {
  productos: () => api.get('/portal-tecnico/productos'),
};

// OLT/ONU en vivo (buscar por SSH, siguiente ID, perfiles TCONT, tipos de ONU) — cablera NO
// automatiza el OLT, solo registra el resultado ya decidido por el técnico en campo (ver el
// comentario en onus.service.ts). Nada de esto tiene equivalente; se deja sin cablear.
export const tecnicoOnuApi = {
  autorizar: (payload) => api.post('/portal-tecnico/onus', payload),
};

export default api;
