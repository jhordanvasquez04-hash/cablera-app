import { useEffect, useState, type FormEvent } from "react";
import { AppShell } from "../components/AppShell";
import { apiClient } from "../api/client";
import { useMostrarError } from "../components/ToastContext";
import type { MovimientoStock, Producto, TipoMovimientoStock } from "../api/types";

const formularioVacio = {
  nombre: "",
  codigo: "",
  categoria: "",
  unidad: "",
  descripcion: "",
  esMedible: false,
  metrosPorUnidad: "",
  tieneVariantes: false,
  stockMinimo: "0",
};

export function AlmacenPage() {
  const mostrarError = useMostrarError();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [form, setForm] = useState(formularioVacio);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([]);

  const cargarProductos = async () => {
    const { data } = await apiClient.get<Producto[]>("/productos");
    setProductos(data);
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  const seleccionado = productos.find((p) => p.id === seleccionadoId) ?? null;

  const seleccionar = async (producto: Producto) => {
    setSeleccionadoId(producto.id);
    const { data } = await apiClient.get<MovimientoStock[]>(`/productos/${producto.id}/movimientos`);
    setMovimientos(data);
  };

  const actualizarCampo = <K extends keyof typeof formularioVacio>(campo: K, valor: (typeof formularioVacio)[K]) => {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await apiClient.post("/productos", {
        nombre: form.nombre,
        codigo: form.codigo || undefined,
        categoria: form.categoria || undefined,
        unidad: form.unidad || undefined,
        descripcion: form.descripcion || undefined,
        esMedible: form.esMedible,
        metrosPorUnidad: form.esMedible && form.metrosPorUnidad ? Number(form.metrosPorUnidad) : undefined,
        tieneVariantes: form.tieneVariantes,
        stockMinimo: form.stockMinimo ? Number(form.stockMinimo) : undefined,
      });
      setForm(formularioVacio);
      setMostrarFormulario(false);
      await cargarProductos();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No se pudo crear el producto");
    } finally {
      setGuardando(false);
    }
  };

  const handleDesactivar = async (producto: Producto) => {
    try {
      await apiClient.patch(`/productos/${producto.id}`, { activo: !producto.activo });
      await cargarProductos();
    } catch (err: any) {
      mostrarError(err?.response?.data?.message ?? "No se pudo actualizar el producto");
    }
  };

  const handleMovimiento = async (tipo: TipoMovimientoStock) => {
    if (!seleccionado) return;
    const cantidadTexto = prompt(`Cantidad a registrar como ${tipo === "entrada" ? "ENTRADA" : "SALIDA"} de "${seleccionado.nombre}" (${seleccionado.esMedible ? "metros" : "unidades"}):`);
    if (!cantidadTexto) return;
    const cantidad = Number(cantidadTexto);
    if (!cantidad || cantidad <= 0) {
      mostrarError("Cantidad inválida");
      return;
    }
    const motivo = prompt("Motivo (opcional):") ?? undefined;
    try {
      await apiClient.post(`/productos/${seleccionado.id}/movimientos`, { tipo, cantidad, motivo: motivo || undefined });
      await cargarProductos();
      const { data } = await apiClient.get<MovimientoStock[]>(`/productos/${seleccionado.id}/movimientos`);
      setMovimientos(data);
    } catch (err: any) {
      mostrarError(err?.response?.data?.message ?? "No se pudo registrar el movimiento");
    }
  };

  const stockDe = (p: Producto) => (p.esMedible ? `${p.metrosDisponibles ?? 0} m` : `${p.stockTotal} u`);
  const bajoStock = (p: Producto) => !p.esMedible && p.stockTotal <= p.stockMinimo;

  return (
    <AppShell>
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <h1 className="font-serif text-[32px] font-normal tracking-[-0.01em] text-ink">Almacén</h1>
          <p className="mt-1 text-sm text-ink-weak">Equipos y materiales: catálogo, stock y kardex de entradas/salidas.</p>
        </div>
        {!mostrarFormulario && (
          <button
            onClick={() => setMostrarFormulario(true)}
            className="rounded-[9px] bg-primary hover:bg-primary-hover transition-colors px-4 py-2.5 text-sm font-semibold text-white"
          >
            Nuevo producto
          </button>
        )}
      </div>

      {mostrarFormulario && (
        <form onSubmit={handleSubmit} className="mt-5 rounded-lg border border-border bg-surface p-5 shadow-card">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Campo label="Nombre" valor={form.nombre} onChange={(v) => actualizarCampo("nombre", v)} required />
            <Campo label="Código" valor={form.codigo} onChange={(v) => actualizarCampo("codigo", v)} />
            <Campo label="Categoría" valor={form.categoria} onChange={(v) => actualizarCampo("categoria", v)} />
            <Campo label="Unidad" valor={form.unidad} onChange={(v) => actualizarCampo("unidad", v)} />
            <div>
              <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Stock mínimo</label>
              <input
                type="number"
                min={0}
                value={form.stockMinimo}
                onChange={(event) => actualizarCampo("stockMinimo", event.target.value)}
                className="w-full rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-ink-2">
              <input type="checkbox" checked={form.esMedible} onChange={(event) => actualizarCampo("esMedible", event.target.checked)} />
              Se mide en metros (ej. cable)
            </label>
            {form.esMedible && (
              <Campo label="Metros por unidad" valor={form.metrosPorUnidad} onChange={(v) => actualizarCampo("metrosPorUnidad", v)} required />
            )}
            <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-ink-2">
              <input type="checkbox" checked={form.tieneVariantes} onChange={(event) => actualizarCampo("tieneVariantes", event.target.checked)} />
              Tiene variantes (talla/género)
            </label>
            <div className="col-span-2 md:col-span-4">
              <Campo label="Descripción" valor={form.descripcion} onChange={(v) => actualizarCampo("descripcion", v)} />
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-error">{error}</p>}
          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={guardando}
              className="rounded-[9px] bg-primary hover:bg-primary-hover transition-colors px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Crear producto
            </button>
            <button type="button" onClick={() => setMostrarFormulario(false)} className="text-sm text-ink-weak underline">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card lg:col-span-2">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-subtle text-left text-[11.5px] uppercase tracking-[.05em] text-ink-weak">
                <th className="px-4 py-2.5 font-medium">Nombre</th>
                <th className="px-4 py-2.5 font-medium">Categoría</th>
                <th className="px-4 py-2.5 font-medium">Stock</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {productos.map((producto) => (
                <tr
                  key={producto.id}
                  onClick={() => seleccionar(producto)}
                  className={`cursor-pointer border-b border-divider last:border-0 hover:bg-row-hover ${seleccionadoId === producto.id ? "bg-primary-tint" : ""}`}
                >
                  <td className="px-4 py-2.5 text-ink">
                    {producto.nombre}
                    {producto.codigo && <div className="text-xs text-ink-weak">{producto.codigo}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-ink-2">{producto.categoria ?? "—"}</td>
                  <td className={`px-4 py-2.5 ${bajoStock(producto) ? "font-semibold text-error" : "text-ink-2"}`}>{stockDe(producto)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-[5px] px-2 py-0.5 text-xs ${producto.activo ? "bg-success-bg text-success" : "bg-neutral-chip-bg text-neutral-chip"}`}>
                      {producto.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs" onClick={(event) => event.stopPropagation()}>
                    <button onClick={() => handleDesactivar(producto)} className={producto.activo ? "text-error hover:underline" : "text-primary hover:underline"}>
                      {producto.activo ? "Desactivar" : "Reactivar"}
                    </button>
                  </td>
                </tr>
              ))}
              {productos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-ink-weak">
                    Aún no hay productos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4 shadow-card">
          {!seleccionado ? (
            <p className="text-sm text-ink-weak">Selecciona un producto para ver su kardex de movimientos.</p>
          ) : (
            <>
              <h2 className="font-serif text-lg text-ink">{seleccionado.nombre}</h2>
              <p className="mt-1 text-sm text-ink-weak">Stock actual: {stockDe(seleccionado)}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => handleMovimiento("entrada")} className="rounded-lg bg-success-bg px-3 py-1.5 text-xs font-semibold text-success hover:opacity-80">
                  + Entrada
                </button>
                <button onClick={() => handleMovimiento("salida")} className="rounded-lg bg-error-bg px-3 py-1.5 text-xs font-semibold text-error hover:opacity-80">
                  − Salida
                </button>
              </div>
              <div className="mt-4 max-h-72 overflow-y-auto text-sm">
                {movimientos.map((m) => (
                  <div key={m.id} className="flex items-center justify-between border-b border-divider py-1.5 last:border-0">
                    <span className={m.tipo === "entrada" ? "text-success" : "text-error"}>
                      {m.tipo === "entrada" ? "+" : "−"}
                      {m.cantidad}
                    </span>
                    <span className="text-xs text-ink-weak">{new Date(m.createdAt).toLocaleDateString("es-PE")}</span>
                  </div>
                ))}
                {movimientos.length === 0 && <p className="text-xs text-ink-weak">Sin movimientos todavía.</p>}
              </div>
            </>
          )}
        </div>
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
