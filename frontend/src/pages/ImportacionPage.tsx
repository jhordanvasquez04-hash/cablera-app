import { useState, type FormEvent } from "react";
import { AppShell } from "../components/AppShell";
import { apiClient } from "../api/client";
import type { ResumenImportacion, ResumenImportacionSimple } from "../api/types";

export function ImportacionPage() {
  return (
    <AppShell>
      <div className="border-b border-border pb-5">
        <h1 className="font-serif text-[32px] font-normal tracking-[-0.01em] text-ink">Importar clientes</h1>
        <p className="mt-1 max-w-xl text-[13.5px] text-ink-2">
          Elige la opción según tu caso: alta rápida de tu cartera de clientes actual, o migración de un historial de
          cobranza ya existente.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SeccionImportacionSimple />
        <SeccionImportacionHistorica />
      </div>
    </AppShell>
  );
}

function SeccionImportacionSimple() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [descargandoPlantilla, setDescargandoPlantilla] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<ResumenImportacionSimple | null>(null);

  const descargarPlantilla = async () => {
    setDescargandoPlantilla(true);
    try {
      const { data } = await apiClient.get("/importacion/plantilla-clientes-excel", { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = "plantilla-clientes.xlsx";
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("No se pudo descargar la plantilla.");
    } finally {
      setDescargandoPlantilla(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!archivo) return;

    setError(null);
    setResumen(null);
    setImportando(true);
    try {
      const formData = new FormData();
      formData.append("file", archivo);
      const { data } = await apiClient.post<ResumenImportacionSimple>("/importacion/clientes-lista-excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResumen(data);
      setArchivo(null);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No se pudo importar el archivo");
    } finally {
      setImportando(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-6 shadow-card">
      <h2 className="text-[16px] font-semibold text-ink">Alta rápida de clientes</h2>
      <p className="mt-1 text-[13.5px] text-ink-2">
        Ideal para una empresa nueva: sube tu lista de clientes (nombre, zona, tipo de servicio y tarifa) y evita
        cargarlos uno por uno a mano. No requiere historial de pagos — la facturación se genera hacia adelante,
        automáticamente.
      </p>

      <button
        type="button"
        onClick={descargarPlantilla}
        disabled={descargandoPlantilla}
        className="mt-4 text-sm font-medium text-primary hover:underline disabled:opacity-60"
      >
        {descargandoPlantilla ? "Generando..." : "Descargar plantilla de ejemplo (.xlsx)"}
      </button>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept=".xlsx"
          onChange={(event) => setArchivo(event.target.files?.[0] ?? null)}
          className="text-sm text-ink-2"
        />
        <button
          type="submit"
          disabled={!archivo || importando}
          className="rounded-[9px] bg-primary hover:bg-primary-hover transition-colors px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {importando ? "Importando..." : "Importar clientes"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-error">{error}</p>}

      {resumen && (
        <div className="mt-4 rounded-lg border border-divider bg-bg p-4">
          <ul className="text-sm text-ink-2">
            <li>Zonas creadas: {resumen.zonasCreadas}</li>
            <li>Clientes creados: {resumen.clientesCreados}</li>
          </ul>

          {resumen.avisos.length > 0 && (
            <div className="mt-3">
              <h3 className="text-sm font-semibold text-ink">Avisos para revisar ({resumen.avisos.length})</h3>
              <ul className="mt-2 max-h-48 overflow-y-auto text-sm text-ink-2">
                {resumen.avisos.map((aviso, indice) => (
                  <li key={indice} className="border-b border-divider py-1">
                    {aviso}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SeccionImportacionHistorica() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<ResumenImportacion | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!archivo) return;

    setError(null);
    setResumen(null);
    setImportando(true);
    try {
      const formData = new FormData();
      formData.append("file", archivo);
      const { data } = await apiClient.post<ResumenImportacion>("/importacion/clientes-excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResumen(data);
      setArchivo(null);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No se pudo importar el archivo");
    } finally {
      setImportando(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-6 shadow-card">
      <h2 className="text-[16px] font-semibold text-ink">Migrar historial de cobranza</h2>
      <p className="mt-1 text-[13.5px] text-ink-2">
        Para cuando ya llevabas el control en un Excel con formato de casillero (zonas por encabezado "CASERIO X" y
        una columna por cada mes pagado). Crea zonas, clientes y también el historial de cargos/pagos del año
        indicado. Pensada para ejecutarse <strong>una sola vez</strong>: volver a importar el mismo archivo creará
        clientes duplicados.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept=".xlsx"
          onChange={(event) => setArchivo(event.target.files?.[0] ?? null)}
          className="text-sm text-ink-2"
        />
        <button
          type="submit"
          disabled={!archivo || importando}
          className="rounded-[9px] bg-primary hover:bg-primary-hover transition-colors px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {importando ? "Importando..." : "Importar"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-error">{error}</p>}

      {resumen && (
        <div className="mt-4 rounded-lg border border-divider bg-bg p-4">
          <ul className="text-sm text-ink-2">
            <li>Zonas creadas: {resumen.zonasCreadas}</li>
            <li>Clientes creados: {resumen.clientesCreados}</li>
            <li>Cargos mensuales generados: {resumen.cargosCreados}</li>
            <li>Pagos registrados: {resumen.pagosCreados}</li>
          </ul>

          {resumen.avisos.length > 0 && (
            <div className="mt-3">
              <h3 className="text-sm font-semibold text-ink">Avisos para revisar ({resumen.avisos.length})</h3>
              <ul className="mt-2 max-h-48 overflow-y-auto text-sm text-ink-2">
                {resumen.avisos.map((aviso, indice) => (
                  <li key={indice} className="border-b border-divider py-1">
                    {aviso}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
