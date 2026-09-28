import { useEffect, useState, type FormEvent } from "react";
import { AppShell } from "../components/AppShell";
import { apiClient } from "../api/client";
import { useMostrarError } from "../components/ToastContext";
import type { Contrato, EstadoContrato, Producto, PuntoRed, Tecnico } from "../api/types";

// Forma mínima que necesitamos de /clientes acá — el tipo `Cliente` compartido ya no refleja
// la forma real de la respuesta (que trae varios servicios por cliente), así que se define
// localmente en vez de forzar un cambio más amplio fuera del alcance de este módulo.
interface ClienteConServicios {
  id: string;
  nombreCompleto: string;
  numeroContrato: string;
  serviciosContratados: { id: string; tipoServicio: { nombre: string }; estado: string }[];
}

interface ServicioDisponible {
  servicioContratadoId: string;
  etiqueta: string;
}

const ESTADOS_LABEL: Record<EstadoContrato, string> = {
  activo: "Activo",
  suspendido: "Suspendido",
  cortado: "Cortado",
  baja: "Dado de baja",
};

const formularioVacio = {
  servicioContratadoId: "",
  puntoRedId: "",
  tecnicoInstaladorId: "",
  equipoProductoId: "",
  equipoSerie: "",
  direccion: "",
  referencia: "",
  sector: "",
  ipWan: "",
  mascara: "",
  gateway: "",
  pppoeUsuario: "",
  pppoePassword: "",
  precinto: "",
};

export function ContratosPage() {
  const mostrarError = useMostrarError();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [ctos, setCtos] = useState<PuntoRed[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [equipos, setEquipos] = useState<Producto[]>([]);
  const [serviciosDisponibles, setServiciosDisponibles] = useState<ServicioDisponible[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [form, setForm] = useState(formularioVacio);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargarTodo = async () => {
    const [{ data: listaContratos }, { data: listaPuntos }, { data: listaClientes }, { data: listaTecnicos }, { data: listaEquipos }] = await Promise.all([
      apiClient.get<Contrato[]>("/contratos"),
      apiClient.get<PuntoRed[]>("/puntos-red"),
      apiClient.get<ClienteConServicios[]>("/clientes"),
      apiClient.get<Tecnico[]>("/tecnicos"),
      apiClient.get<Producto[]>("/productos", { params: { soloActivos: true } }),
    ]);
    setContratos(listaContratos);
    setCtos(listaPuntos.filter((p) => p.tipo === "cto"));
    setTecnicos(listaTecnicos.filter((t) => t.activo));
    setEquipos(listaEquipos);

    const contratados = new Set(listaContratos.map((c) => c.servicioContratadoId));
    const disponibles: ServicioDisponible[] = [];
    for (const cliente of listaClientes) {
      for (const servicio of cliente.serviciosContratados) {
        if (servicio.estado !== "activo" || contratados.has(servicio.id)) continue;
        disponibles.push({
          servicioContratadoId: servicio.id,
          etiqueta: `${cliente.numeroContrato} — ${cliente.nombreCompleto} (${servicio.tipoServicio.nombre})`,
        });
      }
    }
    setServiciosDisponibles(disponibles);
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  const limpiarFormulario = () => {
    setForm(formularioVacio);
    setEditandoId(null);
    setMostrarFormulario(false);
  };

  const actualizarCampo = <K extends keyof typeof formularioVacio>(campo: K, valor: (typeof formularioVacio)[K]) => {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const payload = {
        ...(editandoId ? {} : { servicioContratadoId: form.servicioContratadoId }),
        puntoRedId: form.puntoRedId || undefined,
        tecnicoInstaladorId: form.tecnicoInstaladorId || undefined,
        equipoProductoId: form.equipoProductoId || undefined,
        direccion: form.direccion || undefined,
        referencia: form.referencia || undefined,
        sector: form.sector || undefined,
        ipWan: form.ipWan || undefined,
        mascara: form.mascara || undefined,
        gateway: form.gateway || undefined,
        pppoeUsuario: form.pppoeUsuario || undefined,
        pppoePassword: form.pppoePassword || undefined,
        precinto: form.precinto || undefined,
        equipoSerie: form.equipoSerie || undefined,
      };
      if (editandoId) {
        await apiClient.patch(`/contratos/${editandoId}`, payload);
      } else {
        await apiClient.post("/contratos", payload);
      }
      limpiarFormulario();
      await cargarTodo();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No se pudo guardar el contrato");
    } finally {
      setGuardando(false);
    }
  };

  const handleEditar = (contrato: Contrato) => {
    setEditandoId(contrato.id);
    setMostrarFormulario(true);
    setForm({
      servicioContratadoId: contrato.servicioContratadoId,
      puntoRedId: contrato.puntoRedId ?? "",
      tecnicoInstaladorId: contrato.tecnicoInstaladorId ?? "",
      equipoProductoId: contrato.equipoProductoId ?? "",
      direccion: contrato.direccion ?? "",
      referencia: contrato.referencia ?? "",
      sector: contrato.sector ?? "",
      ipWan: contrato.ipWan ?? "",
      mascara: contrato.mascara ?? "",
      gateway: contrato.gateway ?? "",
      pppoeUsuario: contrato.pppoeUsuario ?? "",
      pppoePassword: contrato.pppoePassword ?? "",
      precinto: contrato.precinto ?? "",
      equipoSerie: contrato.equipoSerie ?? "",
    });
  };

  const cambiarEstado = async (contrato: Contrato, accion: "suspender" | "activar" | "cortar") => {
    try {
      await apiClient.post(`/contratos/${contrato.id}/${accion}`);
      await cargarTodo();
    } catch (err: any) {
      mostrarError(err?.response?.data?.message ?? "No se pudo actualizar el estado del contrato");
    }
  };

  const handleBaja = async (contrato: Contrato) => {
    const motivo = prompt(`Motivo de la baja del contrato de ${contrato.servicioContratado.cliente.nombreCompleto}:`);
    if (!motivo || motivo.trim().length < 3) return;
    try {
      await apiClient.post(`/contratos/${contrato.id}/baja`, { motivo: motivo.trim() });
      await cargarTodo();
    } catch (err: any) {
      mostrarError(err?.response?.data?.message ?? "No se pudo dar de baja el contrato");
    }
  };

  const chipEstado = (estado: EstadoContrato) =>
    estado === "activo"
      ? "bg-success-bg text-success"
      : estado === "suspendido" || estado === "cortado"
        ? "bg-warning-bg text-warning"
        : "bg-neutral-chip-bg text-neutral-chip";

  return (
    <AppShell>
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <h1 className="font-serif text-[32px] font-normal tracking-[-0.01em] text-ink">Contratos</h1>
          <p className="mt-1 text-sm text-ink-weak">Ficha técnica de instalación: red, PPPoE, equipo y ubicación de cada servicio.</p>
        </div>
        {!mostrarFormulario && (
          <button
            onClick={() => setMostrarFormulario(true)}
            className="rounded-[9px] bg-primary hover:bg-primary-hover transition-colors px-4 py-2.5 text-sm font-semibold text-white"
          >
            Nuevo contrato
          </button>
        )}
      </div>

      {mostrarFormulario && (
        <form onSubmit={handleSubmit} className="mt-5 rounded-lg border border-border bg-surface p-5 shadow-card">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {!editandoId && (
              <div className="col-span-2 md:col-span-3">
                <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Servicio contratado</label>
                <select
                  required
                  value={form.servicioContratadoId}
                  onChange={(event) => actualizarCampo("servicioContratadoId", event.target.value)}
                  className="w-full rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">Selecciona un servicio sin ficha técnica...</option>
                  {serviciosDisponibles.map((s) => (
                    <option key={s.servicioContratadoId} value={s.servicioContratadoId}>
                      {s.etiqueta}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">CTO</label>
              <select
                value={form.puntoRedId}
                onChange={(event) => actualizarCampo("puntoRedId", event.target.value)}
                className="w-full rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Sin asignar</option>
                {ctos.map((cto) => (
                  <option key={cto.id} value={cto.id}>
                    {cto.codigo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Técnico instalador</label>
              <select
                value={form.tecnicoInstaladorId}
                onChange={(event) => actualizarCampo("tecnicoInstaladorId", event.target.value)}
                className="w-full rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Sin asignar</option>
                {tecnicos.map((tecnico) => (
                  <option key={tecnico.id} value={tecnico.id}>
                    {tecnico.nombre} {tecnico.apellido}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Equipo instalado</label>
              <select
                value={form.equipoProductoId}
                onChange={(event) => actualizarCampo("equipoProductoId", event.target.value)}
                className="w-full rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Sin especificar</option>
                {equipos.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.nombre}
                  </option>
                ))}
              </select>
            </div>
            <Campo label="IP WAN" valor={form.ipWan} onChange={(v) => actualizarCampo("ipWan", v)} />
            <Campo label="Máscara" valor={form.mascara} onChange={(v) => actualizarCampo("mascara", v)} />
            <Campo label="Gateway" valor={form.gateway} onChange={(v) => actualizarCampo("gateway", v)} />
            <Campo label="Usuario PPPoE" valor={form.pppoeUsuario} onChange={(v) => actualizarCampo("pppoeUsuario", v)} />
            <Campo label="Clave PPPoE" valor={form.pppoePassword} onChange={(v) => actualizarCampo("pppoePassword", v)} />
            <Campo label="Serie del equipo" valor={form.equipoSerie} onChange={(v) => actualizarCampo("equipoSerie", v)} />
            <Campo label="Precinto" valor={form.precinto} onChange={(v) => actualizarCampo("precinto", v)} />
            <Campo label="Sector" valor={form.sector} onChange={(v) => actualizarCampo("sector", v)} />
            <Campo label="Referencia" valor={form.referencia} onChange={(v) => actualizarCampo("referencia", v)} />
            <div className="col-span-2 md:col-span-3">
              <Campo label="Dirección" valor={form.direccion} onChange={(v) => actualizarCampo("direccion", v)} />
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-error">{error}</p>}
          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={guardando}
              className="rounded-[9px] bg-primary hover:bg-primary-hover transition-colors px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {editandoId ? "Guardar cambios" : "Crear contrato"}
            </button>
            <button type="button" onClick={limpiarFormulario} className="text-sm text-ink-weak underline">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-surface shadow-card">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-subtle text-left text-[11.5px] uppercase tracking-[.05em] text-ink-weak">
              <th className="px-4 py-2.5 font-medium">Cliente</th>
              <th className="px-4 py-2.5 font-medium">Servicio</th>
              <th className="px-4 py-2.5 font-medium">IP / PPPoE</th>
              <th className="px-4 py-2.5 font-medium">CTO</th>
              <th className="px-4 py-2.5 font-medium">Estado</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {contratos.map((contrato) => (
              <tr key={contrato.id} className="border-b border-divider last:border-0 hover:bg-row-hover">
                <td className="px-4 py-2.5 text-ink">
                  {contrato.servicioContratado.cliente.nombreCompleto}
                  <div className="text-xs text-ink-weak">{contrato.servicioContratado.cliente.numeroContrato}</div>
                </td>
                <td className="px-4 py-2.5 text-ink-2">{contrato.servicioContratado.tipoServicio.nombre}</td>
                <td className="px-4 py-2.5 text-ink-2">
                  {contrato.ipWan ?? "—"}
                  {contrato.pppoeUsuario && <div className="text-xs text-ink-weak">{contrato.pppoeUsuario}</div>}
                </td>
                <td className="px-4 py-2.5 text-ink-2">
                  {contrato.puntoRed?.codigo ?? "—"}
                  {contrato.tecnicoInstalador && (
                    <div className="text-xs text-ink-weak">{contrato.tecnicoInstalador.nombre} {contrato.tecnicoInstalador.apellido}</div>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-[5px] px-2 py-0.5 text-xs ${chipEstado(contrato.estado)}`}>{ESTADOS_LABEL[contrato.estado]}</span>
                </td>
                <td className="px-4 py-2.5 text-right text-xs">
                  <button onClick={() => handleEditar(contrato)} className="mr-2 text-primary hover:underline">
                    Editar
                  </button>
                  {contrato.estado === "activo" && (
                    <>
                      <button onClick={() => cambiarEstado(contrato, "suspender")} className="mr-2 text-warning hover:underline">
                        Suspender
                      </button>
                      <button onClick={() => cambiarEstado(contrato, "cortar")} className="mr-2 text-error hover:underline">
                        Cortar
                      </button>
                    </>
                  )}
                  {(contrato.estado === "suspendido" || contrato.estado === "cortado") && (
                    <button onClick={() => cambiarEstado(contrato, "activar")} className="mr-2 text-primary hover:underline">
                      Reactivar
                    </button>
                  )}
                  {contrato.estado !== "baja" && (
                    <button onClick={() => handleBaja(contrato)} className="text-ink-weak hover:underline">
                      Dar de baja
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {contratos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-weak">
                  Aún no hay contratos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function Campo({ label, valor, onChange }: { label: string; valor: string; onChange: (valor: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">{label}</label>
      <input
        value={valor}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
      />
    </div>
  );
}
