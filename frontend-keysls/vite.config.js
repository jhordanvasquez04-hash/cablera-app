import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // 5174, no 5173: el frontend de cablera (TypeScript+Tailwind) puede seguir corriendo ahí
    // al mismo tiempo, para comparar los dos.
    port: 5174,
    strictPort: true,
    // Sin proxy /api: services/api.js ya apunta directo a VITE_BACKEND_URL (el backend de
    // cablera no tiene el prefijo /api que sí tenía el de Keysls).
  },
});
