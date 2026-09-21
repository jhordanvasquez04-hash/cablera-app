import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useConfig } from "../config/ConfigContext";
import { resolverUrlArchivo } from "../api/client";

const NAV_ITEMS = [
  { to: "/", label: "Cobranza", soloGestor: false },
  { to: "/clientes", label: "Clientes", soloGestor: false },
  { to: "/servicios", label: "Servicios", soloGestor: false },
  { to: "/boletas", label: "Boletas", soloGestor: false },
  { to: "/caja", label: "Caja", soloGestor: true },
  { to: "/zonas", label: "Zonas", soloGestor: true },
  { to: "/importar", label: "Importar", soloGestor: true },
  { to: "/configuracion", label: "Configuración", soloGestor: true },
];

function iniciales(texto: string | undefined, cantidad = 2): string {
  if (!texto) return "";
  return texto
    .trim()
    .split(/\s+/)
    .slice(0, cantidad)
    .map((palabra) => palabra[0]?.toUpperCase())
    .join("");
}

export function AppShell({ children }: { children: ReactNode }) {
  const { configuracion } = useConfig();
  const { usuario, logout } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const location = useLocation();

  const items = NAV_ITEMS.filter((item) => !item.soloGestor || usuario?.rol === "gestor");

  const enlaceClase = (activo: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      activo ? "bg-primary-tint text-primary" : "text-ink-2 hover:bg-surface-subtle"
    }`;

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface shadow-header">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-3">
            {configuracion?.logoUrl ? (
              <img src={resolverUrlArchivo(configuracion.logoUrl)} alt="Logo" className="h-8 w-8 rounded-[7px] object-contain" />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-primary text-xs font-bold text-white"
              >
                {iniciales(configuracion?.nombreEmpresa) || "CB"}
              </div>
            )}
            <span className="text-sm font-semibold text-ink">{configuracion?.nombreEmpresa ?? "Cablera"}</span>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {items.map((item) => (
              <Link key={item.to} to={item.to} className={enlaceClase(location.pathname === item.to)}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-tint text-xs font-semibold text-primary">
              {iniciales(usuario?.nombre)}
            </div>
            <span className="text-sm text-ink-2">
              {usuario?.nombre} · <span className="capitalize">{usuario?.rol}</span>
            </span>
            <button
              onClick={logout}
              className="rounded-md border border-border-field px-3 py-1.5 text-sm text-ink-2 transition-colors hover:bg-surface-subtle"
            >
              Salir
            </button>
          </div>

          <button className="md:hidden" aria-label="Abrir menú" onClick={() => setMenuAbierto((open) => !open)}>
            <span className="block h-0.5 w-6 bg-ink" />
            <span className="mt-1 block h-0.5 w-6 bg-ink" />
            <span className="mt-1 block h-0.5 w-6 bg-ink" />
          </button>
        </div>

        {menuAbierto && (
          <nav className="flex flex-col gap-1 border-t border-border px-5 py-3 md:hidden">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={enlaceClase(location.pathname === item.to)}
                onClick={() => setMenuAbierto(false)}
              >
                {item.label}
              </Link>
            ))}
            <span className="mt-2 text-sm text-ink-2">
              {usuario?.nombre} · <span className="capitalize">{usuario?.rol}</span>
            </span>
            <button
              onClick={logout}
              className="mt-1 w-fit rounded-md border border-border-field px-3 py-1.5 text-sm text-ink-2 hover:bg-surface-subtle transition-colors"
            >
              Salir
            </button>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-5 py-7">{children}</main>
    </div>
  );
}
