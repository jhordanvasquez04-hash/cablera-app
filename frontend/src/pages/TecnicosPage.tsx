import { useEffect, useState, type FormEvent } from "react";
import { AppShell } from "../components/AppShell";
import { apiClient } from "../api/client";
import { useMostrarError } from "../components/ToastContext";
import type { Tecnico } from "../api/types";

const formularioVacio = {
  nombre: "",
  apellido: "",
  dni: "",
  telefono: "",
  email: "",
  password: "",
  zona: "",
  vehiculo: "",
};

export function TecnicosPage() {
  const mostrarError = useMostrarError();
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [form, setForm] = useState(formularioVacio);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargarTecnicos = async () => {
    const { data } = await apiClient.get<Tecnico[]>("/tecnicos");
    setTecnicos(data);
  };

  useEffect(() => {
    cargarTecnicos();
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
      if (editandoId) {
        await apiClient.patch(`/tecnicos/${editandoId}`, {
          nombre: form.nombre,
          apellido: form.apellido,
          telefono: form.telefono || undefined,
          zona: form.zona || undefined,
          vehiculo: form.vehiculo || undefined,
        });
      } else {
        await apiClient.post("/tecnicos", {
          nombre: form.nombre,
          apellido: form.apellido,
          dni: form.dni,
          telefono: form.telefono || undefined,
          email: form.email,
          password: form.password,
          zona: form.zona || undefined,
          vehiculo: form.vehiculo || undefined,
        });
      }
      limpiarFormulario();
      await cargarTecnicos();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No se pudo guardar el técnico");
    } finally {
      setGuardando(false);
    }
  };

  const handleEditar = (tecnico: Tecnico) => {
    setEditandoId(tecnico.id);
    setForm({
      nombre: tecnico.nombre,
      apellido: tecnico.apellido,
      dni: tecnico.dni,
      telefono: tecnico.telefono ?? "",
      email: tecnico.email,
      password: "",
      zona: tecnico.zona ?? "",
      vehiculo: tecnico.vehiculo ?? "",
    });
  };

  const handleActivar = async (tecnico: Tecnico) => {
    try {
      await apiClient.post(`/tecnicos/${tecnico.id}/${tecnico.activo ? "desactivar" : "activar"}`);
      await cargarTecnicos();
    } catch (err: any) {
      mostrarError(err?.response?.data?.message ?? "No se pudo actualizar el técnico");
    }
  };

  const handleResetearPassword = async (tecnico: Tecnico) => {
    const nueva = prompt(`Nueva clave de acceso al portal para ${tecnico.nombre} (mínimo 8 caracteres):`);
    if (!nueva) return;
    if (nueva.length < 8) {
      mostrarError("La clave debe tener al menos 8 caracteres");
      return;
    }
    try {
      await apiClient.post(`/tecnicos/${tecnico.id}/resetear-password`, { password: nueva });
    } catch (err: any) {
      mostrarError(err?.response?.data?.message ?? "No se pudo cambiar la clave");
    }
  };

  return (
    <AppShell>
      <div className="border-b border-border pb-5">
        <h1 className="font-serif text-[32px] font-normal tracking-[-0.01em] text-ink">Técnicos</h1>
        <p className="mt-1 text-sm text-ink-weak">Técnicos de campo, cada uno con su propio acceso al portal de instalaciones.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-2 gap-4 rounded-lg border border-border bg-surface p-5 shadow-card md:grid-cols-4">
        <Campo label="Nombre" valor={form.nombre} onChange={(v) => actualizarCampo("nombre", v)} required />
        <Campo label="Apellido" valor={form.apellido} onChange={(v) => actualizarCampo("apellido", v)} required />
        <Campo label="DNI" valor={form.dni} onChange={(v) => actualizarCampo("dni", v)} required disabled={!!editandoId} />
        <Campo label="Teléfono" valor={form.telefono} onChange={(v) => actualizarCampo("telefono", v)} />
        <Campo label="Correo (login portal)" valor={form.email} onChange={(v) => actualizarCampo("email", v)} required disabled={!!editandoId} type="email" />
        {!editandoId && <Campo label="Clave inicial" valor={form.password} onChange={(v) => actualizarCampo("password", v)} required type="password" />}
        <Campo label="Zona" valor={form.zona} onChange={(v) => actualizarCampo("zona", v)} />
        <Campo label="Vehículo" valor={form.vehiculo} onChange={(v) => actualizarCampo("vehiculo", v)} />

        {error && <p className="col-span-full text-sm text-error">{error}</p>}
        <div className="col-span-full flex items-center gap-3">
          <button
            type="submit"
            disabled={guardando}
            className="rounded-[9px] bg-primary hover:bg-primary-hover transition-colors px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {editandoId ? "Guardar cambios" : "Crear técnico"}
          </button>
          {editandoId && (
            <button type="button" onClick={limpiarFormulario} className="text-sm text-ink-weak underline">
              Cancelar edición
            </button>
          )}
        </div>
      </form>

      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-surface shadow-card">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-subtle text-left text-[11.5px] uppercase tracking-[.05em] text-ink-weak">
              <th className="px-4 py-2.5 font-medium">Nombre</th>
              <th className="px-4 py-2.5 font-medium">DNI</th>
              <th className="px-4 py-2.5 font-medium">Correo</th>
              <th className="px-4 py-2.5 font-medium">Zona</th>
              <th className="px-4 py-2.5 font-medium">Estado</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {tecnicos.map((tecnico) => (
              <tr key={tecnico.id} className="border-b border-divider last:border-0 hover:bg-row-hover">
                <td className="px-4 py-2.5 text-ink">
                  {tecnico.nombre} {tecnico.apellido}
                  {tecnico.telefono && <div className="text-xs text-ink-weak">{tecnico.telefono}</div>}
                </td>
                <td className="px-4 py-2.5 text-ink-2">{tecnico.dni}</td>
                <td className="px-4 py-2.5 text-ink-2">{tecnico.email}</td>
                <td className="px-4 py-2.5 text-ink-2">{tecnico.zona ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-[5px] px-2 py-0.5 text-xs ${tecnico.activo ? "bg-success-bg text-success" : "bg-neutral-chip-bg text-neutral-chip"}`}>
                    {tecnico.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right text-xs">
                  <button onClick={() => handleEditar(tecnico)} className="mr-2 text-primary hover:underline">
                    Editar
                  </button>
                  <button onClick={() => handleResetearPassword(tecnico)} className="mr-2 text-ink-2 hover:underline">
                    Cambiar clave
                  </button>
                  <button onClick={() => handleActivar(tecnico)} className={tecnico.activo ? "text-error hover:underline" : "text-primary hover:underline"}>
                    {tecnico.activo ? "Desactivar" : "Reactivar"}
                  </button>
                </td>
              </tr>
            ))}
            {tecnicos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-weak">
                  Aún no hay técnicos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function Campo({
  label,
  valor,
  onChange,
  required,
  disabled,
  type = "text",
}: {
  label: string;
  valor: string;
  onChange: (valor: string) => void;
  required?: boolean;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">{label}</label>
      <input
        required={required}
        disabled={disabled}
        type={type}
        value={valor}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none disabled:bg-surface-subtle disabled:text-ink-weak"
      />
    </div>
  );
}
