import { useState } from "react";
import type { Zona } from "../api/types";

export function SelectorZona({ zonas, valor, onChange }: { zonas: Zona[]; valor: string; onChange: (id: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const zonaSeleccionada = zonas.find((zona) => zona.id === valor);
  const filtradas = zonas.filter((zona) => zona.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  const elegir = (id: string) => {
    onChange(id);
    setAbierto(false);
    setBusqueda("");
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-border-field bg-surface px-4 py-3 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-subtle"
      >
        {zonaSeleccionada ? zonaSeleccionada.nombre : "Todas las zonas"}
        <span className="text-ink-weak">▾</span>
      </button>
      {abierto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-border bg-surface p-2 shadow-modal">
            <input
              autoFocus
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar zona..."
              className="mb-2 w-full rounded-lg border border-border-field px-3 py-2 text-sm text-ink outline-none focus:border-primary"
            />
            <div className="max-h-64 overflow-y-auto">
              <button
                type="button"
                onClick={() => elegir("")}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                  valor === "" ? "bg-primary-tint font-medium text-primary" : "text-ink-2 hover:bg-surface-subtle"
                }`}
              >
                Todas las zonas
              </button>
              {filtradas.map((zona) => (
                <button
                  key={zona.id}
                  type="button"
                  onClick={() => elegir(zona.id)}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                    valor === zona.id ? "bg-primary-tint font-medium text-primary" : "text-ink-2 hover:bg-surface-subtle"
                  }`}
                >
                  {zona.nombre}
                </button>
              ))}
              {filtradas.length === 0 && <p className="px-3 py-2 text-sm text-ink-weak">Sin resultados.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
