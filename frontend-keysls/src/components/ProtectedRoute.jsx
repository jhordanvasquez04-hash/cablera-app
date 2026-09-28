import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import Layout from './layout/Layout';

export default function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  const usuario = useAuthStore((s) => s.usuario);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // El super_admin no pertenece a ninguna empresa — no tiene nada que ver en
  // las pantallas operativas de un tenant, así que siempre va a su panel.
  // (Cablera no tiene un rol "SECRETARIA" a nivel de Usuario — un secretario es un registro de
  // catálogo aparte, opcionalmente enlazado a un Usuario gestor/cobrador normal, así que esa
  // restricción de rutas de Keysls no aplica acá y se quitó.)
  if (usuario?.rol === 'super_admin') {
    return <Navigate to="/admin" replace />;
  }

  return <Layout>{children}</Layout>;
}
