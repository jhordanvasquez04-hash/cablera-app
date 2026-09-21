// Perú no usa horario de verano: el offset es siempre UTC-5, todo el año. Estos helpers evitan
// depender del huso horario del navegador/servidor para mostrar y calcular fechas de negocio,
// igual que el backend (ver backend/src/caja/movimientos-caja.service.ts) y la app Android.
const ZONA_PERU = "America/Lima";
const LIMA_OFFSET_HOURS = 5;

/** Fecha corta (sin hora) de un instante real (boleta, movimiento de caja...), en hora de Lima. */
export function formatFechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PE", { timeZone: ZONA_PERU, day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Fecha y hora exactas de un instante real, en hora de Lima. */
export function formatFechaHora(iso: string): string {
  const fecha = new Date(iso);
  const fechaStr = fecha.toLocaleDateString("es-PE", { timeZone: ZONA_PERU, day: "2-digit", month: "2-digit", year: "numeric" });
  const horaStr = fecha.toLocaleTimeString("es-PE", { timeZone: ZONA_PERU, hour: "2-digit", minute: "2-digit", hour12: false });
  return `${fechaStr} ${horaStr}`;
}

/** Instante UTC de la medianoche de Lima para el año/mes(0-indexado)/día dados. */
function limaMidnightUtc(anio: number, mesIndex0: number, dia: number): Date {
  return new Date(Date.UTC(anio, mesIndex0, dia, LIMA_OFFSET_HOURS, 0, 0, 0));
}

/** Rango [desde, hasta] del mes dado, calculado en hora de Lima (00:00 del día 1 al último
 * instante del mes), para que "separado por meses" no dependa del huso de quien lo consulte. */
export function rangoDelMes(anio: number, mesIndex0: number): { desde: string; hasta: string } {
  const desde = limaMidnightUtc(anio, mesIndex0, 1);
  const hasta = new Date(limaMidnightUtc(anio, mesIndex0 + 1, 1).getTime() - 1);
  return { desde: desde.toISOString(), hasta: hasta.toISOString() };
}

/** Año y mes (0-indexado) de "hoy" en hora de Lima, sin depender del huso del navegador. */
export function mesActualLima(): { anio: number; mesIndex0: number } {
  const limaShifted = new Date(Date.now() - LIMA_OFFSET_HOURS * 60 * 60 * 1000);
  return { anio: limaShifted.getUTCFullYear(), mesIndex0: limaShifted.getUTCMonth() };
}

/** Convierte una fecha "YYYY-MM-DD" (de un <input type="date">) al instante de su medianoche en
 * Lima. Sin esto, `new Date("2026-09-01").toISOString()` interpreta la fecha como medianoche UTC,
 * que ya es 31/08 a las 7pm en Lima — un egreso "de hoy" podía quedar filed en el mes anterior. */
export function fechaLocalAInstanteLima(fechaYYYYMMDD: string): string {
  return new Date(`${fechaYYYYMMDD}T00:00:00-05:00`).toISOString();
}
