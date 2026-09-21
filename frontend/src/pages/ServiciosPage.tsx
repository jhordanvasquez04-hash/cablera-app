import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { apiClient } from "../api/client";
import { useMostrarError } from "../components/ToastContext";
import type { EstadoServicioTecnico, ServicioTecnico } from "../api/types";
import { formatFechaCorta, formatFechaHora } from "../utils/fechaPeru";

const ESTADOS: { valor: EstadoServicioTecnico | null; label: string }[] = [
  { valor: null, label: "Todos" },
  { valor: "pendiente", label: "Pendiente" },
  { valor: "liquidado", label: "Liquidado" },
];

const ESTADO_CHIP: Record<EstadoServicioTecnico, string> = {
  pendiente: "bg-error-bg text-error",
  liquidado: "bg-success-bg text-success",
};

export function ServiciosPage() {
  const mostrarError = useMostrarError();
  const [servicios, setServicios] = useState<ServicioTecnico[]>([]);
  const [filtro, setFiltro] = useState<EstadoServicioTecnico | null>(null);
  const [cargando, setCargando] = useState(true);

  const [accionId, setAccionId] = useState<string | null>(null);
  const [accionTipo, setAccionTipo] = useState<"comentar" | "liquidar" | null>(null);
  const [textoAccion, setTextoAccion] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    const { data } = await apiClient.get<ServicioTecnico[]>("/servicios-tecnicos", {
      params: { estado: filtro ?? undefined },
    });
    setServicios(data);
    setCargando(false);
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  const abrirAccion = (servicio: ServicioTecnico, tipo: "comentar" | "liquidar") => {
    setAccionId(servicio.id);
    setAccionTipo(tipo);
    setTextoAccion("");
  };

  const confirmarAccion = async () => {
    if (!accionId || !accionTipo) return;
    if (accionTipo === "comentar" && !textoAccion.trim()) return;
    setEnviando(true);
    try {
      if (accionTipo === "comentar") {
        await apiClient.post(`/servicios-tecnicos/${accionId}/comentar`, { comentario: textoAccion });
      } else {
        await apiClient.post(`/servicios-tecnicos/${accionId}/liquidar`, { comentarioFinal: textoAccion || undefined });
      }
      setAccionId(null);
      setAccionTipo(null);
      await cargar();
    } catch (err: any) {
      mostrarError(err?.response?.data?.message ?? "No se pudo guardar");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
        <h1 className="font-serif text-[32px] font-normal tracking-[-0.01em] text-ink">Servicios técnicos</h1>
        <Link
          to="/servicios/nuevo"
          className="rounded-[9px] bg-primary hover:bg-primary-hover transition-colors px-4 py-2.5 text-sm font-semibold text-white"
        >
          + Nuevo servicio
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {ESTADOS.map((opcion) => (
          <button
            key={opcion.label}
            onClick={() => setFiltro(opcion.valor)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
              filtro === opcion.valor ? "bg-primary text-white" : "border border-border-field text-ink-2 hover:bg-surface-subtle transition-colors"
            }`}
          >
            {opcion.label}
          </button>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto rounded-lg border border-border bg-surface shadow-card">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-subtle text-left text-[11.5px] uppercase tracking-[.05em] text-ink-weak">
              <th className="px-4 py-2.5 font-medium">Folio</th>
              <th className="px-4 py-2.5 font-medium">Tipo</th>
              <th className="px-4 py-2.5 font-medium">Cliente</th>
              <th className="px-4 py-2.5 font-medium">Estado</th>
              <th className="px-4 py-2.5 font-medium">Creado</th>
              <th className="px-4 py-2.5 font-medium">Programado</th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {servicios.map((servicio) => (
              <Fragment key={servicio.id}>
                <tr className="border-b border-divider last:border-0">
                  <td className="px-4 py-2.5 font-mono font-semibold text-ink">{servicio.folio}</td>
                  <td className="px-4 py-2.5 capitalize text-ink-2">{servicio.tipo}</td>
                  <td className="px-4 py-2.5 text-ink-2">
                    <Link to={`/clientes/${servicio.cliente.id}`} className="text-primary hover:underline">
                      {servicio.cliente.nombreCompleto}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block rounded-[5px] px-2 py-0.5 text-xs font-medium capitalize ${ESTADO_CHIP[servicio.estado]}`}>
                      {servicio.estado.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-ink-2">{formatFechaHora(servicio.fechaCreacion)}</td>
                  <td className="px-4 py-2.5 text-ink-2">
                    {servicio.fechaProgramada ? formatFechaCorta(servicio.fechaProgramada) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => abrirAccion(servicio, "comentar")}
                        className="rounded-lg border border-border-field px-3 py-1.5 text-xs font-semibold text-ink-2 transition-colors hover:bg-surface-subtle"
                      >
                        Comentar
                      </button>
                      {servicio.estado !== "liquidado" && (
                        <button
                          onClick={() => abrirAccion(servicio, "liquidar")}
                          className="rounded-lg border border-success/30 px-3 py-1.5 text-xs font-semibold text-success transition-colors hover:bg-success-bg"
                        >
                          Liquidar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {(servicio.comentario || servicio.comentarioFinal) && (
                  <tr className="border-b border-divider bg-surface-subtle last:border-0">
                    <td colSpan={7} className="px-4 py-2 text-xs text-ink-weak">
                      {servicio.comentario && <p>Al iniciar: {servicio.comentario}</p>}
                      {servicio.comentarioFinal && <p>Al terminar: {servicio.comentarioFinal}</p>}
                    </td>
                  </tr>
                )}
                {accionId === servicio.id && (
                  <tr className="border-b border-divider last:border-0">
                    <td colSpan={7} className="bg-primary-tint px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          autoFocus
                          value={textoAccion}
                          onChange={(event) => setTextoAccion(event.target.value)}
                          placeholder={accionTipo === "liquidar" ? "Comentario al terminar (opcional)" : "Comentario"}
                          className="min-w-[240px] flex-1 rounded-lg border border-border-field px-3 py-2 text-sm"
                        />
                        <button
                          onClick={confirmarAccion}
                          disabled={enviando || (accionTipo === "comentar" && !textoAccion.trim())}
                          className="rounded-lg bg-primary hover:bg-primary-hover transition-colors px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          {accionTipo === "liquidar" ? "Liquidar" : "Guardar"}
                        </button>
                        <button onClick={() => setAccionId(null)} className="text-xs text-ink-weak underline">
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {!cargando && servicios.length === 0 && <p className="p-4 text-sm text-ink-weak">No hay servicios técnicos con este filtro.</p>}
      </div>
    </AppShell>
  );
}
