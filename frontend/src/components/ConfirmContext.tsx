import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface ConfirmOptions {
  titulo?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  /** Resalta el botón de confirmar en rojo para acciones irreversibles (anular, eliminar, rechazar). */
  destructivo?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  mensaje: string;
  resolve: (valor: boolean) => void;
}

type ConfirmFn = (mensaje: string, opciones?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<ConfirmState | null>(null);

  const confirmar = useCallback<ConfirmFn>((mensaje, opciones) => {
    return new Promise<boolean>((resolve) => {
      setEstado({ mensaje, resolve, ...opciones });
    });
  }, []);

  const cerrar = (valor: boolean) => {
    estado?.resolve(valor);
    setEstado(null);
  };

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      {estado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => cerrar(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="font-serif text-[19px] font-normal text-ink">{estado.titulo ?? "Confirmar"}</h2>
            <p className="mt-2 text-sm text-ink-2">{estado.mensaje}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => cerrar(false)}
                className="rounded-[9px] border border-border-field px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-surface-subtle transition-colors"
              >
                {estado.textoCancelar ?? "Cancelar"}
              </button>
              <button
                onClick={() => cerrar(true)}
                className={
                  estado.destructivo
                    ? "rounded-[9px] border border-error-border px-4 py-2.5 text-sm font-semibold text-error hover:bg-error-bg"
                    : "rounded-[9px] bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
                }
              >
                {estado.textoConfirmar ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

/** Reemplaza al `confirm()` nativo del navegador con un diálogo propio del sistema de diseño. */
export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm debe usarse dentro de ConfirmProvider");
  }
  return context;
}
