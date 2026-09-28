import { useEffect, useState, type FormEvent } from "react";
import { AppShell } from "../components/AppShell";
import { apiClient } from "../api/client";
import { useMostrarError } from "../components/ToastContext";
import type { EstadoPuntoRed, PuntoRed, TipoPuntoRed } from "../api/types";

const TIPOS: { valor: TipoPuntoRed; label: string }[] = [
  { valor: "nap", label: "NAP" },
  { valor: "cto", label: "CTO" },
];

const ESTADOS: { valor: EstadoPuntoRed; label: string }[] = [
  { valor: "activa", label: "Activa" },
  { valor: "saturada", label: "Saturada" },
  { valor: "mantenimiento", label: "Mantenimiento" },
];

const formularioVacio = {
  tipo: "nap" as TipoPuntoRed,
  codigo: "",
  latitud: "",
  longitud: "",
  capacidad: "",
  estado: "activa" as EstadoPuntoRed,
  direccion: "",
  notas: "",
  napId: "",
};

export function PuntosRedPage() {
  const mostrarError = useMostrarError();
  const [puntos, setPuntos] = useState<PuntoRed[]>([]);
  const [form, setForm] = useState(formularioVacio);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const naps = puntos.filter((p) => p.tipo === "nap");

  const cargarPuntos = async () => {
    const { data } = await apiClient.get<PuntoRed[]>("/puntos-red");
    setPuntos(data);
  };

  useEffect(() => {
    cargarPuntos();
  }, []);

  const limpiarFormulario = () => {
    setForm(formularioVacio);
    setEditandoId(null);
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
        tipo: form.tipo,
        codigo: form.codigo,
        latitud: Number(form.latitud),
        longitud: Number(form.longitud),
        capacidad: form.capacidad ? Number(form.capacidad) : undefined,
        estado: form.estado,
        direccion: form.direccion || undefined,
        notas: form.notas || undefined,
        napId: form.tipo === "cto" && form.napId ? form.napId : undefined,
      };
      if (editandoId) {
        await apiClient.patch(`/puntos-red/${editandoId}`, payload);
      } else {
        await apiClient.post("/puntos-red", payload);
      }
      limpiarFormulario();
      await cargarPuntos();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No se pudo guardar el punto de red");
    } finally {
      setGuardando(false);
    }
  };

  const handleEditar = (punto: PuntoRed) => {
    setEditandoId(punto.id);
    setForm({
      tipo: punto.tipo,
      codigo: punto.codigo,
      latitud: String(punto.latitud),
      longitud: String(punto.longitud),
      capacidad: punto.capacidad != null ? String(punto.capacidad) : "",
      estado: punto.estado,
      direccion: punto.direccion ?? "",
      notas: punto.notas ?? "",
      napId: punto.napId ?? "",
    });
  };

  const handleEliminar = async (punto: PuntoRed) => {
    if (!confirm(`¿Eliminar el punto de red ${punto.codigo}? Esta acción no se puede deshacer.`)) return;
    try {
      await apiClient.delete(`/puntos-red/${punto.id}`);
      if (editandoId === punto.id) limpiarFormulario();
      await cargarPuntos();
    } catch (err: any) {
      mostrarError(err?.response?.data?.message ?? "No se pudo eliminar el punto de red");
    }
  };

  const nombreNap = (napId: string | null) => (napId ? naps.find((n) => n.id === napId)?.codigo ?? "—" : "—");

  return (
    <AppShell>
      <div className="border-b border-border pb-5">
        <h1 className="font-serif text-[32px] font-normal tracking-[-0.01em] text-ink">Puntos de red</h1>
        <p className="mt-1 text-sm text-ink-weak">NAPs (nodos de distribución) y CTOs (cajas hacia el cliente final).</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Tipo</label>
          <div className="flex gap-1.5">
            {TIPOS.map((opcion) => (
              <button
                key={opcion.valor}
                type="button"
                onClick={() => actualizarCampo("tipo", opcion.valor)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  form.tipo === opcion.valor ? "bg-primary text-white" : "border border-border-field text-ink-2 hover:bg-surface-subtle"
                }`}
              >
                {opcion.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Código</label>
          <input
            required
            value={form.codigo}
            onChange={(event) => actualizarCampo("codigo", event.target.value)}
            placeholder="NAP-01"
            className="w-28 rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Latitud</label>
          <input
            required
            type="number"
            step="any"
            value={form.latitud}
            onChange={(event) => actualizarCampo("latitud", event.target.value)}
            className="w-28 rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Longitud</label>
          <input
            required
            type="number"
            step="any"
            value={form.longitud}
            onChange={(event) => actualizarCampo("longitud", event.target.value)}
            className="w-28 rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        {form.tipo === "nap" && (
          <div>
            <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Capacidad</label>
            <input
              type="number"
              min={1}
              value={form.capacidad}
              onChange={(event) => actualizarCampo("capacidad", event.target.value)}
              placeholder="Opcional"
              className="w-24 rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        )}
        {form.tipo === "cto" && (
          <div>
            <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Cuelga de (NAP)</label>
            <select
              value={form.napId}
              onChange={(event) => actualizarCampo("napId", event.target.value)}
              className="rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">Sin asignar</option>
              {naps.map((nap) => (
                <option key={nap.id} value={nap.id}>
                  {nap.codigo}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Estado</label>
          <select
            value={form.estado}
            onChange={(event) => actualizarCampo("estado", event.target.value as EstadoPuntoRed)}
            className="rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          >
            {ESTADOS.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Dirección</label>
          <input
            value={form.direccion}
            onChange={(event) => actualizarCampo("direccion", event.target.value)}
            placeholder="Opcional"
            className="w-48 rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={guardando}
          className="rounded-[9px] bg-primary hover:bg-primary-hover transition-colors px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {editandoId ? "Guardar cambios" : "Crear punto"}
        </button>
        {editandoId && (
          <button type="button" onClick={limpiarFormulario} className="text-sm text-ink-weak underline">
            Cancelar edición
          </button>
        )}
      </form>
      {error && <p className="mt-2 text-sm text-error">{error}</p>}

      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-surface shadow-card">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-subtle text-left text-[11.5px] uppercase tracking-[.05em] text-ink-weak">
              <th className="px-4 py-2.5 font-medium">Tipo</th>
              <th className="px-4 py-2.5 font-medium">Código</th>
              <th className="px-4 py-2.5 font-medium">Coordenadas</th>
              <th className="px-4 py-2.5 font-medium">Ocupación</th>
              <th className="px-4 py-2.5 font-medium">Cuelga de</th>
              <th className="px-4 py-2.5 font-medium">Estado</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {puntos.map((punto) => (
              <tr key={punto.id} className="border-b border-divider last:border-0 hover:bg-row-hover">
                <td className="px-4 py-2.5 uppercase text-ink-2">{punto.tipo}</td>
                <td className="px-4 py-2.5 text-ink">{punto.codigo}</td>
                <td className="px-4 py-2.5 text-ink-2">
                  {punto.latitud.toFixed(5)}, {punto.longitud.toFixed(5)}
                </td>
                <td className="px-4 py-2.5 text-ink-2">{punto.tipo === "nap" ? `${punto.ocupados}/${punto.capacidad ?? "—"}` : "—"}</td>
                <td className="px-4 py-2.5 text-ink-2">{punto.tipo === "cto" ? nombreNap(punto.napId) : "—"}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-[5px] px-2 py-0.5 text-xs ${
                      punto.estado === "activa"
                        ? "bg-success-bg text-success"
                        : punto.estado === "saturada"
                          ? "bg-warning-bg text-warning"
                          : "bg-neutral-chip-bg text-neutral-chip"
                    }`}
                  >
                    {ESTADOS.find((e) => e.valor === punto.estado)?.label ?? punto.estado}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => handleEditar(punto)} className="mr-3 text-primary hover:underline">
                    Editar
                  </button>
                  <button onClick={() => handleEliminar(punto)} className="text-error hover:underline">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {puntos.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-ink-weak">
                  Aún no hay puntos de red registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
