import { create } from 'zustand';
import { authApi } from '../services/api';
import { queryClient } from '../queryClient';

const cargarUsuarioInicial = () => {
  try {
    const stored = localStorage.getItem('usuario');
    return stored ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem('usuario');
    localStorage.removeItem('token');
    return null;
  }
};

// Cablera no tiene 2FA de login (a diferencia de Keysls) — el login siempre devuelve la
// sesión de una: { accessToken, usuario: { id, nombre, email, rol } }. Nota: cablera usa un
// solo campo `nombre` (no nombre+apellido separados) — todo lo que lea `usuario.apellido` en
// las páginas copiadas de Keysls simplemente da `undefined` (con "?." ya no revienta, solo
// muestra un poco menos de texto/iniciales).
function guardarSesion(set, data) {
  localStorage.setItem('token', data.accessToken);
  localStorage.setItem('usuario', JSON.stringify(data.usuario));
  set({ token: data.accessToken, usuario: data.usuario, loading: false });
}

export const useAuthStore = create((set) => ({
  usuario: cargarUsuarioInicial(),
  token: localStorage.getItem('token') || null,
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const { data } = await authApi.login({ email, password });
      guardarSesion(set, data);
      return { ok: true };
    } catch (err) {
      set({ loading: false });
      return { ok: false, error: err.response?.data?.error || 'Error al iniciar sesión' };
    }
  },

  setUsuario: (usuario) => {
    localStorage.setItem('usuario', JSON.stringify(usuario));
    set({ usuario });
  },

  logout: async () => {
    try { await authApi.logout(); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    set({ token: null, usuario: null });
    queryClient.clear();
  },
}));
