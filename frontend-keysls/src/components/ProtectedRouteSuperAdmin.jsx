import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import LayoutSuperAdmin from './layout/LayoutSuperAdmin';

export default function ProtectedRouteSuperAdmin({ children }) {
  const token = useAuthStore((s) => s.token);
  const usuario = useAuthStore((s) => s.usuario);

  if (!token) return <Navigate to="/login" replace />;
  if (usuario?.rol !== 'super_admin') return <Navigate to="/" replace />;

  return <LayoutSuperAdmin>{children}</LayoutSuperAdmin>;
}
