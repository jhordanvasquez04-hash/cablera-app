import { useEffect, useRef, useState, type FormEvent } from "react";
import { AppShell } from "../components/AppShell";
import { apiClient, resolverUrlArchivo } from "../api/client";
import { useConfig } from "../config/ConfigContext";
import { useAuth } from "../auth/AuthContext";
import type { Configuracion, FormatoBoleta, TipoServicio, TipoServicioTecnico, UsuarioListado } from "../api/types";
import type { Rol } from "@cablera/shared";

type FormState = Pick<
  Configuracion,
  "nombreEmpresa" | "colorPrimario" | "colorSecundario" | "fechaFacturacionGlobal" | "formatoBoletaDefault"
> & {
  ruc: string;
  telefonoContacto: string;
  emailContacto: string;
  direccionContacto: string;
};

const LABEL_CLASE = "mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3";
const INPUT_CLASE =
  "w-full rounded-lg border border-border-field px-3 py-2.5 text-sm text-ink transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-tint-strong";

const TIPOS_LOGO_PERMITIDOS = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const UN_MB = 1_000_000;

function toFormState(configuracion: Configuracion): FormState {
  return {
    nombreEmpresa: configuracion.nombreEmpresa,
    ruc: configuracion.ruc ?? "",
    colorPrimario: configuracion.colorPrimario,
    colorSecundario: configuracion.colorSecundario,
    telefonoContacto: configuracion.telefonoContacto ?? "",
    emailContacto: configuracion.emailContacto ?? "",
    direccionContacto: configuracion.direccionContacto ?? "",
    fechaFacturacionGlobal: configuracion.fechaFacturacionGlobal,
    formatoBoletaDefault: configuracion.formatoBoletaDefault,
  };
}

function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-6 shadow-card">
      <h2 className="mb-4 text-[16px] font-semibold text-ink">{titulo}</h2>
      {children}
    </div>
  );
}

function iniciales(texto: string | undefined): string {
  if (!texto) return "CB";
  return texto
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => palabra[0]?.toUpperCase())
    .join("");
}

function LogoUploader({
  logoUrl,
  nombreEmpresa,
  onCambio,
}: {
  logoUrl: string | null;
  nombreEmpresa: string | undefined;
  onCambio: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subirArchivo = async (file: File) => {
    setError(null);
    if (!TIPOS_LOGO_PERMITIDOS.includes(file.type)) {
      setError("Solo se permiten imágenes PNG, JPG, WEBP o SVG");
      return;
    }
    if (file.size > UN_MB) {
      setError("El archivo no puede superar 1 MB");
      return;
    }
    setSubiendo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await apiClient.post("/configuracion/logo", formData, { headers: { "Content-Type": "multipart/form-data" } });
      onCambio();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No se pudo subir el logo");
    } finally {
      setSubiendo(false);
    }
  };

  const quitarLogo = async (event: React.MouseEvent) => {
    event.stopPropagation();
    setError(null);
    try {
      await apiClient.delete("/configuracion/logo");
      onCambio();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No se pudo quitar el logo");
    }
  };

  return (
    <div>
      <label className={LABEL_CLASE}>Logo</label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(event) => {
          event.preventDefault();
          setArrastrando(false);
          const file = event.dataTransfer.files?.[0];
          if (file) subirArchivo(file);
        }}
        className={`flex cursor-pointer items-center gap-4 rounded-lg border border-dashed p-4 transition-colors ${
          arrastrando ? "border-primary bg-primary-tint" : "border-border-field bg-surface-subtle hover:bg-primary-tint"
        }`}
      >
        {logoUrl ? (
          <img
            src={resolverUrlArchivo(logoUrl)}
            alt="Logo"
            className="h-14 w-14 rounded-lg border border-border bg-surface object-contain"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
            {iniciales(nombreEmpresa)}
          </div>
        )}
        <div className="text-sm">
          <p className="font-medium text-ink">{subiendo ? "Subiendo..." : "Arrastra un PNG o SVG, o haz clic para elegir"}</p>
          <p className="text-xs text-ink-weak">Máx. 1 MB · aparece en la app y en la boleta</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={TIPOS_LOGO_PERMITIDOS.join(",")}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) subirArchivo(file);
            event.target.value = "";
          }}
        />
      </div>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
      {logoUrl && (
        <button type="button" onClick={quitarLogo} className="mt-2 text-xs text-error hover:underline">
          Quitar logo
        </button>
      )}
    </div>
  );
}

function SeccionCatalogos() {
  const [tipos, setTipos] = useState<TipoServicio[]>([]);
  const [nuevoTipo, setNuevoTipo] = useState("");
  const [mostrarNuevo, setMostrarNuevo] = useState(false);

  const cargar = () => apiClient.get<TipoServicio[]>("/tipos-servicio").then(({ data }) => setTipos(data));

  useEffect(() => {
    cargar();
  }, []);

  const crear = async () => {
    if (!nuevoTipo.trim()) return;
    await apiClient.post("/tipos-servicio", { nombre: nuevoTipo });
    setNuevoTipo("");
    setMostrarNuevo(false);
    await cargar();
  };

  return (
    <Tarjeta titulo="Catálogos">
      <label className={LABEL_CLASE}>Tipos de servicio</label>
      <div className="flex flex-wrap gap-2">
        {tipos.map((tipo) => (
          <span key={tipo.id} className="rounded-full border border-border-field px-3.5 py-1.5 text-sm capitalize text-ink-2">
            {tipo.nombre}
          </span>
        ))}
        {mostrarNuevo ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={nuevoTipo}
              onChange={(event) => setNuevoTipo(event.target.value)}
              placeholder="Ej. internet"
              className="rounded-full border border-border-field px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={crear}
              className="rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              Agregar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setMostrarNuevo(true)}
            className="rounded-full border border-dashed border-border-field px-3.5 py-1.5 text-sm text-ink-weak transition-colors hover:bg-surface-subtle"
          >
            + Nuevo tipo
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-ink-weak">
        Las zonas/caseríos se administran en la pestaña "Zonas" y las categorías de egreso, en "Caja".
      </p>
    </Tarjeta>
  );
}

function SeccionServiciosTecnicos() {
  const [tipos, setTipos] = useState<TipoServicioTecnico[]>([]);
  const [nombre, setNombre] = useState("");
  const [campos, setCampos] = useState("");
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [creando, setCreando] = useState(false);

  const cargar = () => apiClient.get<TipoServicioTecnico[]>("/tipos-servicio-tecnico").then(({ data }) => setTipos(data));

  useEffect(() => {
    cargar();
  }, []);

  const crear = async () => {
    if (!nombre.trim()) return;
    setCreando(true);
    try {
      const camposDefinicion = campos
        .split(",")
        .map((campo) => campo.trim())
        .filter((campo) => campo.length > 0);
      await apiClient.post("/tipos-servicio-tecnico", { nombre, camposDefinicion });
      setNombre("");
      setCampos("");
      setMostrarNuevo(false);
      await cargar();
    } finally {
      setCreando(false);
    }
  };

  return (
    <Tarjeta titulo="Tipos de servicio técnico">
      <p className="text-sm text-ink-2">
        Averías, instalaciones, cambios de domicilio... cada tipo puede tener sus propios campos (ej. "equipo retirado",
        "número de serie").
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {tipos.map((tipo) => (
          <div key={tipo.id} className="flex items-center justify-between rounded-lg border border-border-field px-3.5 py-2">
            <span className="text-sm font-medium capitalize text-ink">{tipo.nombre}</span>
            {tipo.camposDefinicion.length > 0 && (
              <span className="text-xs text-ink-weak">{tipo.camposDefinicion.join(", ")}</span>
            )}
          </div>
        ))}
      </div>
      {mostrarNuevo ? (
        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-border-field bg-surface-subtle p-3">
          <div>
            <label className={LABEL_CLASE}>Nombre</label>
            <input
              autoFocus
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              placeholder="Ej. Instalación"
              className={INPUT_CLASE}
            />
          </div>
          <div>
            <label className={LABEL_CLASE}>Campos propios (separados por coma, opcional)</label>
            <input
              value={campos}
              onChange={(event) => setCampos(event.target.value)}
              placeholder="Ej. equipo instalado, número de serie"
              className={INPUT_CLASE}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={crear}
              disabled={creando || !nombre.trim()}
              className="rounded-[9px] bg-primary hover:bg-primary-hover transition-colors px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Agregar
            </button>
            <button type="button" onClick={() => setMostrarNuevo(false)} className="text-sm text-ink-weak underline">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setMostrarNuevo(true)}
          className="mt-3 rounded-[9px] border border-dashed border-border-field px-4 py-2 text-sm text-ink-weak transition-colors hover:bg-surface-subtle"
        >
          + Nuevo tipo de servicio técnico
        </button>
      )}
    </Tarjeta>
  );
}

function SeccionBackup() {
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const descargar = async () => {
    setError(null);
    setDescargando(true);
    try {
      const { data } = await apiClient.get("/exportacion/backup-excel", { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `backup-cablera-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("No se pudo generar el backup.");
    } finally {
      setDescargando(false);
    }
  };

  return (
    <Tarjeta titulo="Copia de seguridad">
      <p className="text-sm text-ink-2">
        Descarga un Excel con clientes, cargos mensuales, boletas, movimientos de caja y gastos reportados.
        Además, el sistema genera esta misma copia automáticamente todos los días a las 2 a.m.
      </p>
      <button
        type="button"
        onClick={descargar}
        disabled={descargando}
        className="mt-4 rounded-[9px] border border-border-field px-4 py-2 text-sm font-semibold text-ink-2 hover:bg-surface-subtle transition-colors disabled:opacity-60"
      >
        {descargando ? "Generando..." : "Descargar backup Excel"}
      </button>
      {error && <p className="mt-2 text-sm text-error">{error}</p>}
    </Tarjeta>
  );
}

const ROLES_ASIGNABLES: { valor: Rol; label: string }[] = [
  { valor: "gestor", label: "Administrador" },
  { valor: "cobrador", label: "Cobrador" },
];

function SeccionUsuarios() {
  const { usuario: miUsuario } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioListado[]>([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<Rol>("cobrador");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [accionandoId, setAccionandoId] = useState<string | null>(null);
  const [aConfirmar, setAConfirmar] = useState<UsuarioListado | null>(null);

  const cargar = () => apiClient.get<UsuarioListado[]>("/usuarios").then(({ data }) => setUsuarios(data));

  useEffect(() => {
    cargar();
  }, []);

  const crear = async () => {
    setError(null);
    setGuardando(true);
    try {
      await apiClient.post("/usuarios", { nombre, email, password, rol });
      setNombre("");
      setEmail("");
      setPassword("");
      setRol("cobrador");
      setMostrarForm(false);
      await cargar();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No se pudo crear el usuario");
    } finally {
      setGuardando(false);
    }
  };

  // "Eliminar" en este panel en realidad desactiva la cuenta (bloquea su login sin borrar su
  // historial de boletas/gastos/servicios técnicos) — ver backend/src/usuarios/usuarios.service.ts.
  const desactivar = async (id: string) => {
    setAccionandoId(id);
    setError(null);
    try {
      await apiClient.post(`/usuarios/${id}/desactivar`);
      await cargar();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No se pudo eliminar el usuario");
    } finally {
      setAccionandoId(null);
      setAConfirmar(null);
    }
  };

  const activar = async (id: string) => {
    setAccionandoId(id);
    setError(null);
    try {
      await apiClient.post(`/usuarios/${id}/activar`);
      await cargar();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No se pudo reactivar el usuario");
    } finally {
      setAccionandoId(null);
    }
  };

  return (
    <Tarjeta titulo="Usuarios y accesos">
      {aConfirmar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-[9px] bg-surface p-5 shadow-lg">
            <p className="text-sm font-semibold text-ink">¿Eliminar a {aConfirmar.nombre}?</p>
            <p className="mt-2 text-sm text-ink-2">
              No podrá volver a iniciar sesión. Sus boletas, pagos y servicios técnicos ya
              registrados se conservan. Puedes reactivarla cuando quieras.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setAConfirmar(null)} className="text-sm text-ink-weak underline">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => desactivar(aConfirmar.id)}
                disabled={accionandoId === aConfirmar.id}
                className="rounded-[9px] bg-error px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <p className="mb-3 text-sm text-error">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-border-field">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-field bg-surface-subtle text-left text-[11px] uppercase tracking-[.05em] text-ink-weak">
              <th className="px-3 py-2 font-medium">Nombre</th>
              <th className="px-3 py-2 font-medium">Correo</th>
              <th className="px-3 py-2 font-medium">Rol</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="border-b border-divider last:border-0 hover:bg-row-hover">
                <td className="px-3 py-2 text-ink">{usuario.nombre}</td>
                <td className="px-3 py-2 text-ink-2">{usuario.email}</td>
                <td className="px-3 py-2 capitalize text-ink-2">
                  {usuario.activo ? (usuario.rol === "gestor" ? "administrador" : usuario.rol) : "inactivo"}
                </td>
                <td className="px-3 py-2 text-right">
                  {accionandoId === usuario.id ? (
                    <span className="text-xs text-ink-weak">…</span>
                  ) : !usuario.activo ? (
                    <button type="button" onClick={() => activar(usuario.id)} className="text-sm text-primary underline">
                      Reactivar
                    </button>
                  ) : usuario.id !== miUsuario?.id ? (
                    // Nunca te puedes eliminar a ti mismo: te dejaría sin poder volver a entrar.
                    <button type="button" onClick={() => setAConfirmar(usuario)} className="text-sm text-error underline">
                      Eliminar
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mostrarForm ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLASE}>Nombre</label>
            <input value={nombre} onChange={(event) => setNombre(event.target.value)} className={INPUT_CLASE} />
          </div>
          <div>
            <label className={LABEL_CLASE}>Correo</label>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={INPUT_CLASE} />
          </div>
          <div>
            <label className={LABEL_CLASE}>Contraseña temporal</label>
            <input
              type="text"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={INPUT_CLASE}
            />
          </div>
          <div>
            <label className={LABEL_CLASE}>Rol</label>
            <div className="flex gap-2">
              {ROLES_ASIGNABLES.map((opcion) => (
                <button
                  key={opcion.valor}
                  type="button"
                  onClick={() => setRol(opcion.valor)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    rol === opcion.valor ? "bg-primary text-white" : "border border-border-field text-ink-2 hover:bg-surface-subtle"
                  }`}
                >
                  {opcion.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="col-span-2 text-sm text-error">{error}</p>}

          <div className="col-span-2 flex gap-3">
            <button
              type="button"
              onClick={crear}
              disabled={guardando || !nombre || !email || !password}
              className="rounded-[9px] bg-primary hover:bg-primary-hover transition-colors px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Crear usuario
            </button>
            <button type="button" onClick={() => setMostrarForm(false)} className="text-sm text-ink-weak underline">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setMostrarForm(true)}
          className="mt-4 rounded-[9px] border border-border-field px-4 py-2 text-sm font-semibold text-ink-2 hover:bg-surface-subtle transition-colors"
        >
          Crear usuario
        </button>
      )}
    </Tarjeta>
  );
}

export function ConfiguracionPage() {
  const { configuracion, refresh } = useConfig();
  const [form, setForm] = useState<FormState | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    if (configuracion) {
      setForm(toFormState(configuracion));
    }
  }, [configuracion]);

  if (!form || !configuracion) {
    return (
      <AppShell>
        <p className="text-sm text-ink-2">Cargando...</p>
      </AppShell>
    );
  }

  const handleChange = <K extends keyof FormState>(campo: K, valor: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [campo]: valor } : prev));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setGuardando(true);
    setMensaje(null);
    try {
      await apiClient.patch("/configuracion", {
        ...form,
        ruc: form.ruc || undefined,
        telefonoContacto: form.telefonoContacto || undefined,
        emailContacto: form.emailContacto || undefined,
        direccionContacto: form.direccionContacto || undefined,
      });
      await refresh();
      setMensaje("Configuración guardada correctamente.");
    } catch {
      setMensaje("No se pudo guardar la configuración.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppShell>
      <div className="border-b border-border pb-5">
        <h1 className="font-serif text-[32px] font-normal tracking-[-0.01em] text-ink">Configuración</h1>
        <p className="mt-1 text-[13.5px] text-ink-2">Todo lo que cambia con el negocio se edita aquí, sin tocar el código.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex max-w-2xl flex-col gap-5">
        <Tarjeta titulo="Identidad de la empresa">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className={LABEL_CLASE}>Nombre</label>
              <input
                required
                value={form.nombreEmpresa}
                onChange={(event) => handleChange("nombreEmpresa", event.target.value)}
                className={INPUT_CLASE}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={LABEL_CLASE}>RUC</label>
              <input value={form.ruc} onChange={(event) => handleChange("ruc", event.target.value)} className={INPUT_CLASE} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={LABEL_CLASE}>Teléfono</label>
              <input
                value={form.telefonoContacto}
                onChange={(event) => handleChange("telefonoContacto", event.target.value)}
                className={INPUT_CLASE}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={LABEL_CLASE}>Correo</label>
              <input
                type="email"
                value={form.emailContacto}
                onChange={(event) => handleChange("emailContacto", event.target.value)}
                className={INPUT_CLASE}
              />
            </div>
            <div className="col-span-2">
              <label className={LABEL_CLASE}>Dirección</label>
              <input
                value={form.direccionContacto}
                onChange={(event) => handleChange("direccionContacto", event.target.value)}
                className={INPUT_CLASE}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <LogoUploader logoUrl={configuracion.logoUrl} nombreEmpresa={form.nombreEmpresa} onCambio={refresh} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={LABEL_CLASE}>Colores</label>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.colorPrimario}
                    onChange={(event) => handleChange("colorPrimario", event.target.value)}
                    className="h-9 w-9 rounded-md border border-border-field"
                  />
                  <span className="font-mono text-xs text-ink-2">{form.colorPrimario}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.colorSecundario}
                    onChange={(event) => handleChange("colorSecundario", event.target.value)}
                    className="h-9 w-9 rounded-md border border-border-field"
                  />
                  <span className="font-mono text-xs text-ink-2">{form.colorSecundario}</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-ink-weak">Primario y secundario. Se aplican en toda la app al guardar.</p>
            </div>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Facturación y boleta">
          <div className="flex flex-wrap gap-6">
            <div>
              <label className={LABEL_CLASE}>Día de facturación global (1-28)</label>
              <input
                type="number"
                min={1}
                max={28}
                value={form.fechaFacturacionGlobal}
                onChange={(event) => handleChange("fechaFacturacionGlobal", Number(event.target.value))}
                className={`${INPUT_CLASE} w-32`}
              />
            </div>
            <div>
              <label className={LABEL_CLASE}>Formato de boleta por defecto</label>
              <div className="flex gap-2">
                {(
                  [
                    { valor: "a4", label: "Hoja A4" },
                    { valor: "ticket", label: "Ticket 80 mm" },
                  ] as { valor: FormatoBoleta; label: string }[]
                ).map((opcion) => (
                  <button
                    key={opcion.valor}
                    type="button"
                    onClick={() => handleChange("formatoBoletaDefault", opcion.valor)}
                    className={`rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                      form.formatoBoletaDefault === opcion.valor
                        ? "bg-primary text-white"
                        : "border border-border-field text-ink-2 hover:bg-surface-subtle"
                    }`}
                  >
                    {opcion.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-ink-weak">Es el que se imprime al hacer clic en "Imprimir" en una boleta.</p>
            </div>
          </div>
        </Tarjeta>

        {mensaje && <p className="text-sm text-ink-2">{mensaje}</p>}

        <button
          type="submit"
          disabled={guardando}
          className="w-fit rounded-[9px] bg-primary hover:bg-primary-hover transition-colors px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>

      <div className="mt-5 flex max-w-2xl flex-col gap-5">
        <SeccionCatalogos />
        <SeccionServiciosTecnicos />
        <SeccionUsuarios />
        <SeccionBackup />
      </div>
    </AppShell>
  );
}
