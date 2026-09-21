import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { SelectorZona } from "../components/SelectorZona";
import { useNuevoClienteModal } from "../components/NuevoClienteModal";
import { apiClient } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useMostrarError } from "../components/ToastContext";
import type { ResumenCobranza, Zona } from "../api/types";

function IconoBuscar() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-ink-weak">
      <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 14L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function TarjetaKpi({ label, valor, nota, destacada }: { label: string; valor: string; nota: string; destacada?: boolean }) {
  return (
    <div className={`rounded-lg border border-border p-4 shadow-card ${destacada ? "bg-primary-tint" : "bg-surface"}`}>
      <p className={`text-[11.5px] uppercase tracking-[.07em] ${destacada ? "text-primary" : "text-ink-weak"}`}>{label}</p>
      <p className={`mt-1 font-mono text-[26px] font-bold tracking-wide ${destacada ? "text-primary" : "text-ink"}`}>{valor}</p>
      <p className={`text-[12.5px] ${destacada ? "text-primary" : "text-ink-weak"}`}>{nota}</p>
    </div>
  );
}

export function CobranzaPage() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const mostrarError = useMostrarError();
  const esGestor = usuario?.rol === "gestor";

  const [resumen, setResumen] = useState<ResumenCobranza | null>(null);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [filtroZona, setFiltroZona] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [mostrarReportarGasto, setMostrarReportarGasto] = useState(false);
  const [montoGasto, setMontoGasto] = useState("");
  const [descripcionGasto, setDescripcionGasto] = useState("");
  const [enviandoGasto, setEnviandoGasto] = useState(false);

  const { abrir: abrirNuevoCliente, modal: modalNuevoCliente } = useNuevoClienteModal((cliente) => navigate(`/clientes/${cliente.id}`));

  const cargarResumen = async () => {
    const { data } = await apiClient.get<ResumenCobranza>("/cobranza/resumen", {
      params: { zonaId: filtroZona || undefined, busqueda: busqueda || undefined },
    });
    setResumen(data);
  };

  useEffect(() => {
    apiClient.get<Zona[]>("/zonas").then(({ data }) => setZonas(data));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      cargarResumen();
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroZona, busqueda]);

  const handleReportarGasto = async () => {
    setEnviandoGasto(true);
    try {
      await apiClient.post("/caja/gastos-reportados", { monto: Number(montoGasto), descripcion: descripcionGasto });
      setMostrarReportarGasto(false);
      setMontoGasto("");
      setDescripcionGasto("");
    } catch {
      mostrarError("No se pudo enviar el reporte de gasto");
    } finally {
      setEnviandoGasto(false);
    }
  };

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
        <h1 className="font-serif text-[32px] font-normal tracking-[-0.01em] text-ink">Cobranza</h1>
        <p className="text-[13px] text-ink-weak">
          {resumen ? `${resumen.clientesConDeudaCount} clientes con deuda` : ""}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex min-w-[280px] flex-1 items-center gap-2.5 rounded-lg border border-border-field bg-surface px-4 py-3">
          <IconoBuscar />
          <input
            placeholder="Buscar por DNI, nombre o teléfono"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            className="w-full text-[15px] text-ink outline-none"
          />
        </div>
        <SelectorZona zonas={zonas} valor={filtroZona} onChange={setFiltroZona} />
        <button
          onClick={() => navigate("/pagos/nuevo")}
          className="rounded-[9px] bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Registrar pago
        </button>
        {esGestor ? (
          <button
            onClick={abrirNuevoCliente}
            className="rounded-[9px] border border-border-field bg-surface px-4 py-3 text-sm font-semibold text-ink-2 transition-colors hover:bg-surface-subtle"
          >
            Nuevo cliente
          </button>
        ) : (
          <button
            onClick={() => setMostrarReportarGasto(true)}
            className="rounded-[9px] border border-border-field bg-surface px-4 py-3 text-sm font-semibold text-ink-2 transition-colors hover:bg-surface-subtle"
          >
            Reportar gasto
          </button>
        )}
      </div>

      {resumen && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {esGestor ? (
            <>
              <TarjetaKpi label="Cobrado este mes" valor={`S/ ${resumen.cobradoMes.toFixed(2)}`} nota="Pagos registrados" />
              <TarjetaKpi label="Deuda acumulada" valor={`S/ ${resumen.deudaAcumulada.toFixed(2)}`} nota="Saldo pendiente" />
              <TarjetaKpi label="Egresos del mes" valor={`S/ ${resumen.egresosMes.toFixed(2)}`} nota="Caja y egresos" />
              <TarjetaKpi label="Saldo neto" valor={`S/ ${resumen.saldoNeto.toFixed(2)}`} nota="Ingresos menos egresos" destacada />
            </>
          ) : (
            <>
              <TarjetaKpi
                label="Cobrado hoy por ti"
                valor={`S/ ${resumen.cobradoHoyPorUsuario.toFixed(2)}`}
                nota={`${resumen.cobrosHoyPorUsuarioCount} cobros`}
              />
              <TarjetaKpi label="Pendientes" valor={String(resumen.clientesConDeudaCount)} nota="clientes con deuda" />
            </>
          )}
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface shadow-card">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-subtle text-left text-[11.5px] uppercase tracking-[.05em] text-ink-weak">
              <th className="px-4 py-2.5 font-medium">Cliente</th>
              <th className="px-4 py-2.5 font-medium">Zona</th>
              <th className="px-4 py-2.5 font-medium">Mensual</th>
              <th className="px-4 py-2.5 font-medium">Meses pendientes</th>
              <th className="px-4 py-2.5 font-medium">Deuda total</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {resumen?.clientes.map((cliente) => (
              <tr key={cliente.id} className="border-b border-divider last:border-0 hover:bg-row-hover">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-ink">{cliente.nombreCompleto}</p>
                  {cliente.dni && <p className="font-mono text-xs text-ink-weak">{cliente.dni}</p>}
                </td>
                <td className="px-4 py-2.5 text-ink-2">{cliente.zona.nombre}</td>
                <td className="px-4 py-2.5 font-mono text-ink">S/ {cliente.montoBase.toFixed(2)}</td>
                <td className="px-4 py-2.5">
                  {cliente.suspendido ? (
                    <span className="rounded-[5px] bg-neutral-chip-bg px-2 py-0.5 text-xs font-medium text-neutral-chip">
                      Suspendido
                    </span>
                  ) : (
                    <span className="rounded-[5px] bg-error-bg px-2 py-0.5 text-xs font-medium text-error">
                      {cliente.mesesPendientes}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 font-mono font-semibold text-error">S/ {cliente.deudaTotal.toFixed(2)}</td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => navigate(`/pagos/nuevo?clienteId=${cliente.id}`)}
                    className="rounded-[9px] bg-primary hover:bg-primary-hover transition-colors px-3.5 py-2 text-sm font-semibold text-white"
                  >
                    Cobrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {resumen && resumen.clientes.length === 0 && (
          <p className="p-4 text-sm text-ink-weak">No hay clientes con deuda pendiente.</p>
        )}
      </div>

      {mostrarReportarGasto && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-[rgba(16,24,40,0.45)] p-4">
          <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-modal">
            <h2 className="text-[16px] font-semibold text-ink">Reportar un gasto</h2>
            <p className="mt-1 text-[13px] text-ink-weak">
              Queda pendiente hasta que el administrador lo apruebe en Caja.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Monto (S/)</label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={montoGasto}
                  onChange={(event) => setMontoGasto(event.target.value)}
                  className="w-full rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Descripción</label>
                <textarea
                  value={descripcionGasto}
                  onChange={(event) => setDescripcionGasto(event.target.value)}
                  className="w-full rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                  rows={3}
                />
              </div>
              <p className="text-xs text-ink-weak">Si tienes el comprobante, guárdalo — el administrador puede pedírtelo.</p>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setMostrarReportarGasto(false)} className="text-sm text-ink-weak underline">
                Cancelar
              </button>
              <button
                onClick={handleReportarGasto}
                disabled={enviandoGasto || !montoGasto || !descripcionGasto}
                className="rounded-[9px] bg-primary hover:bg-primary-hover transition-colors px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                Enviar reporte
              </button>
            </div>
          </div>
        </div>
      )}

      {modalNuevoCliente}
    </AppShell>
  );
}
