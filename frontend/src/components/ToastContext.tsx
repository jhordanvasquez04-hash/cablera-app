import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface Toast {
  id: number;
  mensaje: string;
}

type MostrarErrorFn = (mensaje: string) => void;

const ToastContext = createContext<MostrarErrorFn | undefined>(undefined);

let siguienteId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const mostrarError = useCallback<MostrarErrorFn>((mensaje) => {
    const id = ++siguienteId;
    setToasts((prev) => [...prev, { id, mensaje }]);
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 5000);
  }, []);

  return (
    <ToastContext.Provider value={mostrarError}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className="max-w-sm rounded-lg border border-error-border bg-error-bg px-4 py-3 text-sm font-medium text-error shadow-modal"
          >
            {toast.mensaje}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Reemplaza al `alert()` nativo del navegador con un aviso propio del sistema de diseño. */
export function useMostrarError() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useMostrarError debe usarse dentro de ToastProvider");
  }
  return context;
}
