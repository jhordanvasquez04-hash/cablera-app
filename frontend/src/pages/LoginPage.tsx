import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useConfig } from "../config/ConfigContext";

function IconoCorreo() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px] text-ink-weak">
      <path
        d="M3 5.5A1.5 1.5 0 0 1 4.5 4h11A1.5 1.5 0 0 1 17 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="m4 5.5 6 5 6-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoCandado() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px] text-ink-weak">
      <rect x="4" y="8.5" width="12" height="7.5" rx="1.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconoOjo({ tachado }: { tachado: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]">
      <path
        d="M1.5 10S4.5 4.5 10 4.5 18.5 10 18.5 10 15.5 15.5 10 15.5 1.5 10 1.5 10Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.4" />
      {tachado && <path d="M3 17 17 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />}
    </svg>
  );
}

function IconoAlerta() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px] shrink-0 text-error">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 6.5v4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="13.4" r="0.9" fill="currentColor" />
    </svg>
  );
}

function IconoCheck() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-white">
      <circle cx="10" cy="10" r="9" fill="white" fillOpacity="0.18" />
      <path d="m6.5 10.2 2.3 2.3 4.7-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoCargando() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 animate-spin">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.4" />
      <path d="M18 10a8 8 0 0 0-8-8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

const CARACTERISTICAS = ["Cobranza en campo, al instante", "Boletas y caja centralizadas", "Un acceso por gestor y por cobrador"];

export function LoginPage() {
  const { login } = useAuth();
  const { refresh: recargarMarca } = useConfig();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const usuario = await login(email, password);
      if (usuario.rol === "super_admin") {
        // El panel proveedor no pertenece a ninguna empresa: no tiene marca propia que cargar.
        navigate("/admin");
        return;
      }
      // Recién ahora se sabe de qué empresa es: se piden sus colores/logo antes de navegar, para
      // que el resto de la app abra ya con su marca (no con la neutra de este login).
      await recargarMarca();
      navigate("/");
    } catch {
      setError("Credenciales inválidas");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Panel de marca del PRODUCTO (CableGestion), no de una empresa: antes de iniciar sesión no hay
          forma de saber a cuál de las empresas que usan este mismo login pertenece la persona. Los
          colores de acá son siempre los por defecto de :root (index.css), nunca los que un gestor
          eligió en Configuración — esos recién se aplican después de autenticar, ya sin ambigüedad. */}
      <div className="relative hidden w-[42%] max-w-[520px] overflow-hidden bg-gradient-to-br from-primary to-secondary lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,.9) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative flex flex-1 flex-col justify-center px-12 py-16">
          <div className="mb-8 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
            <span className="font-serif text-2xl font-semibold text-white">CG</span>
          </div>
          <h1 className="font-serif text-[34px] font-semibold leading-tight text-white">CableGestion</h1>
          <p className="mt-2 max-w-[320px] text-[15px] text-white/75">Sistema de gestión para el cobro y la caja de tu empresa.</p>

          <ul className="mt-10 flex flex-col gap-3">
            {CARACTERISTICAS.map((caracteristica) => (
              <li key={caracteristica} className="flex items-center gap-2.5 text-[13.5px] text-white/85">
                <IconoCheck />
                {caracteristica}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Formulario */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-[380px]">
          {/* Encabezado compacto: solo visible cuando el panel de marca está oculto (pantallas < lg). */}
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-primary">
              <span className="text-sm font-bold text-white">CG</span>
            </div>
            <p className="font-serif text-lg font-semibold text-ink">CableGestion</p>
          </div>

          <div className="rounded-xl bg-surface p-[30px] shadow-login lg:shadow-card lg:ring-1 lg:ring-border">
            <div className="mb-6">
              <h2 className="text-[22px] font-semibold text-ink">Bienvenido de nuevo</h2>
              <p className="mt-1 text-[13.5px] text-ink-weak">Ingresa con tu cuenta de gestor o cobrador</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">
                  Correo
                </label>
                <div className="flex items-center gap-2.5 rounded-lg border border-border-field px-[13px] py-3 transition-colors focus-within:border-primary">
                  <IconoCorreo />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full text-[14.5px] text-ink outline-none placeholder:text-ink-weak"
                    placeholder="tu@empresa.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">
                  Contraseña
                </label>
                <div className="flex items-center gap-2.5 rounded-lg border border-border-field px-[13px] py-3 transition-colors focus-within:border-primary">
                  <IconoCandado />
                  <input
                    id="password"
                    type={mostrarPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full text-[14.5px] text-ink outline-none placeholder:text-ink-weak"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPassword((valor) => !valor)}
                    className="text-ink-weak transition-colors hover:text-ink-2"
                    aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    <IconoOjo tachado={mostrarPassword} />
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-error-border bg-error-bg px-3 py-2.5 text-sm text-error">
                  <IconoAlerta />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="mt-1 flex items-center justify-center gap-2 rounded-[9px] bg-primary px-4 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
              >
                {enviando && <IconoCargando />}
                {enviando ? "Ingresando..." : "Ingresar"}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-[12.5px] text-ink-weak">¿Problemas para ingresar? Contacta a tu administrador.</p>
        </div>
      </div>
    </div>
  );
}
