import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useConfig } from "../config/ConfigContext";
import { resolverUrlArchivo } from "../api/client";

function iniciales(texto: string | undefined): string {
  if (!texto) return "CB";
  return texto
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => palabra[0]?.toUpperCase())
    .join("");
}

export function LoginPage() {
  const { login } = useAuth();
  const { configuracion } = useConfig();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const usuario = await login(email, password);
      navigate(usuario.rol === "super_admin" ? "/admin" : "/");
    } catch {
      setError("Credenciales inválidas");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4">
      <div className="w-full max-w-[380px] rounded-xl bg-surface p-[30px] shadow-login">
        <div className="mb-6 flex items-center gap-3">
          {configuracion?.logoUrl ? (
            <img src={resolverUrlArchivo(configuracion.logoUrl)} alt="Logo" className="h-[38px] w-[38px] rounded-lg object-contain" />
          ) : (
            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
              {iniciales(configuracion?.nombreEmpresa)}
            </div>
          )}
          <div>
            <p className="text-[15px] font-semibold text-ink">{configuracion?.nombreEmpresa ?? "Cablera"}</p>
            <p className="text-xs text-ink-weak">Sistema de gestión</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">
              Correo
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-border-field px-[13px] py-3 text-[14.5px] focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-border-field px-[13px] py-3 text-[14.5px] focus:border-primary focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="rounded-[9px] bg-primary hover:bg-primary-hover transition-colors px-4 py-3.5 text-[15px] font-semibold text-white disabled:opacity-60"
          >
            {enviando ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
