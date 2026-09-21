import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { apiClient } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useConfig } from "../config/ConfigContext";
import { useConfirm } from "../components/ConfirmContext";
import { useMostrarError } from "../components/ToastContext";
import type { ClienteFicha, EstadoCargo, EstadoServicioTecnico, ServicioTecnico, TipoServicio, Zona } from "../api/types";
import { formatFechaCorta } from "../utils/fechaPeru";

const ESTADO_CHIP: Record<string, string> = {
  activo: "bg-success-bg text-success",
  suspendido: "bg-warning-bg text-warning",
  retirado: "bg-neutral-chip-bg text-neutral-chip",
};

const CARGO_CHIP: Record<EstadoCargo, string> = {
  pendiente: "bg-error-bg text-error",
  parcial: "bg-warning-bg text-warning",
  pagado: "bg-success-bg text-success",
};

const SERVICIO_CHIP: Record<EstadoServicioTecnico, string> = {
  pendiente: "bg-error-bg text-error",
  liquidado: "bg-success-bg text-success",
};

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"];

const LABEL_CLASE = "mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3";
const INPUT_CLASE =
  "w-full rounded-lg border border-border-field px-3 py-2.5 text-sm text-ink focus:border-primary focus:outline-none";

export function ClienteFichaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { configuracion } = useConfig();
  const confirmar = useConfirm();
  const mostrarError = useMostrarError();
  const esGestor = usuario?.rol === "gestor";

  const [ficha, setFicha] = useState<ClienteFicha | null>(null);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [tiposServicio, setTiposServicio] = useState<TipoServicio[]>([]);
  const [serviciosTecnicos, setServiciosTecnicos] = useState<ServicioTecnico[]>([]);
  const [editando, setEditando] = useState(false);
  const [mostrarDescuento, setMostrarDescuento] = useState(false);
  const [porcentajeDescuento, setPorcentajeDescuento] = useState("10");
  const [mesesDescuento, setMesesDescuento] = useState("1");
  const [errorDescuento, setErrorDescuento] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombreCompleto: "",
    dni: "",
    telefono: "",
    direccion: "",
    zonaId: "",
    tipoServicioId: "",
    montoBase: "",
    fechaFacturacionOverride: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    const { data } = await apiClient.get<ClienteFicha>(`/clientes/${id}/ficha`);
    setFicha(data);
    setForm({
      nombreCompleto: data.cliente.nombreCompleto,
      dni: data.cliente.dni ?? "",
      telefono: data.cliente.telefono ?? "",
      direccion: data.cliente.direccion ?? "",
      zonaId: data.cliente.zonaId,
      tipoServicioId: data.cliente.tipoServicioId,
      montoBase: String(data.cliente.montoBase),
      fechaFacturacionOverride: data.cliente.fechaFacturacionOverride ? String(data.cliente.fechaFacturacionOverride) : "",
    });
  };

  const cargarServiciosTecnicos = async () => {
    const { data } = await apiClient.get<ServicioTecnico[]>("/servicios-tecnicos", { params: { clienteId: id } });
    setServiciosTecnicos(data);
  };

  const comentarServicio = async (servicio: ServicioTecnico) => {
    const comentario = window.prompt("Comentario:");
    if (!comentario) return;
    try {
      await apiClient.post(`/servicios-tecnicos/${servicio.id}/comentar`, { comentario });
      await cargarServiciosTecnicos();
    } catch (err: any) {
      mostrarError(err?.response?.data?.message ?? "No se pudo guardar el comentario");
    }
  };

  const liquidarServicio = async (servicio: ServicioTecnico) => {
    const confirmado = await confirmar(`¿Liquidar el servicio ${servicio.folio}?`, { titulo: "Liquidar servicio", textoConfirmar: "Liquidar" });
    if (!confirmado) return;
    const comentarioFinal = window.prompt("Comentario al terminar (opcional):") ?? undefined;
    try {
      await apiClient.post(`/servicios-tecnicos/${servicio.id}/liquidar`, { comentarioFinal: comentarioFinal || undefined });
      await cargarServiciosTecnicos();
    } catch (err: any) {
      mostrarError(err?.response?.data?.message ?? "No se pudo liquidar el servicio");
    }
  };

  useEffect(() => {
    // Al navegar de la ficha de un cliente a la de otro (mismo componente, cambia el :id),
    // se cierran los paneles de edición/descuento que hubieran quedado abiertos.
    setEditando(false);
    setMostrarDescuento(false);
    setError(null);
    setErrorDescuento(null);
    cargar();
    cargarServiciosTecnicos();
    apiClient.get<Zona[]>("/zonas").then(({ data }) => setZonas(data));
    apiClient.get<TipoServicio[]>("/tipos-servicio").then(({ data }) => setTiposServicio(data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleGuardarEdicion = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await apiClient.patch(`/clientes/${id}`, {
        nombreCompleto: form.nombreCompleto,
        dni: form.dni || undefined,
        telefono: form.telefono || undefined,
        direccion: form.direccion || undefined,
        zonaId: form.zonaId,
        tipoServicioId: form.tipoServicioId,
        montoBase: Number(form.montoBase),
        fechaFacturacionOverride: form.fechaFacturacionOverride ? Number(form.fechaFacturacionOverride) : undefined,
      });
      setEditando(false);
      await cargar();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No se pudo guardar el cliente");
    } finally {
      setGuardando(false);
    }
  };

  const handleSuspenderOActivar = async () => {
    if (!ficha) return;
    const accion = ficha.cliente.estadoServicio === "suspendido" ? "activar" : "suspender";
    try {
      await apiClient.post(`/clientes/${id}/${accion}`);
      await cargar();
    } catch (err: any) {
      mostrarError(err?.response?.data?.message ?? "No se pudo actualizar el estado del cliente");
    }
  };

  const handleDarDeBaja = async () => {
    const motivo = window.prompt("Motivo de la baja:");
    if (!motivo) return;
    try {
      await apiClient.post(`/clientes/${id}/baja`, { motivo });
      await cargar();
    } catch (err: any) {
      mostrarError(err?.response?.data?.message ?? "No se pudo dar de baja al cliente");
    }
  };

  const handleAplicarDescuento = async () => {
    setErrorDescuento(null);
    try {
      await apiClient.post(`/clientes/${id}/descuentos`, {
        porcentaje: Number(porcentajeDescuento),
        cantidadMeses: Number(mesesDescuento),
      });
      setMostrarDescuento(false);
      await cargar();
    } catch (err: any) {
      setErrorDescuento(err?.response?.data?.message ?? "No se pudo aplicar el descuento");
    }
  };

  if (!ficha) {
    return (
      <AppShell>
        <p className="text-sm text-ink-2">Cargando...</p>
      </AppShell>
    );
  }

  const { cliente } = ficha;
  const cargosConSaldo = ficha.cargosMesAMes.filter((cargo) => cargo.saldo > 0);

  return (
    <AppShell>
      <Link
        to="/clientes"
        className="inline-flex items-center gap-1 rounded-[9px] border border-border-field px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-subtle"
      >
        ← Volver a clientes
      </Link>

      <div className="mt-3 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">
        <div className="rounded-lg border border-border bg-surface p-6 shadow-card">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-[30px] font-normal tracking-[-0.01em] text-ink">{cliente.nombreCompleto}</h1>
            <span className={`rounded-[5px] px-2 py-0.5 text-xs font-medium capitalize ${ESTADO_CHIP[cliente.estadoServicio]}`}>
              {cliente.estadoServicio}
            </span>
          </div>
          <p className="mt-1 font-mono text-sm text-ink-weak">
            {cliente.dni ?? "sin DNI"} {cliente.telefono ? `· ${cliente.telefono}` : ""}
          </p>

          {!editando ? (
            <>
              <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-ink-weak">Zona</p>
                  <p className="text-ink">{cliente.zona.nombre}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-weak">Servicio</p>
                  <p className="capitalize text-ink">{cliente.tipoServicio.nombre}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-weak">Monto base</p>
                  <p className="font-mono text-ink">
                    S/ {cliente.montoBase.toFixed(2)}
                    {ficha.descuentoVigente && (
                      <span className="ml-1 text-xs text-ink-weak">
                        (efectivo S/ {ficha.montoEfectivo.toFixed(2)})
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink-weak">Facturación</p>
                  <p className="text-ink">
                    Día {cliente.fechaFacturacionOverride ?? configuracion?.fechaFacturacionGlobal}
                    {cliente.fechaFacturacionOverride ? " (propia)" : " (global)"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink-weak">Alta</p>
                  <p className="text-ink">{new Date(cliente.fechaAlta).toLocaleDateString("es-PE")}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-weak">Dirección</p>
                  <p className="text-ink">{cliente.direccion ?? "—"}</p>
                </div>
              </div>

              {ficha.descuentoVigente && (
                <div className="mt-4 rounded-lg bg-primary-tint px-4 py-3">
                  <p className="text-sm font-semibold text-primary">Descuento {ficha.descuentoVigente.porcentaje}% vigente</p>
                  <p className="text-xs text-primary">
                    desde {MESES[new Date(ficha.descuentoVigente.fechaInicio).getMonth()].toLowerCase()}.{" "}
                    {new Date(ficha.descuentoVigente.fechaInicio).getFullYear()}
                    {ficha.descuentoVigente.cantidadMeses ? ` · ${ficha.descuentoVigente.cantidadMeses} meses` : ""} · mensual
                    efectivo S/ {ficha.montoEfectivo.toFixed(2)}
                  </p>
                </div>
              )}

              {esGestor && cliente.estadoServicio !== "retirado" && !mostrarDescuento && (
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    onClick={() => setEditando(true)}
                    className="rounded-[9px] border border-border-field px-3.5 py-2 text-sm font-medium text-ink-2 hover:bg-surface-subtle transition-colors"
                  >
                    Editar datos
                  </button>
                  <button
                    onClick={() => setMostrarDescuento(true)}
                    className="rounded-[9px] border border-border-field px-3.5 py-2 text-sm font-medium text-ink-2 hover:bg-surface-subtle transition-colors"
                  >
                    Aplicar descuento
                  </button>
                  <button
                    onClick={handleSuspenderOActivar}
                    className="rounded-[9px] border border-border-field px-3.5 py-2 text-sm font-medium text-ink-2 hover:bg-surface-subtle transition-colors"
                  >
                    {cliente.estadoServicio === "suspendido" ? "Activar" : "Suspender"}
                  </button>
                  <button
                    onClick={handleDarDeBaja}
                    className="rounded-[9px] border border-error-border px-3.5 py-2 text-sm font-medium text-error hover:bg-error-bg"
                  >
                    Dar de baja
                  </button>
                </div>
              )}

              {mostrarDescuento && (
                <div className="mt-5 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface-subtle p-4">
                  <div>
                    <label className={LABEL_CLASE}>Porcentaje</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={porcentajeDescuento}
                      onChange={(event) => setPorcentajeDescuento(event.target.value)}
                      className={`${INPUT_CLASE} w-24`}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASE}>Meses de vigencia</label>
                    <input
                      type="number"
                      min={1}
                      value={mesesDescuento}
                      onChange={(event) => setMesesDescuento(event.target.value)}
                      className={`${INPUT_CLASE} w-24`}
                    />
                  </div>
                  <button
                    onClick={handleAplicarDescuento}
                    className="rounded-[9px] bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
                  >
                    Aplicar
                  </button>
                  <button type="button" onClick={() => setMostrarDescuento(false)} className="text-sm text-ink-weak underline">
                    Cancelar
                  </button>
                  {errorDescuento && <p className="w-full text-sm text-error">{errorDescuento}</p>}
                </div>
              )}
              {cliente.estadoServicio === "retirado" && cliente.motivoBaja && (
                <p className="mt-4 rounded-lg bg-neutral-chip-bg px-3 py-2 text-xs text-neutral-chip">
                  Dado de baja el {cliente.fechaBaja && new Date(cliente.fechaBaja).toLocaleDateString("es-PE")}: {cliente.motivoBaja}
                </p>
              )}
            </>
          ) : (
            <form onSubmit={handleGuardarEdicion} className="mt-5 grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLASE}>Nombre completo</label>
                <input
                  required
                  value={form.nombreCompleto}
                  onChange={(event) => setForm({ ...form, nombreCompleto: event.target.value })}
                  className={INPUT_CLASE}
                />
              </div>
              <div>
                <label className={LABEL_CLASE}>DNI</label>
                <input value={form.dni} onChange={(event) => setForm({ ...form, dni: event.target.value })} className={INPUT_CLASE} />
              </div>
              <div>
                <label className={LABEL_CLASE}>Teléfono</label>
                <input
                  value={form.telefono}
                  onChange={(event) => setForm({ ...form, telefono: event.target.value })}
                  className={INPUT_CLASE}
                />
              </div>
              <div>
                <label className={LABEL_CLASE}>Dirección</label>
                <input
                  value={form.direccion}
                  onChange={(event) => setForm({ ...form, direccion: event.target.value })}
                  className={INPUT_CLASE}
                />
              </div>
              <div>
                <label className={LABEL_CLASE}>Zona</label>
                <select value={form.zonaId} onChange={(event) => setForm({ ...form, zonaId: event.target.value })} className={INPUT_CLASE}>
                  {zonas.map((zona) => (
                    <option key={zona.id} value={zona.id}>
                      {zona.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLASE}>Tipo de servicio</label>
                <select
                  value={form.tipoServicioId}
                  onChange={(event) => setForm({ ...form, tipoServicioId: event.target.value })}
                  className={INPUT_CLASE}
                >
                  {tiposServicio.map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLASE}>Monto base (S/)</label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={form.montoBase}
                  onChange={(event) => setForm({ ...form, montoBase: event.target.value })}
                  className={INPUT_CLASE}
                />
              </div>
              <div>
                <label className={LABEL_CLASE}>Día de facturación propio</label>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={form.fechaFacturacionOverride}
                  onChange={(event) => setForm({ ...form, fechaFacturacionOverride: event.target.value })}
                  className={INPUT_CLASE}
                />
              </div>

              {error && <p className="col-span-2 text-sm text-error">{error}</p>}

              <div className="col-span-2 flex gap-3">
                <button
                  type="submit"
                  disabled={guardando}
                  className="rounded-[9px] bg-primary hover:bg-primary-hover transition-colors px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Guardar cambios
                </button>
                <button type="button" onClick={() => setEditando(false)} className="text-sm text-ink-weak underline">
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="rounded-lg border border-border bg-surface p-6 shadow-card">
          <p className="text-[11.5px] uppercase tracking-[.07em] text-ink-weak">Saldo total</p>
          <p className="mt-1 font-mono text-[40px] font-bold leading-none tracking-wider text-error">
            S/ {ficha.saldoTotal.toFixed(2)}
          </p>
          {cargosConSaldo.length > 0 && (
            <p className="mt-1 text-[12.5px] text-ink-weak">
              {cargosConSaldo.length} {cargosConSaldo.length === 1 ? "cargo" : "cargos"} con saldo · el más antiguo de{" "}
              {MESES[cargosConSaldo[0].mes - 1].toLowerCase()} {cargosConSaldo[0].anio}
            </p>
          )}
          <button
            onClick={() => navigate(`/pagos/nuevo?clienteId=${cliente.id}`)}
            className="mt-5 w-full rounded-[9px] bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Registrar pago
          </button>
        </div>
      </div>

      <h2 className="mt-6 text-[16px] font-semibold text-ink">Deuda mes a mes</h2>
      {(() => {
        const cargosPendientes = ficha.cargosMesAMes.filter((cargo) => cargo.estado !== "pagado");
        if (cargosPendientes.length === 0) {
          return <p className="mt-3 text-sm text-ink-weak">Sin meses pendientes: el cliente está al día.</p>;
        }
        return (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {cargosPendientes.map((cargo) => (
              <div key={cargo.id} className="rounded-lg border border-border bg-surface p-3 shadow-card">
                <p className="text-xs text-ink-weak">
                  {MESES[cargo.mes - 1]} {cargo.anio}
                </p>
                <p className="mt-1 font-mono font-semibold text-ink">S/ {cargo.montoCorrespondiente.toFixed(2)}</p>
                <span className={`mt-1 inline-block rounded-[5px] px-2 py-0.5 text-xs font-medium capitalize ${CARGO_CHIP[cargo.estado]}`}>
                  {cargo.estado}
                </span>
              </div>
            ))}
          </div>
        );
      })()}

      <h2 className="mt-6 text-[16px] font-semibold text-ink">Historial de pagos</h2>
      <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-surface shadow-card">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-subtle text-left text-[11.5px] uppercase tracking-[.05em] text-ink-weak">
              <th className="px-4 py-2.5 font-medium">Boleta</th>
              <th className="px-4 py-2.5 font-medium">Fecha</th>
              <th className="px-4 py-2.5 font-medium">Concepto</th>
              <th className="px-4 py-2.5 font-medium">Método</th>
              <th className="px-4 py-2.5 font-medium">Monto</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {ficha.historialPagos.map((boleta) => (
              <tr key={boleta.id} className="border-b border-divider last:border-0">
                <td className="px-4 py-2.5 font-mono font-semibold text-ink">{boleta.folio}</td>
                <td className="px-4 py-2.5 text-ink-2">{new Date(boleta.fecha).toLocaleDateString("es-PE")}</td>
                <td className="px-4 py-2.5 text-ink-2">{boleta.concepto}</td>
                <td className="px-4 py-2.5 capitalize text-ink-2">{boleta.metodoPago}</td>
                <td className="px-4 py-2.5">
                  <p className="font-mono text-ink">S/ {boleta.montoTotal.toFixed(2)}</p>
                  {boleta.estado === "anulada" && <span className="text-xs text-error">Anulada</span>}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Link
                    to={`/boletas/${boleta.id}`}
                    className="rounded-lg border border-border-field px-3 py-1.5 text-xs font-semibold text-ink-2 transition-colors hover:bg-surface-subtle"
                  >
                    Ver boleta
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ficha.historialPagos.length === 0 && <p className="p-4 text-sm text-ink-weak">Sin pagos registrados todavía.</p>}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-ink">Servicios técnicos</h2>
        <Link
          to={`/servicios/nuevo?clienteId=${cliente.id}`}
          className="rounded-[9px] border border-border-field px-3.5 py-2 text-sm font-medium text-ink-2 hover:bg-surface-subtle transition-colors"
        >
          + Nuevo servicio
        </Link>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {serviciosTecnicos.map((servicio) => (
          <div key={servicio.id} className="rounded-lg border border-border bg-surface p-3.5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-ink">{servicio.folio}</span>
                <span className="text-sm capitalize text-ink-2">{servicio.tipo}</span>
                <span className={`inline-block rounded-[5px] px-2 py-0.5 text-xs font-medium capitalize ${SERVICIO_CHIP[servicio.estado]}`}>
                  {servicio.estado.replace("_", " ")}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => comentarServicio(servicio)}
                  className="rounded-lg border border-border-field px-3 py-1.5 text-xs font-semibold text-ink-2 transition-colors hover:bg-surface-subtle"
                >
                  Comentar
                </button>
                {servicio.estado !== "liquidado" && (
                  <button
                    onClick={() => liquidarServicio(servicio)}
                    className="rounded-lg border border-success/30 px-3 py-1.5 text-xs font-semibold text-success transition-colors hover:bg-success-bg"
                  >
                    Liquidar
                  </button>
                )}
              </div>
            </div>
            <p className="mt-1 text-xs text-ink-weak">
              Creado {formatFechaCorta(servicio.fechaCreacion)}
              {servicio.fechaLiquidacion ? ` · Liquidado ${formatFechaCorta(servicio.fechaLiquidacion)}` : ""}
            </p>
            {servicio.comentario && <p className="mt-1 text-xs text-ink-2">Al iniciar: {servicio.comentario}</p>}
            {servicio.comentarioFinal && <p className="mt-0.5 text-xs text-ink-2">Al terminar: {servicio.comentarioFinal}</p>}
          </div>
        ))}
        {serviciosTecnicos.length === 0 && <p className="text-sm text-ink-weak">Sin servicios técnicos registrados.</p>}
      </div>
    </AppShell>
  );
}
