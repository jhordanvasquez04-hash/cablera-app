import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { apiClient } from "../api/client";
import type { BoletaResumen } from "../api/types";

const ESTADO_CHIP: Record<string, string> = {
  emitida: "bg-success-bg text-success",
  anulada: "bg-error-bg text-error",
};

export function BoletasPage() {
  const [boletas, setBoletas] = useState<BoletaResumen[]>([]);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      apiClient.get<BoletaResumen[]>("/boletas", { params: { busqueda: busqueda || undefined } }).then(({ data }) => {
        setBoletas(data);
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [busqueda]);

  return (
    <AppShell>
      <div className="border-b border-border pb-5">
        <h1 className="font-serif text-[32px] font-normal tracking-[-0.01em] text-ink">Boletas</h1>
        <p className="mt-1 text-[13.5px] text-ink-2">
          Una boleta emitida no se edita: se anula y se reemite.
        </p>
      </div>

      <div className="mt-5 flex max-w-xl items-center gap-2.5 rounded-lg border border-border-field bg-surface px-4 py-3">
        <input
          placeholder="Buscar por cliente"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          className="w-full text-[15px] text-ink outline-none"
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface shadow-card">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-subtle text-left text-[11.5px] uppercase tracking-[.05em] text-ink-weak">
              <th className="px-4 py-2.5 font-medium">N°</th>
              <th className="px-4 py-2.5 font-medium">Fecha</th>
              <th className="px-4 py-2.5 font-medium">Cliente</th>
              <th className="px-4 py-2.5 font-medium">Concepto</th>
              <th className="px-4 py-2.5 font-medium">Método</th>
              <th className="px-4 py-2.5 font-medium">Monto</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {boletas.map((boleta) => (
              <tr key={boleta.id} className="border-b border-divider last:border-0 hover:bg-row-hover">
                <td className="px-4 py-2.5 font-mono font-semibold text-ink">{boleta.folio}</td>
                <td className="px-4 py-2.5 text-ink-2">{new Date(boleta.fecha).toLocaleDateString("es-PE")}</td>
                <td className="px-4 py-2.5">
                  <p className="font-medium text-ink">{boleta.cliente.nombreCompleto}</p>
                  <p className="text-xs text-ink-weak">{boleta.cliente.zona}</p>
                </td>
                <td className="px-4 py-2.5 text-ink-2">{boleta.concepto}</td>
                <td className="px-4 py-2.5 capitalize text-ink-2">{boleta.metodoPago}</td>
                <td className="px-4 py-2.5">
                  <p className="font-mono font-semibold text-ink">S/ {boleta.montoTotal.toFixed(2)}</p>
                  <span className={`mt-0.5 inline-block rounded-[5px] px-2 py-0.5 text-xs font-medium capitalize ${ESTADO_CHIP[boleta.estado]}`}>
                    {boleta.estado}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Link
                    to={`/boletas/${boleta.id}`}
                    className="rounded-lg border border-border-field px-3 py-1.5 text-xs font-semibold text-ink-2 transition-colors hover:bg-surface-subtle"
                  >
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {boletas.length === 0 && <p className="p-4 text-sm text-ink-weak">No hay boletas registradas.</p>}
      </div>
    </AppShell>
  );
}
