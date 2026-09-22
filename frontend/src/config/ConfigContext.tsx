import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiClient } from "../api/client";
import type { Configuracion } from "../api/types";

interface ConfigContextValue {
  configuracion: Configuracion | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextValue | undefined>(undefined);

function applyTheme(configuracion: Configuracion) {
  document.documentElement.style.setProperty("--color-primary", configuracion.colorPrimario);
  document.documentElement.style.setProperty("--color-secondary", configuracion.colorSecundario);
}

/**
 * Vuelve a los colores por defecto de CableGestion (los que ya trae :root en index.css). Se usa al
 * cerrar sesión y en la pantalla de login: antes de autenticar no hay forma de saber de qué empresa
 * es la persona (varias empresas comparten el mismo login), así que ahí nunca se pinta la marca de
 * ninguna empresa — solo la del producto. Ver LoginPage.tsx.
 */
export function resetTheme() {
  document.documentElement.style.removeProperty("--color-primary");
  document.documentElement.style.removeProperty("--color-secondary");
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null);
  const [loading, setLoading] = useState(true);

  // Requiere sesión (ver backend/src/configuracion/configuracion.controller.ts). Antes de que haya
  // una, esto falla con 401 — es esperado, se ignora y la app se queda con los colores por defecto.
  const refresh = async () => {
    try {
      const { data } = await apiClient.get<Configuracion>("/configuracion");
      setConfiguracion(data);
      applyTheme(data);
    } catch {
      setConfiguracion(null);
      resetTheme();
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  return (
    <ConfigContext.Provider value={{ configuracion, loading, refresh }}>{children}</ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig debe usarse dentro de ConfigProvider");
  }
  return context;
}
