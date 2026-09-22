import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { apiClient } from "../api/client";
import { resetTheme } from "../config/ConfigContext";
import type { LoginResponse, Usuario } from "../api/types";

interface AuthContextValue {
  usuario: Usuario | null;
  login: (email: string, password: string) => Promise<Usuario>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUsuario(): Usuario | null {
  const raw = localStorage.getItem("usuario");
  return raw ? (JSON.parse(raw) as Usuario) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => readStoredUsuario());

  const login = async (email: string, password: string) => {
    const { data } = await apiClient.post<LoginResponse>("/auth/login", { email, password });
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("usuario", JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    return data.usuario;
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("usuario");
    setUsuario(null);
    // Sin esto, la pantalla de login que aparece justo después seguiría pintada con los colores
    // de la empresa que acaba de cerrar sesión, en vez de la marca neutra de CableGestion.
    resetTheme();
  };

  const value = useMemo(() => ({ usuario, login, logout }), [usuario]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}
