import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { apiClient } from "../api/client";
import type { Cliente, TipoServicioTecnico } from "../api/types";

function BuscadorCliente({ onSeleccionar }: { onSeleccionar: (cliente: Cliente) => void }) {
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<Cliente[]>([]);

  useEffect(() => {
    if (busqueda.trim().length < 2) {
      setResultados([]);
      return;
    }
    const timeout = setTimeout(() => {
      apiClient.get<Cliente[]>("/clientes", { params: { busqueda } }).then(({ data }) => setResultados(data));
    }, 300);
    return () => clearTimeout(timeout);
  }, [busqueda]);

  return (
    <div className="max-w-md">
      <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Cliente</label>
      <input
        autoFocus
        value={busqueda}
        onChange={(event) => setBusqueda(event.target.value)}
        placeholder="Nombre, DNI o N° de contrato"
        className="w-full rounded-lg border border-border-field px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
      />
      {resultados.length > 0 && (
        <div className="mt-2 overflow-hidden rounded-lg border border-border bg-surface shadow-card">
          {resultados.map((cliente) => (
            <button
              key={cliente.id}
              onClick={() => onSeleccionar(cliente)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-row-hover"
            >
              <span className="font-medium text-ink">{cliente.nombreCompleto}</span>
              <span className="text-ink-weak">{cliente.zona.nombre}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const LABEL_CLASE = "mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3";
const INPUT_CLASE = "w-full rounded-lg border border-border-field px-3 py-2.5 text-sm text-ink focus:border-primary focus:outline-none";

export function ServicioNuevoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clienteIdFijo = searchParams.get("clienteId");

  const [tipos, setTipos] = useState<TipoServicioTecnico[]>([]);
  const [tipoId, setTipoId] = useState("");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [tecnico, setTecnico] = useState("");
  const [fechaProgramada, setFechaProgramada] = useState("");
  const [comentario, setComentario] = useState("");
  const [datosPropios, setDatosPropios] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    apiClient.get<TipoServicioTecnico[]>("/tipos-servicio-tecnico").then(({ data }) => {
      setTipos(data);
      setTipoId((actual) => actual || data[0]?.id || "");
    });
    if (clienteIdFijo) {
      apiClient.get<Cliente>(`/clientes/${clienteIdFijo}`).then(({ data }) => setCliente(data));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteIdFijo]);

  const tipoSeleccionado = tipos.find((tipo) => tipo.id === tipoId);

  const handleTipoChange = (id: string) => {
    setTipoId(id);
    const tipo = tipos.find((t) => t.id === id);
    setDatosPropios(Object.fromEntries((tipo?.camposDefinicion ?? []).map((campo) => [campo, ""])));
  };

  const handleGuardar = async () => {
    if (!cliente || !tipoId) {
      setError("Elige un cliente y un tipo de servicio");
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      const { data: servicio } = await apiClient.post("/servicios-tecnicos", {
        tipoServicioTecnicoId: tipoId,
        clienteId: cliente.id,
        tecnico: tecnico || undefined,
        fechaProgramada: fechaProgramada ? `${fechaProgramada}T00:00:00-05:00` : undefined,
        comentario: comentario || undefined,
        datosPropios: Object.fromEntries(Object.entries(datosPropios).filter(([, valor]) => valor.trim() !== "")),
      });
      navigate(clienteIdFijo ? `/clientes/${clienteIdFijo}` : `/servicios`, { state: { servicioCreado: servicio.id } });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No se pudo crear el servicio");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppShell>
      <Link
        to={clienteIdFijo ? `/clientes/${clienteIdFijo}` : "/servicios"}
        className="inline-flex items-center gap-1 rounded-[9px] border border-border-field px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-subtle"
      >
        ← Volver
      </Link>
      <div className="mt-2 border-b border-border pb-5">
        <h1 className="font-serif text-[32px] font-normal tracking-[-0.01em] text-ink">Nuevo servicio técnico</h1>
      </div>

      <div className="mt-5 max-w-2xl rounded-lg border border-border bg-surface p-5 shadow-card">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className={LABEL_CLASE}>Tipo de servicio</label>
            <select value={tipoId} onChange={(event) => handleTipoChange(event.target.value)} className={INPUT_CLASE}>
              {tipos.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className={LABEL_CLASE}>Técnico</label>
            <input value={tecnico} onChange={(event) => setTecnico(event.target.value)} className={INPUT_CLASE} />
          </div>

          <div className="col-span-2">
            {clienteIdFijo ? (
              <>
                <label className={LABEL_CLASE}>Cliente</label>
                <p className="text-sm text-ink">{cliente?.nombreCompleto ?? "Cargando..."}</p>
              </>
            ) : cliente ? (
              <div className="flex items-center justify-between rounded-lg border border-border-field px-3 py-2.5">
                <span className="text-sm font-medium text-ink">
                  {cliente.nombreCompleto} · {cliente.zona.nombre}
                </span>
                <button type="button" onClick={() => setCliente(null)} className="text-xs text-primary hover:underline">
                  Cambiar
                </button>
              </div>
            ) : (
              <BuscadorCliente onSeleccionar={setCliente} />
            )}
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className={LABEL_CLASE}>Fecha programada (opcional)</label>
            <input
              type="date"
              value={fechaProgramada}
              onChange={(event) => setFechaProgramada(event.target.value)}
              className={INPUT_CLASE}
            />
          </div>

          {tipoSeleccionado?.camposDefinicion.map((campo) => (
            <div key={campo} className="col-span-2 sm:col-span-1">
              <label className={LABEL_CLASE}>{campo}</label>
              <input
                value={datosPropios[campo] ?? ""}
                onChange={(event) => setDatosPropios((prev) => ({ ...prev, [campo]: event.target.value }))}
                className={INPUT_CLASE}
              />
            </div>
          ))}

          <div className="col-span-2">
            <label className={LABEL_CLASE}>Comentario al iniciar (opcional)</label>
            <input value={comentario} onChange={(event) => setComentario(event.target.value)} className={INPUT_CLASE} />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-error">{error}</p>}

        <button
          onClick={handleGuardar}
          disabled={guardando || !cliente || !tipoId}
          className="mt-4 rounded-[9px] bg-primary hover:bg-primary-hover transition-colors px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {guardando ? "Creando..." : "Crear servicio"}
        </button>
      </div>
    </AppShell>
  );
}
