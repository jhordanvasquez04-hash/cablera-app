import { useEffect, useState, type FormEvent } from "react";
import { AppShell } from "../components/AppShell";
import { apiClient } from "../api/client";
import { useConfirm } from "../components/ConfirmContext";
import { useMostrarError } from "../components/ToastContext";
import type { Zona } from "../api/types";

export function ZonasPage() {
  const confirmar = useConfirm();
  const mostrarError = useMostrarError();
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargarZonas = async () => {
    const { data } = await apiClient.get<Zona[]>("/zonas");
    setZonas(data);
  };

  useEffect(() => {
    cargarZonas();
  }, []);

  const sugerirCodigo = async (nombreZona: string) => {
    if (!nombreZona.trim() || editandoId) return;
    const { data } = await apiClient.get<{ codigo: string }>("/zonas/sugerir-codigo", {
      params: { nombre: nombreZona },
    });
    setCodigo(data.codigo);
  };

  const limpiarFormulario = () => {
    setNombre("");
    setCodigo("");
    setEditandoId(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      if (editandoId) {
        await apiClient.patch(`/zonas/${editandoId}`, { nombre, codigo });
      } else {
        await apiClient.post("/zonas", { nombre, codigo: codigo || undefined });
      }
      limpiarFormulario();
      await cargarZonas();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No se pudo guardar la zona");
    } finally {
      setGuardando(false);
    }
  };

  const handleEditar = (zona: Zona) => {
    setEditandoId(zona.id);
    setNombre(zona.nombre);
    setCodigo(zona.codigo);
  };

  const handleEliminar = async (zona: Zona) => {
    const confirmado = await confirmar(`¿Eliminar la zona "${zona.nombre}"?`, {
      titulo: "Eliminar zona",
      textoConfirmar: "Eliminar",
      destructivo: true,
    });
    if (!confirmado) return;
    try {
      await apiClient.delete(`/zonas/${zona.id}`);
      await cargarZonas();
    } catch (err: any) {
      mostrarError(err?.response?.data?.message ?? "No se pudo eliminar la zona");
    }
  };

  return (
    <AppShell>
      <div className="border-b border-border pb-5">
        <h1 className="font-serif text-[32px] font-normal tracking-[-0.01em] text-ink">Zonas / Caseríos</h1>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Nombre</label>
          <input
            required
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            onBlur={(event) => sugerirCodigo(event.target.value)}
            className="rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Código</label>
          <input
            required
            value={codigo}
            onChange={(event) => setCodigo(event.target.value.toUpperCase())}
            className="w-28 rounded-lg border border-border-field px-3 py-2.5 text-sm font-mono uppercase focus:border-primary focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={guardando}
          className="rounded-[9px] bg-primary hover:bg-primary-hover transition-colors px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {editandoId ? "Guardar cambios" : "Crear zona"}
        </button>
        {editandoId && (
          <button type="button" onClick={limpiarFormulario} className="text-sm text-ink-weak underline">
            Cancelar edición
          </button>
        )}
      </form>
      {error && <p className="mt-2 text-sm text-error">{error}</p>}

      <div className="mt-6 max-w-2xl overflow-hidden rounded-lg border border-border bg-surface shadow-card">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-subtle text-left text-[11.5px] uppercase tracking-[.05em] text-ink-weak">
              <th className="px-4 py-2.5 font-medium">Nombre</th>
              <th className="px-4 py-2.5 font-medium">Código</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {zonas.map((zona) => (
              <tr key={zona.id} className="border-b border-divider last:border-0 hover:bg-row-hover">
                <td className="px-4 py-2.5 text-ink">{zona.nombre}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded-[5px] bg-surface-subtle px-2 py-0.5 font-mono text-xs text-ink-2">
                    {zona.codigo}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => handleEditar(zona)} className="mr-3 text-primary hover:underline">
                    Editar
                  </button>
                  <button onClick={() => handleEliminar(zona)} className="text-error hover:underline">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
