import { useEffect, useState } from "react";
import { AppShell } from "../components/AppShell";
import { apiClient } from "../api/client";
import { useConfirm } from "../components/ConfirmContext";
import { useMostrarError } from "../components/ToastContext";
import type { CategoriaEgreso, GastoReportado, MetodoPago, MovimientoCaja, ResumenCaja, TendenciaMes, TipoMovimientoCaja } from "../api/types";
import { fechaLocalAInstanteLima, formatFechaHora, mesActualLima, rangoDelMes } from "../utils/fechaPeru";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"];

const METODOS: { valor: MetodoPago; label: string }[] = [
  { valor: "efectivo", label: "Efectivo" },
  { valor: "yape", label: "Yape" },
  { valor: "plin", label: "Plin" },
  { valor: "transferencia", label: "Transf." },
];

const SELECT_CLASE = "rounded-lg border border-border-field bg-surface px-3 py-2 text-sm font-medium text-ink-2 focus:border-primary focus:outline-none";

function GraficoTendencia({ datos }: { datos: TendenciaMes[] }) {
  const max = Math.max(1, ...datos.flatMap((d) => [d.ingresos, d.egresos]));
  const alturaMax = 130;

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[16px] font-semibold text-ink">Tendencia · últimos {datos.length} meses</h2>
        <div className="flex items-center gap-4 text-xs text-ink-weak">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-success" /> Ingresos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-error" /> Egresos
          </span>
        </div>
      </div>
      <div className="mt-5 flex items-end justify-between gap-2" style={{ height: alturaMax + 34 }}>
        {datos.map((d) => (
          <div key={`${d.anio}-${d.mes}`} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-[130px] items-end gap-1">
              <div
                className="w-4 rounded-t-sm bg-success sm:w-6"
                style={{ height: `${Math.max(2, (d.ingresos / max) * alturaMax)}px` }}
                title={`Ingresos ${MESES[d.mes]}: S/ ${d.ingresos.toFixed(2)}`}
              />
              <div
                className="w-4 rounded-t-sm bg-error sm:w-6"
                style={{ height: `${Math.max(2, (d.egresos / max) * alturaMax)}px` }}
                title={`Egresos ${MESES[d.mes]}: S/ ${d.egresos.toFixed(2)}`}
              />
            </div>
            <p className="text-[11px] font-medium text-ink-weak">
              {MESES[d.mes].slice(0, 3)} {String(d.anio).slice(2)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CajaPage() {
  const confirmar = useConfirm();
  const mostrarError = useMostrarError();
  const [mes, setMes] = useState(mesActualLima);
  const hoy = mesActualLima();
  const esMesActual = mes.anio === hoy.anio && mes.mesIndex0 === hoy.mesIndex0;
  const esFuturo = (anio: number, mesIndex0: number) => anio > hoy.anio || (anio === hoy.anio && mesIndex0 > hoy.mesIndex0);

  const [resumen, setResumen] = useState<ResumenCaja | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [tendencia, setTendencia] = useState<TendenciaMes[]>([]);
  const [categorias, setCategorias] = useState<CategoriaEgreso[]>([]);
  const [gastosReportados, setGastosReportados] = useState<GastoReportado[]>([]);

  const [mostrarForm, setMostrarForm] = useState<TipoMovimientoCaja | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState<MetodoPago>("efectivo");
  const [categoriaId, setCategoriaId] = useState("");
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [mostrarNuevaCategoria, setMostrarNuevaCategoria] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [gastoAprobandoId, setGastoAprobandoId] = useState<string | null>(null);
  const [metodoAprobacion, setMetodoAprobacion] = useState<MetodoPago>("efectivo");
  const [creandoCategoria, setCreandoCategoria] = useState(false);
  const [descargando, setDescargando] = useState(false);

  const [filtroTipo, setFiltroTipo] = useState<"" | TipoMovimientoCaja>("");
  const [filtroCategoriaId, setFiltroCategoriaId] = useState("");
  const [filtroMetodoMov, setFiltroMetodoMov] = useState<"" | MetodoPago>("");
  const [busquedaMov, setBusquedaMov] = useState("");

  const cargarTodo = async () => {
    const { desde, hasta } = rangoDelMes(mes.anio, mes.mesIndex0);
    const [{ data: datosResumen }, { data: datosMovimientos }, { data: datosTendencia }, { data: datosCategorias }, { data: datosGastos }] =
      await Promise.all([
        apiClient.get<ResumenCaja>("/caja/resumen", { params: { desde, hasta } }),
        apiClient.get<MovimientoCaja[]>("/caja/movimientos", { params: { desde, hasta } }),
        apiClient.get<TendenciaMes[]>("/caja/tendencia", { params: { meses: 6 } }),
        apiClient.get<CategoriaEgreso[]>("/categorias-egreso"),
        apiClient.get<GastoReportado[]>("/caja/gastos-reportados", { params: { estado: "pendiente" } }),
      ]);
    setResumen(datosResumen);
    setMovimientos(datosMovimientos);
    setTendencia(datosTendencia);
    setCategorias(datosCategorias);
    setGastosReportados(datosGastos);
  };

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes.anio, mes.mesIndex0]);

  const handleAnioChange = (nuevoAnio: number) => {
    setMes((actual) => (esFuturo(nuevoAnio, actual.mesIndex0) ? hoy : { anio: nuevoAnio, mesIndex0: actual.mesIndex0 }));
  };

  const handleMesChange = (nuevoMesIndex0: number) => {
    setMes((actual) => (esFuturo(actual.anio, nuevoMesIndex0) ? hoy : { anio: actual.anio, mesIndex0: nuevoMesIndex0 }));
  };

  const abrirForm = (tipo: TipoMovimientoCaja) => {
    setMostrarForm(tipo);
    setEditandoId(null);
    setFecha(new Date().toISOString().slice(0, 10));
    setMonto("");
    setMetodo("efectivo");
    setCategoriaId("");
    setDescripcion("");
  };

  const abrirEdicion = (movimiento: MovimientoCaja) => {
    setMostrarForm(movimiento.tipo ?? "egreso");
    setEditandoId(movimiento.id);
    setFecha(movimiento.fecha.slice(0, 10));
    setMonto(String(movimiento.monto));
    setMetodo(movimiento.metodoPago);
    setCategoriaId(movimiento.categoriaId ?? "");
    setDescripcion(movimiento.descripcion ?? "");
  };

  const cerrarForm = () => {
    setMostrarForm(null);
    setEditandoId(null);
  };

  const crearCategoria = async () => {
    if (!nuevaCategoria.trim()) return;
    setCreandoCategoria(true);
    try {
      const { data } = await apiClient.post<CategoriaEgreso>("/categorias-egreso", { nombre: nuevaCategoria });
      setCategorias((prev) => [...prev, data]);
      setCategoriaId(data.id);
      setNuevaCategoria("");
      setMostrarNuevaCategoria(false);
    } catch {
      mostrarError("No se pudo crear la categoría");
    } finally {
      setCreandoCategoria(false);
    }
  };

  const handleGuardarMovimiento = async () => {
    if (!mostrarForm) return;
    setGuardando(true);
    try {
      const payloadComun = {
        monto: Number(monto),
        metodoPago: metodo,
        categoriaId: mostrarForm === "egreso" ? categoriaId || undefined : undefined,
        descripcion: descripcion || undefined,
      };
      if (editandoId) {
        await apiClient.patch(`/caja/movimientos/${editandoId}`, { ...payloadComun, fecha: fechaLocalAInstanteLima(fecha) });
      } else {
        await apiClient.post("/caja/movimientos", { ...payloadComun, tipo: mostrarForm, fecha: fechaLocalAInstanteLima(fecha) });
      }
      cerrarForm();
      await cargarTodo();
    } catch {
      mostrarError(editandoId ? "No se pudo guardar los cambios" : "No se pudo registrar el movimiento");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarMovimiento = async (movimiento: MovimientoCaja) => {
    const confirmado = await confirmar(
      `¿Eliminar este ${movimiento.tipo === "egreso" ? "egreso" : "ingreso"} de S/ ${movimiento.monto.toFixed(2)}?`,
      { titulo: "Eliminar movimiento", textoConfirmar: "Eliminar", destructivo: true },
    );
    if (!confirmado) return;
    try {
      await apiClient.delete(`/caja/movimientos/${movimiento.id}`);
      await cargarTodo();
    } catch {
      mostrarError("No se pudo eliminar el movimiento");
    }
  };

  const abrirAprobacion = (gasto: GastoReportado) => {
    setGastoAprobandoId(gasto.id);
    setMetodoAprobacion("efectivo");
  };

  const confirmarAprobacion = async (gasto: GastoReportado) => {
    try {
      await apiClient.post(`/caja/gastos-reportados/${gasto.id}/aprobar`, { metodoPago: metodoAprobacion });
      setGastoAprobandoId(null);
      await cargarTodo();
    } catch {
      mostrarError("No se pudo aprobar el gasto");
    }
  };

  const rechazarGasto = async (gasto: GastoReportado) => {
    const confirmado = await confirmar(`¿Rechazar el gasto reportado por ${gasto.usuario.nombre}?`, {
      titulo: "Rechazar gasto",
      textoConfirmar: "Rechazar",
      destructivo: true,
    });
    if (!confirmado) return;
    try {
      await apiClient.post(`/caja/gastos-reportados/${gasto.id}/rechazar`);
      await cargarTodo();
    } catch {
      mostrarError("No se pudo rechazar el gasto");
    }
  };

  const descargarExcel = async () => {
    setDescargando(true);
    try {
      const { desde, hasta } = rangoDelMes(mes.anio, mes.mesIndex0);
      const { data } = await apiClient.get("/caja/exportar", { params: { desde, hasta }, responseType: "blob" });
      const url = URL.createObjectURL(data);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `caja-${MESES[mes.mesIndex0].toLowerCase()}-${mes.anio}.xlsx`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    } catch {
      mostrarError("No se pudo generar el Excel del periodo");
    } finally {
      setDescargando(false);
    }
  };

  const anios = Array.from({ length: 5 }, (_, i) => hoy.anio - i);
  const mesesDisponibles = mes.anio === hoy.anio ? MESES.slice(0, hoy.mesIndex0 + 1) : MESES;

  const movimientosFiltrados = movimientos.filter((movimiento) => {
    if (filtroTipo && movimiento.tipo !== filtroTipo) return false;
    if (filtroCategoriaId && movimiento.categoriaId !== filtroCategoriaId) return false;
    if (filtroMetodoMov && movimiento.metodoPago !== filtroMetodoMov) return false;
    if (busquedaMov && !(movimiento.descripcion ?? "").toLowerCase().includes(busquedaMov.toLowerCase())) return false;
    return true;
  });

  return (
    <AppShell>
      <div className="border-b border-border pb-5">
        <h1 className="font-serif text-[32px] font-normal tracking-[-0.01em] text-ink">Caja y egresos</h1>
        <p className="mt-1 text-[13.5px] text-ink-2">Los cobros a clientes entran solos; aquí se registra lo que no pasa por cobranza.</p>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border-field bg-surface p-1">
          <select
            value={mes.mesIndex0}
            onChange={(event) => handleMesChange(Number(event.target.value))}
            className="rounded-md border-none bg-transparent px-3 py-1.5 text-sm font-medium text-ink-2 focus:outline-none"
          >
            {mesesDisponibles.map((nombre, indice) => (
              <option key={nombre} value={indice}>
                {nombre}
              </option>
            ))}
          </select>
          <div className="h-5 w-px bg-border-field" />
          <select
            value={mes.anio}
            onChange={(event) => handleAnioChange(Number(event.target.value))}
            className="rounded-md border-none bg-transparent px-3 py-1.5 text-sm font-medium text-ink-2 focus:outline-none"
          >
            {anios.map((anio) => (
              <option key={anio} value={anio}>
                {anio}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {esMesActual && (
            <>
              <button
                onClick={() => abrirForm("egreso")}
                className={`rounded-[9px] px-4 py-2.5 text-sm font-semibold transition-colors ${
                  mostrarForm === "egreso" && !editandoId ? "bg-primary text-white" : "border border-border-field text-ink-2 hover:bg-surface-subtle"
                }`}
              >
                Registrar egreso
              </button>
              <button
                onClick={() => abrirForm("ingreso")}
                className={`rounded-[9px] px-4 py-2.5 text-sm font-semibold transition-colors ${
                  mostrarForm === "ingreso" && !editandoId ? "bg-primary text-white" : "border border-border-field text-ink-2 hover:bg-surface-subtle"
                }`}
              >
                Registrar ingreso manual
              </button>
              <div className="mx-1 h-6 w-px bg-border" />
            </>
          )}
          <button
            onClick={descargarExcel}
            disabled={descargando}
            className="rounded-[9px] border border-border-field bg-surface px-4 py-2.5 text-sm font-semibold text-ink-2 transition-colors hover:bg-surface-subtle disabled:opacity-60"
          >
            {descargando ? "Generando..." : "Exportar a Excel"}
          </button>
        </div>
      </div>

      {!esMesActual && (
        <p className="mt-4 max-w-2xl rounded-lg border border-border bg-surface-subtle px-4 py-3 text-sm text-ink-weak">
          Estás viendo un mes cerrado: puedes consultar y corregir su historial, pero los movimientos nuevos solo se registran en el mes en curso.
        </p>
      )}

      {mostrarForm && (
        <div className="mt-4 max-w-2xl rounded-lg border border-border bg-surface p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-ink">
              {editandoId ? "Editar" : "Nuevo"} {mostrarForm === "egreso" ? "egreso" : "ingreso"}
            </h2>
            <button onClick={cerrarForm} className="text-sm text-ink-weak underline">
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(event) => setFecha(event.target.value)}
                className="w-full rounded-lg border border-border-field px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Monto (S/)</label>
              <input
                type="number"
                min={0}
                step="0.1"
                value={monto}
                onChange={(event) => setMonto(event.target.value)}
                className="w-full rounded-lg border border-border-field px-3 py-2.5 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Método</label>
              <div className="flex gap-2">
                {METODOS.map((opcion) => (
                  <button
                    key={opcion.valor}
                    type="button"
                    onClick={() => setMetodo(opcion.valor)}
                    className={`rounded-lg px-3.5 py-2 text-sm font-medium ${
                      metodo === opcion.valor ? "bg-primary text-white" : "border border-border-field text-ink-2 hover:bg-surface-subtle transition-colors"
                    }`}
                  >
                    {opcion.label}
                  </button>
                ))}
              </div>
            </div>

            {mostrarForm === "egreso" && (
              <div className="col-span-2">
                <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Categoría</label>
                <div className="flex flex-wrap gap-2">
                  {categorias.map((categoria) => (
                    <button
                      key={categoria.id}
                      type="button"
                      onClick={() => setCategoriaId(categoria.id)}
                      className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                        categoriaId === categoria.id ? "bg-primary text-white" : "border border-border-field text-ink-2 hover:bg-surface-subtle transition-colors"
                      }`}
                    >
                      {categoria.nombre}
                    </button>
                  ))}
                  {mostrarNuevaCategoria ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={nuevaCategoria}
                        onChange={(event) => setNuevaCategoria(event.target.value)}
                        placeholder="Nombre"
                        className="rounded-full border border-border-field px-3 py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={crearCategoria}
                        disabled={creandoCategoria || !nuevaCategoria.trim()}
                        className="rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
                      >
                        Agregar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setMostrarNuevaCategoria(true)}
                      className="rounded-full border border-dashed border-border-field px-3.5 py-1.5 text-sm text-ink-weak"
                    >
                      + Nueva categoría
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="col-span-2">
              <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Descripción</label>
              <input
                value={descripcion}
                onChange={(event) => setDescripcion(event.target.value)}
                placeholder={mostrarForm === "egreso" ? "Ej. cambio de cable troncal sector 3" : "Ej. otro ingreso del negocio"}
                className="w-full rounded-lg border border-border-field px-3 py-2.5 text-sm"
              />
            </div>
          </div>

          <button
            onClick={handleGuardarMovimiento}
            disabled={guardando || !monto}
            className="mt-4 rounded-[9px] bg-primary hover:bg-primary-hover transition-colors px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Guardar"}
          </button>
        </div>
      )}

      {esMesActual && gastosReportados.length > 0 && (
        <div className="mt-6 max-w-2xl rounded-lg border border-border bg-surface p-5 shadow-card">
          <h2 className="text-[16px] font-semibold text-ink">Gastos reportados por cobradores</h2>
          <div className="mt-3 flex flex-col gap-2">
            {gastosReportados.map((gasto) => (
              <div key={gasto.id} className="flex items-center justify-between rounded-lg border border-border-field px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {gasto.usuario.nombre} · S/ {gasto.monto.toFixed(2)}
                  </p>
                  <p className="text-xs text-ink-weak">{gasto.descripcion}</p>
                </div>
                {gastoAprobandoId === gasto.id ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={metodoAprobacion}
                      onChange={(e) => setMetodoAprobacion(e.target.value as MetodoPago)}
                      className="rounded-lg border border-border-field px-2 py-1.5 text-xs text-ink"
                    >
                      {METODOS.map((m) => (
                        <option key={m.valor} value={m.valor}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => confirmarAprobacion(gasto)}
                      className="rounded-lg bg-primary hover:bg-primary-hover transition-colors px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setGastoAprobandoId(null)}
                      className="rounded-lg border border-border-field px-3 py-1.5 text-xs font-semibold text-ink-weak"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => abrirAprobacion(gasto)}
                      className="rounded-lg bg-primary hover:bg-primary-hover transition-colors px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Registrar en caja
                    </button>
                    <button
                      onClick={() => rechazarGasto(gasto)}
                      className="rounded-lg border border-error-border px-3 py-1.5 text-xs font-semibold text-error"
                    >
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {resumen && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {resumen.porMetodo.map((item) => (
              <div key={item.metodo} className="rounded-lg border border-border bg-surface p-4 shadow-card">
                <p className="text-[11.5px] uppercase tracking-[.07em] text-ink-weak capitalize">{item.metodo}</p>
                <p className="mt-1 font-mono text-[22px] font-semibold text-ink">S/ {item.monto.toFixed(2)}</p>
                <p className="text-[12.5px] text-ink-weak">{item.cantidadCobros} cobros</p>
              </div>
            ))}
          </div>

          {tendencia.length > 0 && <div className="mt-6">
            <GraficoTendencia datos={tendencia} />
          </div>}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <input
              placeholder="Buscar en descripción..."
              value={busquedaMov}
              onChange={(event) => setBusquedaMov(event.target.value)}
              className="min-w-[220px] flex-1 rounded-lg border border-border-field bg-surface px-3.5 py-2 text-sm text-ink outline-none focus:border-primary"
            />
            <select value={filtroTipo} onChange={(event) => setFiltroTipo(event.target.value as "" | TipoMovimientoCaja)} className={SELECT_CLASE}>
              <option value="">Todos los tipos</option>
              <option value="egreso">Egreso</option>
              <option value="ingreso">Ingreso</option>
            </select>
            <select value={filtroCategoriaId} onChange={(event) => setFiltroCategoriaId(event.target.value)} className={SELECT_CLASE}>
              <option value="">Todas las categorías</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
            <select value={filtroMetodoMov} onChange={(event) => setFiltroMetodoMov(event.target.value as "" | MetodoPago)} className={SELECT_CLASE}>
              <option value="">Todos los métodos</option>
              {METODOS.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-[1fr_260px]">
            <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-card">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-subtle text-left text-[11.5px] uppercase tracking-[.05em] text-ink-weak">
                    <th className="px-4 py-2.5 font-medium">Fecha y hora</th>
                    <th className="px-4 py-2.5 font-medium">Tipo</th>
                    <th className="px-4 py-2.5 font-medium">Categoría</th>
                    <th className="px-4 py-2.5 font-medium">Descripción</th>
                    <th className="px-4 py-2.5 font-medium">Método</th>
                    <th className="px-4 py-2.5 font-medium">Monto</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {movimientosFiltrados.map((movimiento) => (
                    <tr key={movimiento.id} className="border-b border-divider last:border-0">
                      <td className="px-4 py-2.5 font-mono text-ink-2">{formatFechaHora(movimiento.fecha)}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-block rounded-[5px] px-2 py-0.5 text-xs font-medium capitalize ${
                            movimiento.tipo === "egreso" ? "bg-error-bg text-error" : "bg-success-bg text-success"
                          }`}
                        >
                          {movimiento.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-ink-2">{movimiento.categoria ?? "—"}</td>
                      <td className="px-4 py-2.5 text-ink-2">{movimiento.descripcion ?? "—"}</td>
                      <td className="px-4 py-2.5 capitalize text-ink-2">{movimiento.metodoPago}</td>
                      <td className={`px-4 py-2.5 font-mono ${movimiento.tipo === "egreso" ? "text-error" : "text-success"}`}>
                        {movimiento.tipo === "egreso" ? "-" : "+"} S/ {movimiento.monto.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => abrirEdicion(movimiento)}
                            className="rounded-lg border border-border-field px-2.5 py-1 text-xs font-semibold text-ink-2 transition-colors hover:bg-surface-subtle"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => eliminarMovimiento(movimiento)}
                            className="rounded-lg border border-error-border px-2.5 py-1 text-xs font-semibold text-error transition-colors hover:bg-error-bg"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {movimientosFiltrados.length === 0 && (
                <p className="p-4 text-sm text-ink-weak">
                  {movimientos.length === 0 ? "Sin movimientos en este mes." : "Ningún movimiento coincide con el filtro."}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-border bg-primary-tint p-5 shadow-card">
              <p className="text-[11.5px] uppercase tracking-[.07em] text-primary">Neto del periodo</p>
              <p className="mt-1 font-mono text-[26px] font-bold tracking-wide text-primary">S/ {resumen.neto.toFixed(2)}</p>
              <p className="text-[12.5px] text-primary">Ingresos menos egresos</p>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
