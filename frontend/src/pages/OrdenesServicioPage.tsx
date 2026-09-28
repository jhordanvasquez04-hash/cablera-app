import { useEffect, useState, type FormEvent } from "react";
import { AppShell } from "../components/AppShell";
import { apiClient } from "../api/client";
import { useMostrarError } from "../components/ToastContext";
import type { Contrato, EstadoOrdenServicio, OrdenServicio, Plan, Tecnico, TipoOrdenServicio, TipoServicioRed } from "../api/types";

const TIPOS_ORDEN: { valor: TipoOrdenServicio; label: string }[] = [
  { valor: "instalacion", label: "Instalación" },
  { valor: "alta_servicio", label: "Alta de servicio" },
  { valor: "averia", label: "Avería" },
  { valor: "cambio_domicilio", label: "Cambio de domicilio" },
  { valor: "cambio_equipo", label: "Cambio de equipo" },
  { valor: "cambio_plan", label: "Cambio de plan" },
  { valor: "cambio_titular", label: "Cambio de titular" },
  { valor: "corte_solicitud", label: "Corte a solicitud" },
  { valor: "corte_deuda", label: "Corte por deuda" },
  { valor: "reconexion", label: "Reconexión" },
  { valor: "retiro_equipo", label: "Retiro de equipo" },
  { valor: "traslado", label: "Traslado" },
  { valor: "otro", label: "Otro" },
];

const TIPOS_SERVICIO: { valor: TipoServicioRed; label: string }[] = [
  { valor: "internet", label: "Internet" },
  { valor: "cable", label: "Cable" },
  { valor: "duo", label: "Dúo" },
];

const ESTADOS_LABEL: Record<EstadoOrdenServicio, string> = {
  pendiente: "Pendiente",
  asignada: "Asignada",
  en_proceso: "En proceso",
  completada: "Completada",
  cancelada: "Cancelada",
};

const formularioVacio = {
  tipoOrden: "instalacion" as TipoOrdenServicio,
  tipoServicio: "internet" as TipoServicioRed,
  contratoId: "",
  fechaServicio: "",
  abonado: "",
  dni: "",
  direccion: "",
  referencia: "",
  sector: "",
  celular: "",
  observacion: "",
  tecnicoId: "",
  planId: "",
};

export function OrdenesServicioPage() {
  const mostrarError = useMostrarError();
  const [ordenes, setOrdenes] = useState<OrdenServicio[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<EstadoOrdenServicio | "">("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [form, setForm] = useState(formularioVacio);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargarOrdenes = async (estado: EstadoOrdenServicio | "") => {
    const { data } = await apiClient.get<OrdenServicio[]>("/ordenes-servicio", { params: estado ? { estado } : undefined });
    setOrdenes(data);
  };

  const cargarCatalogos = async () => {
    const [{ data: listaTecnicos }, { data: listaContratos }, { data: listaPlanes }] = await Promise.all([
      apiClient.get<Tecnico[]>("/tecnicos"),
      apiClient.get<Contrato[]>("/contratos"),
      apiClient.get<Plan[]>("/planes", { params: { soloActivos: true } }),
    ]);
    setTecnicos(listaTecnicos.filter((t) => t.activo));
    setContratos(listaContratos);
    setPlanes(listaPlanes);
  };

  useEffect(() => {
    cargarCatalogos();
  }, []);

  useEffect(() => {
    cargarOrdenes(filtroEstado);
  }, [filtroEstado]);

  const actualizarCampo = <K extends keyof typeof formularioVacio>(campo: K, valor: (typeof formularioVacio)[K]) => {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  };

  const limpiarFormulario = () => {
    setForm(formularioVacio);
    setMostrarFormulario(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await apiClient.post("/ordenes-servicio", {
        tipoOrden: form.tipoOrden,
        tipoServicio: form.tipoServicio,
        contratoId: form.contratoId || undefined,
        fechaServicio: form.fechaServicio,
        abonado: form.abonado,
        dni: form.dni || undefined,
        direccion: form.direccion,
        referencia: form.referencia || undefined,
        sector: form.sector || undefined,
        celular: form.celular || undefined,
        observacion: form.observacion || undefined,
        tecnicoId: form.tecnicoId || undefined,
        planId: form.planId || undefined,
      });
      limpiarFormulario();
      await cargarOrdenes(filtroEstado);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No se pudo crear la orden");
    } finally {
      setGuardando(false);
    }
  };

  const handleAsignar = async (orden: OrdenServicio) => {
    const tecnico = prompt(
      `Asignar técnico a ${orden.nServicio}. Técnicos disponibles:\n${tecnicos.map((t) => `${t.nombre} ${t.apellido}`).join(", ")}\n\nEscribe el nombre exacto:`,
    );
    if (!tecnico) return;
    const encontrado = tecnicos.find((t) => `${t.nombre} ${t.apellido}`.toLowerCase() === tecnico.trim().toLowerCase());
    if (!encontrado) {
      mostrarError("No se encontró ese técnico");
      return;
    }
    try {
      await apiClient.post(`/ordenes-servicio/${orden.id}/asignar`, { tecnicoId: encontrado.id });
      await cargarOrdenes(filtroEstado);
    } catch (err: any) {
      mostrarError(err?.response?.data?.message ?? "No se pudo asignar el técnico");
    }
  };

  const handleCancelar = async (orden: OrdenServicio) => {
    if (!confirm(`¿Cancelar la orden ${orden.nServicio}?`)) return;
    try {
      await apiClient.post(`/ordenes-servicio/${orden.id}/cancelar`);
      await cargarOrdenes(filtroEstado);
    } catch (err: any) {
      mostrarError(err?.response?.data?.message ?? "No se pudo cancelar la orden");
    }
  };

  const chipEstado = (estado: EstadoOrdenServicio) =>
    estado === "completada"
      ? "bg-success-bg text-success"
      : estado === "cancelada"
        ? "bg-neutral-chip-bg text-neutral-chip"
        : estado === "en_proceso"
          ? "bg-warning-bg text-warning"
          : "bg-primary-tint text-primary";

  return (
    <AppShell>
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <h1 className="font-serif text-[32px] font-normal tracking-[-0.01em] text-ink">Órdenes de servicio</h1>
          <p className="mt-1 text-sm text-ink-weak">Instalaciones, averías y demás trabajos de campo asignados a los técnicos.</p>
        </div>
        {!mostrarFormulario && (
          <button
            onClick={() => setMostrarFormulario(true)}
            className="rounded-[9px] bg-primary hover:bg-primary-hover transition-colors px-4 py-2.5 text-sm font-semibold text-white"
          >
            Nueva orden
          </button>
        )}
      </div>

      {mostrarFormulario && (
        <form onSubmit={handleSubmit} className="mt-5 rounded-lg border border-border bg-surface p-5 shadow-card">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Tipo de orden</label>
              <select
                value={form.tipoOrden}
                onChange={(event) => actualizarCampo("tipoOrden", event.target.value as TipoOrdenServicio)}
                className="w-full rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              >
                {TIPOS_ORDEN.map((opcion) => (
                  <option key={opcion.valor} value={opcion.valor}>
                    {opcion.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Servicio</label>
              <div className="flex gap-1.5">
                {TIPOS_SERVICIO.map((opcion) => (
                  <button
                    key={opcion.valor}
                    type="button"
                    onClick={() => actualizarCampo("tipoServicio", opcion.valor)}
                    className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      form.tipoServicio === opcion.valor ? "bg-primary text-white" : "border border-border-field text-ink-2 hover:bg-surface-subtle"
                    }`}
                  >
                    {opcion.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Fecha programada</label>
              <input
                required
                type="date"
                value={form.fechaServicio}
                onChange={(event) => actualizarCampo("fechaServicio", event.target.value)}
                className="w-full rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <Campo label="Abonado" valor={form.abonado} onChange={(v) => actualizarCampo("abonado", v)} required />
            <Campo label="DNI" valor={form.dni} onChange={(v) => actualizarCampo("dni", v)} />
            <Campo label="Celular" valor={form.celular} onChange={(v) => actualizarCampo("celular", v)} />
            <div className="col-span-2 md:col-span-3">
              <Campo label="Dirección" valor={form.direccion} onChange={(v) => actualizarCampo("direccion", v)} required />
            </div>
            <Campo label="Referencia" valor={form.referencia} onChange={(v) => actualizarCampo("referencia", v)} />
            <Campo label="Sector" valor={form.sector} onChange={(v) => actualizarCampo("sector", v)} />
            <div>
              <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Contrato relacionado</label>
              <select
                value={form.contratoId}
                onChange={(event) => actualizarCampo("contratoId", event.target.value)}
                className="w-full rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Ninguno (instalación nueva)</option>
                {contratos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.servicioContratado.cliente.nombreCompleto}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Plan sugerido</label>
              <select
                value={form.planId}
                onChange={(event) => actualizarCampo("planId", event.target.value)}
                className="w-full rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Sin especificar</option>
                {planes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Técnico (opcional)</label>
              <select
                value={form.tecnicoId}
                onChange={(event) => actualizarCampo("tecnicoId", event.target.value)}
                className="w-full rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Sin asignar (queda pendiente)</option>
                {tecnicos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} {t.apellido}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 md:col-span-3">
              <Campo label="Observación" valor={form.observacion} onChange={(v) => actualizarCampo("observacion", v)} />
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-error">{error}</p>}
          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={guardando}
              className="rounded-[9px] bg-primary hover:bg-primary-hover transition-colors px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Crear orden
            </button>
            <button type="button" onClick={limpiarFormulario} className="text-sm text-ink-weak underline">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="mt-5 flex gap-1.5">
        <button
          onClick={() => setFiltroEstado("")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filtroEstado === "" ? "bg-primary text-white" : "border border-border-field text-ink-2 hover:bg-surface-subtle"}`}
        >
          Todas
        </button>
        {(Object.keys(ESTADOS_LABEL) as EstadoOrdenServicio[]).map((estado) => (
          <button
            key={estado}
            onClick={() => setFiltroEstado(estado)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filtroEstado === estado ? "bg-primary text-white" : "border border-border-field text-ink-2 hover:bg-surface-subtle"}`}
          >
            {ESTADOS_LABEL[estado]}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface shadow-card">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-subtle text-left text-[11.5px] uppercase tracking-[.05em] text-ink-weak">
              <th className="px-4 py-2.5 font-medium">N°</th>
              <th className="px-4 py-2.5 font-medium">Tipo</th>
              <th className="px-4 py-2.5 font-medium">Abonado</th>
              <th className="px-4 py-2.5 font-medium">Fecha</th>
              <th className="px-4 py-2.5 font-medium">Técnico</th>
              <th className="px-4 py-2.5 font-medium">Estado</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {ordenes.map((orden) => (
              <tr key={orden.id} className="border-b border-divider last:border-0 hover:bg-row-hover">
                <td className="px-4 py-2.5 text-ink">{orden.nServicio}</td>
                <td className="px-4 py-2.5 text-ink-2">{TIPOS_ORDEN.find((t) => t.valor === orden.tipoOrden)?.label ?? orden.tipoOrden}</td>
                <td className="px-4 py-2.5 text-ink-2">
                  {orden.abonado}
                  {orden.direccion && <div className="text-xs text-ink-weak">{orden.direccion}</div>}
                </td>
                <td className="px-4 py-2.5 text-ink-2">{new Date(orden.fechaServicio).toLocaleDateString("es-PE")}</td>
                <td className="px-4 py-2.5 text-ink-2">{orden.tecnico ? `${orden.tecnico.nombre} ${orden.tecnico.apellido}` : "—"}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-[5px] px-2 py-0.5 text-xs ${chipEstado(orden.estado)}`}>{ESTADOS_LABEL[orden.estado]}</span>
                </td>
                <td className="px-4 py-2.5 text-right text-xs">
                  {(orden.estado === "pendiente" || orden.estado === "asignada") && (
                    <button onClick={() => handleAsignar(orden)} className="mr-2 text-primary hover:underline">
                      {orden.tecnico ? "Reasignar" : "Asignar"}
                    </button>
                  )}
                  {orden.estado !== "completada" && orden.estado !== "cancelada" && (
                    <button onClick={() => handleCancelar(orden)} className="text-error hover:underline">
                      Cancelar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {ordenes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-ink-weak">
                  No hay órdenes de servicio con este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function Campo({ label, valor, onChange, required }: { label: string; valor: string; onChange: (valor: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">{label}</label>
      <input
        required={required}
        value={valor}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
      />
    </div>
  );
}
