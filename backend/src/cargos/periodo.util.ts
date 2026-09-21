const MESES_ABREV = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];
const MESES_LARGO = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Setiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function formatearPeriodoLargo(anio: number, mes: number): string {
  return `${MESES_LARGO[mes - 1]} ${anio}`;
}

export function formatearPeriodoCorto(anio: number, mes: number): string {
  return MESES_ABREV[mes - 1];
}

/** Colapsa una lista de periodos (ordenada) en rangos consecutivos: "Jun-Set", "Ene, Mar" */
export function agruparPeriodosConsecutivos(periodos: { anio: number; mes: number }[]): string {
  if (periodos.length === 0) return "";

  const ordenados = [...periodos].sort((a, b) => a.anio * 12 + a.mes - (b.anio * 12 + b.mes));
  const grupos: { inicio: (typeof ordenados)[number]; fin: (typeof ordenados)[number] }[] = [];

  for (const periodo of ordenados) {
    const ultimo = grupos[grupos.length - 1];
    const indice = periodo.anio * 12 + periodo.mes;
    const indiceFin = ultimo ? ultimo.fin.anio * 12 + ultimo.fin.mes : null;

    if (ultimo && indice === indiceFin! + 1) {
      ultimo.fin = periodo;
    } else {
      grupos.push({ inicio: periodo, fin: periodo });
    }
  }

  return grupos
    .map(({ inicio, fin }) =>
      inicio === fin
        ? formatearPeriodoCorto(inicio.anio, inicio.mes)
        : `${formatearPeriodoCorto(inicio.anio, inicio.mes)}-${formatearPeriodoCorto(fin.anio, fin.mes)}`,
    )
    .join(", ");
}
