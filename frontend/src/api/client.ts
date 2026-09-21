import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

/** Convierte una ruta relativa devuelta por el backend (ej. archivos subidos) en una URL completa. */
export function resolverUrlArchivo(ruta: string | null | undefined): string | undefined {
  if (!ruta) return undefined;
  if (/^https?:\/\//.test(ruta)) return ruta;
  return `${API_BASE_URL}${ruta}`;
}

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el token quedó inválido o venció, se limpia la sesión y se manda a login
// en vez de dejar la app en un estado roto/silencioso (esto fue justamente lo que
// causó la confusión de "no tengo clientes" / "no me deja guardar" en pruebas anteriores).
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && window.location.pathname !== "/login") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("usuario");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);
