import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { apiClient, resolverUrlArchivo } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useConfig } from "../config/ConfigContext";
import { useConfirm } from "../components/ConfirmContext";
import { useMostrarError } from "../components/ToastContext";
import type { BoletaDetalle } from "../api/types";

function iniciales(texto: string | undefined): string {
  if (!texto) return "CB";
  return texto
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => palabra[0]?.toUpperCase())
    .join("");
}

export function BoletaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { configuracion } = useConfig();
  const confirmar = useConfirm();
  const mostrarError = useMostrarError();
  const [boleta, setBoleta] = useState<BoletaDetalle | null>(null);
  const [anulando, setAnulando] = useState(false);

  const cargar = async () => {
    const { data } = await apiClient.get<BoletaDetalle>(`/boletas/${id}`);
    setBoleta(data);
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAnular = async () => {
    if (!boleta) return;
    const confirmado = await confirmar(
      `¿Anular la boleta ${boleta.folio}? El saldo de sus cargos volverá a quedar pendiente.`,
      { titulo: "Anular boleta", textoConfirmar: "Anular", destructivo: true },
    );
    if (!confirmado) return;
    setAnulando(true);
    try {
      await apiClient.post(`/boletas/${boleta.id}/anular`, {});
      await cargar();
      const registrarAhora = await confirmar("Boleta anulada. ¿Quieres registrar el pago correcto ahora?", {
        titulo: "Boleta anulada",
        textoConfirmar: "Registrar pago",
      });
      if (registrarAhora) {
        navigate(`/pagos/nuevo?clienteId=${boleta.cliente.id}`);
      }
    } catch (err: any) {
      mostrarError(err?.response?.data?.message ?? "No se pudo anular la boleta");
    } finally {
      setAnulando(false);
    }
  };

  if (!boleta) {
    return (
      <AppShell>
        <p className="text-sm text-ink-2">Cargando...</p>
      </AppShell>
    );
  }

  const fecha = new Date(boleta.fecha);
  const fechaCorta = fecha.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
  const horaCorta = fecha.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

  return (
    <AppShell>
      <div className="border-b border-border pb-5 print:hidden">
        <Link
          to="/boletas"
          className="inline-flex items-center gap-1 rounded-[9px] border border-border-field px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-subtle"
        >
          ← Volver a boletas
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-[32px] font-normal tracking-[-0.01em] text-ink">Boleta {boleta.folio}</h1>
          <div className="flex gap-2">
            {usuario?.rol === "gestor" && boleta.estado === "emitida" && (
              <button
                onClick={handleAnular}
                disabled={anulando}
                className="rounded-[9px] border border-error-border px-4 py-2.5 text-sm font-semibold text-error hover:bg-error-bg disabled:opacity-60"
              >
                Anular y reemitir
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="rounded-[9px] bg-primary hover:bg-primary-hover transition-colors px-4 py-2.5 text-sm font-semibold text-white"
            >
              Imprimir
            </button>
          </div>
        </div>
        {boleta.estado === "anulada" && (
          <p className="mt-2 inline-block rounded-[5px] bg-error-bg px-2 py-0.5 text-xs font-medium text-error">Anulada</p>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Hoja A4 */}
        <div className={configuracion?.formatoBoletaDefault === "ticket" ? "print:hidden" : ""}>
          <p className="mb-2 text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-weak print:hidden">
            Hoja A4 {configuracion?.formatoBoletaDefault === "a4" && "(por defecto)"}
          </p>
          <div className="rounded-lg border border-border bg-surface p-6 shadow-card">
            <div className="flex items-start justify-between border-b border-ink pb-3">
              <div className="flex items-center gap-3">
                {configuracion?.logoUrl ? (
                  <img src={resolverUrlArchivo(configuracion.logoUrl)} alt="Logo" className="h-10 w-10 rounded-lg object-contain" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
                    {iniciales(configuracion?.nombreEmpresa)}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-ink">{configuracion?.nombreEmpresa}</p>
                  <p className="text-xs text-ink-weak">
                    {configuracion?.ruc ? `RUC ${configuracion.ruc} · ` : ""}
                    {configuracion?.direccionContacto}
                  </p>
                  <p className="text-xs text-ink-weak">{configuracion?.telefonoContacto}</p>
                </div>
              </div>
              <div className="whitespace-nowrap text-right">
                <p className="text-xs text-ink-weak">BOLETA</p>
                <p className="font-mono text-lg font-bold text-ink">{boleta.folio}</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-ink-weak">Cliente</p>
                <p className="font-medium text-ink">{boleta.cliente.nombreCompleto}</p>
              </div>
              <div>
                <p className="text-xs text-ink-weak">DNI</p>
                <p className="font-mono text-ink">{boleta.dni ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-ink-weak">Zona</p>
                <p className="text-ink">{boleta.cliente.zona}</p>
              </div>
              <div>
                <p className="text-xs text-ink-weak">Fecha</p>
                <p className="text-ink">
                  {fechaCorta} · {horaCorta}
                </p>
              </div>
            </div>

            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-divider text-left text-xs uppercase text-ink-weak">
                  <th className="pb-1 font-medium">Concepto</th>
                  <th className="pb-1 text-right font-medium">Importe</th>
                </tr>
              </thead>
              <tbody>
                {boleta.lineas.map((linea, indice) => (
                  <tr key={indice} className="border-b border-divider">
                    <td className="py-1.5 text-ink">
                      Servicio de cable · {linea.periodo}
                      {linea.esSaldo ? " (saldo)" : ""}
                    </td>
                    <td className="py-1.5 text-right font-mono text-ink">{linea.montoAplicado.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-3 flex justify-end">
              <p className="text-[15px] font-bold text-ink">Total: S/ {boleta.montoTotal.toFixed(2)}</p>
            </div>
            <p className="mt-2 border-t border-dashed border-ink-weak pt-2 text-xs text-ink-weak">
              Método: <span className="capitalize">{boleta.metodoPago}</span>
            </p>
            <p className="mt-4 text-center text-xs text-ink-weak">Gracias por su preferencia</p>
          </div>
        </div>

        {/* Ticket 80mm */}
        <div className={configuracion?.formatoBoletaDefault === "a4" ? "print:hidden" : ""}>
          <p className="mb-2 text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-weak print:hidden">
            Ticketera 80 mm {configuracion?.formatoBoletaDefault === "ticket" && "(por defecto)"}
          </p>
          <div className="mx-auto max-w-[290px] rounded-lg border border-border bg-surface p-4 font-mono text-xs uppercase shadow-card">
            <p className="text-center font-semibold">{configuracion?.nombreEmpresa}</p>
            {configuracion?.ruc && <p className="text-center">RUC {configuracion.ruc}</p>}
            <p className="text-center">
              {configuracion?.direccionContacto} {configuracion?.telefonoContacto}
            </p>
            <p className="my-2 border-t border-dashed border-ink-weak" />
            <p>BOLETA {boleta.folio}</p>
            <p>
              {fechaCorta} {horaCorta}
            </p>
            <p>CLIENTE: {boleta.cliente.nombreCompleto}</p>
            {boleta.dni && <p>DNI: {boleta.dni}</p>}
            <p className="my-2 border-t border-dashed border-ink-weak" />
            {boleta.lineas.map((linea, indice) => (
              <div key={indice} className="flex justify-between">
                <span>
                  {linea.periodo} {linea.esSaldo ? "SALDO" : ""}
                </span>
                <span>{linea.montoAplicado.toFixed(2)}</span>
              </div>
            ))}
            <p className="my-2 border-t border-dashed border-ink-weak" />
            <div className="flex justify-between font-bold">
              <span>TOTAL</span>
              <span>S/ {boleta.montoTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
