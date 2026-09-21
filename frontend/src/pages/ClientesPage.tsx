import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { SelectorZona } from "../components/SelectorZona";
import { useNuevoClienteModal } from "../components/NuevoClienteModal";
import { apiClient } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Cliente, EstadisticasClientes, EstadoServicio, Zona } from "../api/types";

const ESTADO_CHIP: Record<EstadoServicio, string> = {
  activo: "bg-success-bg text-success",
  suspendido: "bg-warning-bg text-warning",
  retirado: "bg-neutral-chip-bg text-neutral-chip",
};

function IconoBuscar() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-ink-weak">
      <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 14L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const CLIENTES_POR_PAGINA = 30;

export function ClientesPage() {
  const { usuario } = useAuth();
  const esGestor = usuario?.rol === "gestor";

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [totalClientes, setTotalClientes] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [estadisticas, setEstadisticas] = useState<EstadisticasClientes | null>(null);
  const [zonas, setZonas] = useState<Zona[]>([]);

  const [filtroZona, setFiltroZona] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const totalPaginas = Math.max(1, Math.ceil(totalClientes / CLIENTES_POR_PAGINA));

  const cargarClientes = async (paginaActual: number) => {
    const [{ data: datosClientes, headers }, { data: datosEstadisticas }] = await Promise.all([
      apiClient.get<Cliente[]>("/clientes", {
        params: {
          zonaId: filtroZona || undefined,
          busqueda: busqueda || undefined,
          pagina: paginaActual,
          porPagina: CLIENTES_POR_PAGINA,
        },
      }),
      apiClient.get<EstadisticasClientes>("/clientes/estadisticas"),
    ]);
    setClientes(datosClientes);
    setTotalClientes(Number(headers["x-total-count"] ?? datosClientes.length));
    setEstadisticas(datosEstadisticas);
  };

  useEffect(() => {
    apiClient.get<Zona[]>("/zonas").then(({ data }) => setZonas(data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cambiar de zona o buscar siempre vuelve a la página 1 (evita quedar en una página vacía).
  useEffect(() => {
    setPagina(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroZona, busqueda]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      cargarClientes(pagina);
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroZona, busqueda, pagina]);

  const { abrir: abrirNuevoCliente, modal: modalNuevoCliente } = useNuevoClienteModal(() => cargarClientes(pagina));

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
        <h1 className="font-serif text-[32px] font-normal tracking-[-0.01em] text-ink">Clientes</h1>
        {estadisticas && (
          <p className="text-[13px] text-ink-weak">
            {estadisticas.activo} activos · {estadisticas.suspendido} suspendidos · {estadisticas.retirado} retirados
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex min-w-[280px] flex-1 items-center gap-2.5 rounded-lg border border-border-field bg-surface px-4 py-3">
          <IconoBuscar />
          <input
            placeholder="Buscar por nombre, DNI, teléfono o caserío"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            className="w-full text-[15px] text-ink outline-none"
          />
        </div>
        <SelectorZona zonas={zonas} valor={filtroZona} onChange={setFiltroZona} />
        {esGestor && (
          <button
            onClick={abrirNuevoCliente}
            className="rounded-[9px] bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Nuevo cliente
          </button>
        )}
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface shadow-card">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-subtle text-left text-[11.5px] uppercase tracking-[.05em] text-ink-weak">
              <th className="px-4 py-2.5 font-medium">Cliente</th>
              <th className="px-4 py-2.5 font-medium">Caserío y dirección</th>
              <th className="px-4 py-2.5 font-medium">Teléfono</th>
              <th className="px-4 py-2.5 font-medium">Estado</th>
              <th className="px-4 py-2.5 font-medium">Mensual</th>
              <th className="px-4 py-2.5 font-medium">Deuda</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((cliente) => (
              <tr key={cliente.id} className="border-b border-divider last:border-0 hover:bg-row-hover">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-ink">{cliente.nombreCompleto}</p>
                  {cliente.dni && <p className="font-mono text-xs text-ink-weak">{cliente.dni}</p>}
                </td>
                <td className="px-4 py-2.5 text-ink-2">
                  <p>{cliente.zona.nombre}</p>
                  {cliente.direccion && <p className="text-xs text-ink-weak">{cliente.direccion}</p>}
                </td>
                <td className="px-4 py-2.5 text-ink-2">{cliente.telefono ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-[5px] px-2 py-0.5 text-xs font-medium capitalize ${ESTADO_CHIP[cliente.estadoServicio]}`}>
                    {cliente.estadoServicio}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-ink">
                  S/ {cliente.montoEfectivo.toFixed(2)}
                  {cliente.montoEfectivo < cliente.montoBase && (
                    <span className="ml-1 text-xs text-ink-weak line-through">S/ {cliente.montoBase.toFixed(2)}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 font-mono font-semibold text-error">
                  {cliente.deudaTotal > 0 ? `S/ ${cliente.deudaTotal.toFixed(2)}` : "—"}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Link
                    to={`/clientes/${cliente.id}`}
                    className="rounded-lg border border-border-field px-3 py-1.5 text-xs font-semibold text-ink-2 transition-colors hover:bg-surface-subtle"
                  >
                    Ver ficha
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {clientes.length === 0 && <p className="p-4 text-sm text-ink-weak">No hay clientes que coincidan.</p>}
      </div>

      {totalClientes > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[13px] text-ink-weak">
            {(pagina - 1) * CLIENTES_POR_PAGINA + 1}–{Math.min(pagina * CLIENTES_POR_PAGINA, totalClientes)} de {totalClientes}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina <= 1}
              className="rounded-lg border border-border-field px-3 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-subtle disabled:opacity-40 disabled:hover:bg-transparent"
            >
              ‹ Anterior
            </button>
            <p className="px-2 py-1.5 text-sm text-ink-weak">
              Página {pagina} de {totalPaginas}
            </p>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina >= totalPaginas}
              className="rounded-lg border border-border-field px-3 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-subtle disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Siguiente ›
            </button>
          </div>
        </div>
      )}

      {modalNuevoCliente}
    </AppShell>
  );
}
