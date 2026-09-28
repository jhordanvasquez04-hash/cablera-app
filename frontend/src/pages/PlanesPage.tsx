import { useEffect, useState, type FormEvent } from "react";
import { AppShell } from "../components/AppShell";
import { apiClient } from "../api/client";
import { useMostrarError } from "../components/ToastContext";
import type { Plan, TipoServicioRed } from "../api/types";

const TIPOS: { valor: TipoServicioRed; label: string }[] = [
  { valor: "internet", label: "Internet" },
  { valor: "cable", label: "Cable" },
  { valor: "duo", label: "Dúo" },
];

export function PlanesPage() {
  const mostrarError = useMostrarError();
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [nombre, setNombre] = useState("");
  const [tipoServicio, setTipoServicio] = useState<TipoServicioRed>("internet");
  const [mbps, setMbps] = useState("");
  const [precio, setPrecio] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargarPlanes = async () => {
    const { data } = await apiClient.get<Plan[]>("/planes");
    setPlanes(data);
  };

  useEffect(() => {
    cargarPlanes();
  }, []);

  const limpiarFormulario = () => {
    setNombre("");
    setTipoServicio("internet");
    setMbps("");
    setPrecio("");
    setEditandoId(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const payload = { nombre, tipoServicio, mbps: mbps ? Number(mbps) : undefined, precio: Number(precio) };
      if (editandoId) {
        await apiClient.patch(`/planes/${editandoId}`, payload);
      } else {
        await apiClient.post("/planes", payload);
      }
      limpiarFormulario();
      await cargarPlanes();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No se pudo guardar el plan");
    } finally {
      setGuardando(false);
    }
  };

  const handleEditar = (plan: Plan) => {
    setEditandoId(plan.id);
    setNombre(plan.nombre);
    setTipoServicio(plan.tipoServicio);
    setMbps(plan.mbps != null ? String(plan.mbps) : "");
    setPrecio(String(plan.precio));
  };

  // Un plan nunca se borra (podría estar referenciado por servicios ya contratados): "eliminar"
  // acá es desactivarlo, igual que ya hace el backend con el resto de catálogos de este sistema.
  const handleActivar = async (plan: Plan) => {
    try {
      await apiClient.patch(`/planes/${plan.id}`, { activo: !plan.activo });
      await cargarPlanes();
    } catch (err: any) {
      mostrarError(err?.response?.data?.message ?? "No se pudo actualizar el plan");
    }
  };

  return (
    <AppShell>
      <div className="border-b border-border pb-5">
        <h1 className="font-serif text-[32px] font-normal tracking-[-0.01em] text-ink">Planes</h1>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Nombre</label>
          <input
            required
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            className="rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Tipo</label>
          <div className="flex gap-1.5">
            {TIPOS.map((opcion) => (
              <button
                key={opcion.valor}
                type="button"
                onClick={() => setTipoServicio(opcion.valor)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  tipoServicio === opcion.valor ? "bg-primary text-white" : "border border-border-field text-ink-2 hover:bg-surface-subtle"
                }`}
              >
                {opcion.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Mbps</label>
          <input
            type="number"
            min={1}
            value={mbps}
            onChange={(event) => setMbps(event.target.value)}
            placeholder="Opcional"
            className="w-24 rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Precio (S/)</label>
          <input
            required
            type="number"
            min={0}
            step="0.10"
            value={precio}
            onChange={(event) => setPrecio(event.target.value)}
            className="w-28 rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={guardando}
          className="rounded-[9px] bg-primary hover:bg-primary-hover transition-colors px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {editandoId ? "Guardar cambios" : "Crear plan"}
        </button>
        {editandoId && (
          <button type="button" onClick={limpiarFormulario} className="text-sm text-ink-weak underline">
            Cancelar edición
          </button>
        )}
      </form>
      {error && <p className="mt-2 text-sm text-error">{error}</p>}

      <div className="mt-6 max-w-3xl overflow-hidden rounded-lg border border-border bg-surface shadow-card">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-subtle text-left text-[11.5px] uppercase tracking-[.05em] text-ink-weak">
              <th className="px-4 py-2.5 font-medium">Nombre</th>
              <th className="px-4 py-2.5 font-medium">Tipo</th>
              <th className="px-4 py-2.5 font-medium">Mbps</th>
              <th className="px-4 py-2.5 font-medium">Precio</th>
              <th className="px-4 py-2.5 font-medium">Estado</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {planes.map((plan) => (
              <tr key={plan.id} className="border-b border-divider last:border-0 hover:bg-row-hover">
                <td className="px-4 py-2.5 text-ink">{plan.nombre}</td>
                <td className="px-4 py-2.5 capitalize text-ink-2">{plan.tipoServicio}</td>
                <td className="px-4 py-2.5 text-ink-2">{plan.mbps ?? "—"}</td>
                <td className="px-4 py-2.5 text-ink-2">S/ {plan.precio.toFixed(2)}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-[5px] px-2 py-0.5 text-xs ${plan.activo ? "bg-success-bg text-success" : "bg-neutral-chip-bg text-neutral-chip"}`}>
                    {plan.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => handleEditar(plan)} className="mr-3 text-primary hover:underline">
                    Editar
                  </button>
                  <button onClick={() => handleActivar(plan)} className={plan.activo ? "text-error hover:underline" : "text-primary hover:underline"}>
                    {plan.activo ? "Desactivar" : "Reactivar"}
                  </button>
                </td>
              </tr>
            ))}
            {planes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-weak">
                  Aún no hay planes registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
