// Perú no usa horario de verano: el offset es siempre UTC-5, todo el año.
const LIMA_OFFSET_HOURS = 5;

/** Año/mes/día de [fecha] en hora de Lima, no en la del proceso de Node — así un corte de "hoy" (a
 * qué clientes tocar facturar, qué mes es "el actual") no cambia si esto corre en otro huso horario. */
export function diaEnLima(fecha: Date): { anio: number; mes: number; dia: number } {
  const limaShifted = new Date(fecha.getTime() - LIMA_OFFSET_HOURS * 60 * 60 * 1000);
  return {
    anio: limaShifted.getUTCFullYear(),
    mes: limaShifted.getUTCMonth() + 1,
    dia: limaShifted.getUTCDate(),
  };
}
