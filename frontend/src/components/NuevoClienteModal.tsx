import { useState, type FormEvent } from "react";
import { apiClient } from "../api/client";
import type { Cliente, TipoServicio, Zona } from "../api/types";

interface FormState {
  dni: string;
  nombreCompleto: string;
  telefono: string;
  direccion: string;
  zonaId: string;
  tipoServicioId: string;
  montoBase: string;
  fechaFacturacionOverride: string;
}

const FORM_VACIO: FormState = {
  dni: "",
  nombreCompleto: "",
  telefono: "",
  direccion: "",
  zonaId: "",
  tipoServicioId: "",
  montoBase: "",
  fechaFacturacionOverride: "",
};

const LABEL_CLASE = "mb-1 block text-[11.5px] font-medium uppercase tracking-[.07em] text-ink-3";
const INPUT_CLASE =
  "w-full rounded-lg border border-border-field px-3 py-2.5 text-sm text-ink focus:border-primary focus:outline-none";

/** Modal de alta rápida de cliente, reutilizable desde cualquier pantalla (Cobranza, Clientes...)
 * sin tener que navegar a /clientes primero — trae sus propios catálogos (zonas, tipos de
 * servicio) al abrirse. */
export function useNuevoClienteModal(onCreado?: (cliente: Cliente) => void) {
  const [abierto, setAbierto] = useState(false);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(false);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [tiposServicio, setTiposServicio] = useState<TipoServicio[]>([]);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const abrir = async () => {
    setError(null);
    setForm(FORM_VACIO);
    setAbierto(true);
    setCargandoCatalogos(true);
    try {
      const [{ data: datosZonas }, { data: datosTipos }] = await Promise.all([
        apiClient.get<Zona[]>("/zonas"),
        apiClient.get<TipoServicio[]>("/tipos-servicio"),
      ]);
      setZonas(datosZonas);
      setTiposServicio(datosTipos);
      setForm((prev) => ({ ...prev, zonaId: datosZonas[0]?.id ?? "", tipoServicioId: datosTipos[0]?.id ?? "" }));
    } finally {
      setCargandoCatalogos(false);
    }
  };

  const cerrar = () => setAbierto(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const { data } = await apiClient.post<Cliente>("/clientes", {
        dni: form.dni,
        nombreCompleto: form.nombreCompleto,
        telefono: form.telefono || undefined,
        direccion: form.direccion || undefined,
        zonaId: form.zonaId,
        tipoServicioId: form.tipoServicioId,
        montoBase: Number(form.montoBase),
        fechaFacturacionOverride: form.fechaFacturacionOverride ? Number(form.fechaFacturacionOverride) : undefined,
      });
      setAbierto(false);
      onCreado?.(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No se pudo guardar el cliente");
    } finally {
      setGuardando(false);
    }
  };

  const modal = abierto ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/40 p-4" onClick={cerrar}>
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="grid w-full max-w-2xl grid-cols-2 gap-4 rounded-lg border border-border bg-surface p-6 shadow-modal"
      >
        <div className="col-span-2 flex items-center justify-between">
          <h2 className="font-serif text-[22px] font-normal tracking-[-0.01em] text-ink">Nuevo cliente</h2>
          <button type="button" onClick={cerrar} className="text-sm text-ink-weak underline">
            Cerrar
          </button>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className={LABEL_CLASE}>Nombre completo</label>
          <input
            required
            autoFocus
            value={form.nombreCompleto}
            onChange={(event) => setForm({ ...form, nombreCompleto: event.target.value })}
            className={INPUT_CLASE}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={LABEL_CLASE}>DNI</label>
          <input
            required
            value={form.dni}
            onChange={(event) => setForm({ ...form, dni: event.target.value })}
            className={INPUT_CLASE}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={LABEL_CLASE}>Teléfono</label>
          <input
            value={form.telefono}
            onChange={(event) => setForm({ ...form, telefono: event.target.value })}
            className={INPUT_CLASE}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={LABEL_CLASE}>Dirección / referencia</label>
          <input
            value={form.direccion}
            onChange={(event) => setForm({ ...form, direccion: event.target.value })}
            className={INPUT_CLASE}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={LABEL_CLASE}>Zona</label>
          <select
            required
            disabled={cargandoCatalogos}
            value={form.zonaId}
            onChange={(event) => setForm({ ...form, zonaId: event.target.value })}
            className={INPUT_CLASE}
          >
            <option value="" disabled>
              {cargandoCatalogos ? "Cargando..." : "Selecciona una zona"}
            </option>
            {zonas.map((zona) => (
              <option key={zona.id} value={zona.id}>
                {zona.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={LABEL_CLASE}>Tipo de servicio</label>
          <select
            required
            disabled={cargandoCatalogos}
            value={form.tipoServicioId}
            onChange={(event) => setForm({ ...form, tipoServicioId: event.target.value })}
            className={INPUT_CLASE}
          >
            <option value="" disabled>
              {cargandoCatalogos ? "Cargando..." : "Selecciona un tipo"}
            </option>
            {tiposServicio.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={LABEL_CLASE}>Monto base mensual (S/)</label>
          <input
            required
            type="number"
            min={0}
            step="0.1"
            value={form.montoBase}
            onChange={(event) => setForm({ ...form, montoBase: event.target.value })}
            className={INPUT_CLASE}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={LABEL_CLASE}>Día de facturación propio (opcional)</label>
          <input
            type="number"
            min={1}
            max={28}
            value={form.fechaFacturacionOverride}
            onChange={(event) => setForm({ ...form, fechaFacturacionOverride: event.target.value })}
            className={INPUT_CLASE}
          />
        </div>

        {error && <p className="col-span-2 text-sm text-error">{error}</p>}

        <div className="col-span-2 flex gap-3">
          <button
            type="submit"
            disabled={guardando || cargandoCatalogos}
            className="rounded-[9px] bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {guardando ? "Creando..." : "Crear cliente"}
          </button>
          <button type="button" onClick={cerrar} className="text-sm text-ink-weak underline">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  ) : null;

  return { abrir, modal };
}
