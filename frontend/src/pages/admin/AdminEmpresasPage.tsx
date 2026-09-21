import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AdminShell } from "../../components/AdminShell";
import { apiClient } from "../../api/client";
import type { CrearEmpresaResultado, EmpresaAdmin } from "../../api/types";

const LABEL_CLASE = "mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3";
const INPUT_CLASE =
  "w-full rounded-lg border border-border-field px-3 py-2.5 text-sm text-ink focus:border-primary focus:outline-none";

const ESTADO_BADGE: Record<EmpresaAdmin["estado"], string> = {
  activa: "bg-primary-tint text-primary",
  suspendida: "bg-error-bg text-error",
};

function EstadoBadge({ estado }: { estado: EmpresaAdmin["estado"] }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ESTADO_BADGE[estado]}`}>
      {estado}
    </span>
  );
}

export function AdminEmpresasPage() {
  const [empresas, setEmpresas] = useState<EmpresaAdmin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState<string | null>(null);

  const cargar = async () => {
    setError(null);
    try {
      const { data } = await apiClient.get<EmpresaAdmin[]>("/admin/empresas");
      setEmpresas(data);
    } catch {
      setError("No se pudo cargar la lista de empresas.");
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const cambiarEstado = async (empresa: EmpresaAdmin) => {
    setCambiandoEstadoId(empresa.id);
    try {
      const accion = empresa.estado === "activa" ? "suspender" : "activar";
      await apiClient.post(`/admin/empresas/${empresa.id}/${accion}`);
      await cargar();
    } catch {
      setError("No se pudo cambiar el estado de la empresa.");
    } finally {
      setCambiandoEstadoId(null);
    }
  };

  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
        <div>
          <h1 className="font-serif text-[32px] font-normal tracking-[-0.01em] text-ink">Empresas</h1>
          <p className="mt-1 text-[13.5px] text-ink-2">Cada empresa es un tenant aislado: sus propios clientes, cobranzas, caja y usuarios.</p>
        </div>
        <button
          type="button"
          onClick={() => setMostrarFormulario((abierto) => !abierto)}
          className="rounded-[9px] bg-primary hover:bg-primary-hover transition-colors px-4 py-2.5 text-sm font-semibold text-white"
        >
          {mostrarFormulario ? "Cancelar" : "Nueva empresa"}
        </button>
      </div>

      {mostrarFormulario && (
        <FormularioNuevaEmpresa
          onCreada={() => {
            setMostrarFormulario(false);
            cargar();
          }}
        />
      )}

      {error && <p className="mt-4 text-sm text-error">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface shadow-card">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-ink-3">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Clientes</th>
              <th className="px-4 py-3 font-medium">Usuarios</th>
              <th className="px-4 py-3 font-medium">Creada</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {empresas === null && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-ink-2">
                  Cargando...
                </td>
              </tr>
            )}
            {empresas?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-ink-2">
                  Todavía no hay empresas.
                </td>
              </tr>
            )}
            {empresas?.map((empresa) => (
              <tr key={empresa.id} className="border-b border-divider last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{empresa.nombre}</td>
                <td className="px-4 py-3 text-ink-2">{empresa.slug}</td>
                <td className="px-4 py-3">
                  <EstadoBadge estado={empresa.estado} />
                </td>
                <td className="px-4 py-3 text-ink-2">{empresa.clientesCount}</td>
                <td className="px-4 py-3 text-ink-2">{empresa.usuariosCount}</td>
                <td className="px-4 py-3 text-ink-2">{new Date(empresa.createdAt).toLocaleDateString("es-PE")}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={cambiandoEstadoId === empresa.id}
                    onClick={() => cambiarEstado(empresa)}
                    className="rounded-md border border-border-field px-3 py-1.5 text-sm text-ink-2 transition-colors hover:bg-surface-subtle disabled:opacity-60"
                  >
                    {empresa.estado === "activa" ? "Suspender" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

function FormularioNuevaEmpresa({ onCreada }: { onCreada: () => void }) {
  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [gestorNombre, setGestorNombre] = useState("");
  const [gestorEmail, setGestorEmail] = useState("");
  const [gestorPassword, setGestorPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<CrearEmpresaResultado | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const { data } = await apiClient.post<CrearEmpresaResultado>("/admin/empresas", {
        nombre,
        slug,
        gestorNombre,
        gestorEmail,
        gestorPassword,
      });
      setResultado(data);
      setNombre("");
      setSlug("");
      setGestorNombre("");
      setGestorEmail("");
      setGestorPassword("");
      onCreada();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No se pudo crear la empresa");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mt-6 max-w-xl rounded-lg border border-border bg-surface p-6 shadow-card">
      <h2 className="text-[16px] font-semibold text-ink">Nueva empresa</h2>
      <p className="mt-1 text-[13.5px] text-ink-2">
        Se crea la empresa, su configuración inicial y su primer usuario gestor en un solo paso.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <Campo label="Nombre de la empresa">
          <input required value={nombre} onChange={(e) => setNombre(e.target.value)} className={INPUT_CLASE} />
        </Campo>
        <Campo label="Slug (interno)" hint="minúsculas, sin espacios">
          <input
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
            placeholder="ej. cable-norte"
            className={INPUT_CLASE}
          />
        </Campo>
        <Campo label="Nombre del gestor">
          <input required value={gestorNombre} onChange={(e) => setGestorNombre(e.target.value)} className={INPUT_CLASE} />
        </Campo>
        <Campo label="Correo del gestor">
          <input
            required
            type="email"
            value={gestorEmail}
            onChange={(e) => setGestorEmail(e.target.value)}
            className={INPUT_CLASE}
          />
        </Campo>
        <Campo label="Contraseña del gestor">
          <input
            required
            type="password"
            minLength={6}
            value={gestorPassword}
            onChange={(e) => setGestorPassword(e.target.value)}
            className={INPUT_CLASE}
          />
        </Campo>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={enviando}
            className="rounded-[9px] bg-primary hover:bg-primary-hover transition-colors px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {enviando ? "Creando..." : "Crear empresa"}
          </button>
        </div>
      </form>

      {error && <p className="mt-3 text-sm text-error">{error}</p>}

      {resultado && (
        <div className="mt-4 rounded-lg border border-divider bg-bg p-4 text-sm text-ink-2">
          Empresa <strong className="text-ink">{resultado.empresa.nombre}</strong> creada. Gestor:{" "}
          <strong className="text-ink">{resultado.gestor.email}</strong> — comparte con él la contraseña que
          registraste, no se vuelve a mostrar.
        </div>
      )}
    </div>
  );
}

function Campo({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={LABEL_CLASE}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  );
}
