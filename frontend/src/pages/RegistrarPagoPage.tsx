import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { apiClient } from "../api/client";
import type { CargoPendiente, Cliente, MetodoPago } from "../api/types";

const METODOS: { valor: MetodoPago; label: string }[] = [
  { valor: "efectivo", label: "Efectivo" },
  { valor: "yape", label: "Yape" },
  { valor: "plin", label: "Plin" },
  { valor: "transferencia", label: "Transf." },
];

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"];

function IconoBuscar() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-ink-weak">
      <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 14L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function BuscadorCliente({ onSeleccionar }: { onSeleccionar: (cliente: Cliente) => void }) {
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<Cliente[]>([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (busqueda.trim().length < 2) {
      setResultados([]);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    const timeout = setTimeout(() => {
      apiClient.get<Cliente[]>("/clientes", { params: { busqueda } }).then(({ data }) => {
        setResultados(data);
        setBuscando(false);
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [busqueda]);

  return (
    <div className="max-w-xl">
      <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">
        Buscar cliente
      </label>
      <div className="flex items-center gap-2.5 rounded-lg border border-border-field bg-surface px-4 py-3">
        <IconoBuscar />
        <input
          autoFocus
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          placeholder="Nombre, DNI o N° de contrato"
          className="w-full text-[15px] text-ink outline-none"
        />
      </div>
      {busqueda.trim().length >= 2 && (
        <div className="mt-2 overflow-hidden rounded-lg border border-border bg-surface shadow-card">
          {buscando ? (
            <p className="px-4 py-3 text-sm text-ink-weak">Buscando...</p>
          ) : resultados.length > 0 ? (
            resultados.map((cliente) => (
              <button
                key={cliente.id}
                onClick={() => onSeleccionar(cliente)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-row-hover"
              >
                <span className="font-medium text-ink">{cliente.nombreCompleto}</span>
                <span className="text-ink-weak">{cliente.zona.nombre}</span>
              </button>
            ))
          ) : (
            <p className="px-4 py-3 text-sm text-ink-weak">Sin resultados para "{busqueda}".</p>
          )}
        </div>
      )}
    </div>
  );
}

export function RegistrarPagoPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clienteIdInicial = searchParams.get("clienteId");

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [cargos, setCargos] = useState<CargoPendiente[]>([]);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState<MetodoPago>("efectivo");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cargarCliente = async (id: string) => {
    const [{ data: datosCliente }, { data: datosCargos }] = await Promise.all([
      apiClient.get<Cliente>(`/clientes/${id}`),
      apiClient.get<CargoPendiente[]>(`/clientes/${id}/cargos-pendientes`),
    ]);
    setCliente(datosCliente);
    setCargos(datosCargos);
    const todos = new Set(datosCargos.map((cargo) => cargo.id));
    setSeleccionados(todos);
    setMonto(datosCargos.reduce((suma, cargo) => suma + cargo.saldo, 0).toFixed(2));
  };

  useEffect(() => {
    if (clienteIdInicial) {
      cargarCliente(clienteIdInicial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteIdInicial]);

  const saldoSeleccionado = useMemo(
    () => cargos.filter((cargo) => seleccionados.has(cargo.id)).reduce((suma, cargo) => suma + cargo.saldo, 0),
    [cargos, seleccionados],
  );

  const toggleCargo = (cargoId: string) => {
    setSeleccionados((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(cargoId)) {
        nuevo.delete(cargoId);
      } else {
        nuevo.add(cargoId);
      }
      const nuevoSaldo = cargos.filter((c) => nuevo.has(c.id)).reduce((s, c) => s + c.saldo, 0);
      setMonto(nuevoSaldo.toFixed(2));
      return nuevo;
    });
  };

  const handleRegistrar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cliente) return;
    setError(null);
    setEnviando(true);
    try {
      const { data: boleta } = await apiClient.post("/boletas", {
        clienteId: cliente.id,
        cargoIds: Array.from(seleccionados),
        montoPagado: Number(monto),
        metodoPago: metodo,
      });
      navigate(`/boletas/${boleta.id}`, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No se pudo registrar el pago");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AppShell>
      <Link
        to="/"
        className="inline-flex items-center gap-1 rounded-[9px] border border-border-field px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-subtle"
      >
        ← Volver a cobranza
      </Link>
      <div className="mt-2 border-b border-border pb-5">
        <h1 className="font-serif text-[32px] font-normal tracking-[-0.01em] text-ink">Registrar pago</h1>
      </div>

      {!cliente ? (
        <div className="mt-4">
          <BuscadorCliente onSeleccionar={(c) => cargarCliente(c.id)} />
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
            <div>
              <p className="font-medium text-ink">{cliente.nombreCompleto}</p>
              <p className="text-[13px] text-ink-weak">
                DNI {cliente.dni ?? "—"} · {cliente.zona.nombre}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-[.07em] text-ink-weak">Saldo total</p>
                <p className="font-mono text-[18px] font-semibold text-error">
                  S/ {cargos.reduce((suma, cargo) => suma + cargo.saldo, 0).toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => {
                  setCliente(null);
                  setCargos([]);
                  setSeleccionados(new Set());
                  setMonto("");
                  setError(null);
                }}
                className="rounded-lg border border-border-field px-3 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-subtle"
              >
                Cambiar cliente
              </button>
            </div>
          </div>

          <div className="mt-5 max-w-2xl rounded-lg border border-border bg-surface p-5 shadow-card">
            <p className="mb-3 text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">Cargos a cubrir</p>

            {cargos.length === 0 && <p className="text-sm text-ink-weak">Este cliente no tiene cargos pendientes.</p>}

            <div className="flex flex-col gap-2.5">
              {cargos.map((cargo) => (
                <label
                  key={cargo.id}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 ${
                    seleccionados.has(cargo.id) ? "border-primary bg-primary-tint" : "border-border-field"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={seleccionados.has(cargo.id)}
                      onChange={() => toggleCargo(cargo.id)}
                      className="h-[18px] w-[18px] rounded border-border-field"
                    />
                    <div>
                      <p className="font-medium text-ink">
                        {MESES[cargo.mes - 1]} {cargo.anio}
                      </p>
                      <p className="text-xs text-ink-weak">
                        {cargo.estado === "parcial" ? "Saldo del cargo parcial" : "Cargo mensual completo"}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-[17px] text-ink">S/ {cargo.saldo.toFixed(2)}</span>
                </label>
              ))}
            </div>
          </div>

          {cargos.length > 0 && (
            <form onSubmit={handleRegistrar} className="mt-5 flex max-w-2xl flex-wrap items-end gap-6">
              <div>
                <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">
                  Monto a pagar
                </label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={monto}
                  onChange={(event) => setMonto(event.target.value)}
                  className="w-40 rounded-lg border border-border-field px-3 py-2.5 font-mono text-[17px] font-semibold text-ink focus:border-primary focus:outline-none"
                />
                <p className="mt-1 text-xs text-ink-weak">Seleccionado: S/ {saldoSeleccionado.toFixed(2)}</p>
              </div>

              <div>
                <label className="mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3">
                  Método de pago
                </label>
                <div className="flex gap-2">
                  {METODOS.map((opcion) => (
                    <button
                      type="button"
                      key={opcion.valor}
                      onClick={() => setMetodo(opcion.valor)}
                      className={`rounded-lg px-3.5 py-2.5 text-sm font-medium ${
                        metodo === opcion.valor ? "bg-primary text-white" : "border border-border-field text-ink-2 hover:bg-surface-subtle transition-colors"
                      }`}
                    >
                      {opcion.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="w-full text-sm text-error">{error}</p>}

              <button
                type="submit"
                disabled={enviando || seleccionados.size === 0}
                className="rounded-[9px] bg-primary hover:bg-primary-hover transition-colors px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {enviando ? "Registrando..." : "Registrar y emitir boleta"}
              </button>
            </form>
          )}
        </>
      )}
    </AppShell>
  );
}
