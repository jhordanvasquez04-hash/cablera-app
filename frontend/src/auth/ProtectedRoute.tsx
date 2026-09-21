import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { Rol } from "@cablera/shared";

export function ProtectedRoute({ roles }: { roles?: Rol[] }) {
  const { usuario } = useAuth();

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(usuario.rol)) {
    // super_admin no tiene "home" de negocio (no tiene empresa) y viceversa: cada rol
    // rebota a su propia raíz en vez de a una ruta que no puede ver.
    return <Navigate to={usuario.rol === "super_admin" ? "/admin" : "/"} replace />;
  }

  return <Outlet />;
}
