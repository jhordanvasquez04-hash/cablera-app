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

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const { data } = await apiClient.get<Configuracion>("/configuracion");
    setConfiguracion(data);
    applyTheme(data);
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
