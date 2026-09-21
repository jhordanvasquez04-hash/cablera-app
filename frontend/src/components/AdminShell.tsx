import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";

/** Shell propio del panel proveedor: deliberadamente sin branding de empresa (logo/colores
 * de ConfigContext) — super_admin no pertenece a ninguna empresa. */
export function AdminShell({ children }: { children: ReactNode }) {
  const { usuario, logout } = useAuth();

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface shadow-header">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-ink text-xs font-bold text-white">
              PP
            </div>
            <span className="text-sm font-semibold text-ink">Panel proveedor</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-2">{usuario?.nombre}</span>
            <button
              onClick={logout}
              className="rounded-md border border-border-field px-3 py-1.5 text-sm text-ink-2 transition-colors hover:bg-surface-subtle"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-7">{children}</main>
    </div>
  );
}
