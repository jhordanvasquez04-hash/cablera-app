import { BadRequestException } from "@nestjs/common";
import type { Worksheet } from "exceljs";
import ExcelJS from "exceljs";

export interface FilaClienteSimpleImportado {
  numeroFila: number;
  nombreCompleto: string | null;
  dni: string | null;
  telefono: string | null;
  direccion: string | null;
  zona: string | null;
  tipoServicio: string | null;
  montoBase: number | null;
  fechaAlta: Date | null;
}

// Encabezados posibles por columna (normalizados: minúsculas, sin tildes). Así el usuario
// puede reordenar/renombrar levemente las columnas de la plantilla sin que falle el parseo.
const ALIAS_ENCABEZADOS: Record<keyof Omit<FilaClienteSimpleImportado, "numeroFila">, string[]> = {
  nombreCompleto: ["nombre completo", "nombre y apellido", "nombre"],
  dni: ["dni"],
  telefono: ["telefono", "celular"],
  direccion: ["direccion"],
  zona: ["zona", "caserio"],
  tipoServicio: ["tipo de servicio", "tiposervicio", "servicio"],
  montoBase: ["monto base", "monto", "tarifa"],
  fechaAlta: ["fecha de alta", "fechaalta", "fecha"],
};

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

function valorCelda(worksheet: Worksheet, fila: number, columna: number): unknown {
  const valor = worksheet.getCell(fila, columna).value;
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "object" && !(valor instanceof Date)) {
    if ("result" in valor) return (valor as { result: unknown }).result ?? null;
    if ("richText" in valor) return (valor as { richText: { text: string }[] }).richText.map((p) => p.text).join("");
    if ("text" in valor) return (valor as { text: string }).text;
    return null;
  }
  return valor;
}

function textoCelda(worksheet: Worksheet, fila: number, columna: number): string | null {
  const valor = valorCelda(worksheet, fila, columna);
  if (valor === null) return null;
  if (valor instanceof Date) return null;
  const texto = String(valor).trim();
  return texto.length > 0 ? texto : null;
}

function numeroCelda(worksheet: Worksheet, fila: number, columna: number): number | null {
  const valor = valorCelda(worksheet, fila, columna);
  if (valor === null || valor instanceof Date) return null;
  const numero = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function fechaCelda(worksheet: Worksheet, fila: number, columna: number): Date | null {
  const valor = valorCelda(worksheet, fila, columna);
  if (valor === null) return null;
  if (valor instanceof Date) return valor;
  const fecha = new Date(String(valor));
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/** Mapea cada campo esperado a la columna donde aparece su encabezado en la fila 1. */
function mapearColumnas(worksheet: Worksheet): Partial<Record<keyof typeof ALIAS_ENCABEZADOS, number>> {
  const mapa: Partial<Record<keyof typeof ALIAS_ENCABEZADOS, number>> = {};
  const totalColumnas = worksheet.columnCount || worksheet.getRow(1).cellCount;

  for (let columna = 1; columna <= totalColumnas; columna++) {
    const encabezado = textoCelda(worksheet, 1, columna);
    if (!encabezado) continue;
    const normalizado = normalizar(encabezado);

    for (const [campo, alias] of Object.entries(ALIAS_ENCABEZADOS) as [
      keyof typeof ALIAS_ENCABEZADOS,
      string[],
    ][]) {
      if (mapa[campo] === undefined && alias.includes(normalizado)) {
        mapa[campo] = columna;
      }
    }
  }

  return mapa;
}

export async function parsearExcelClientesSimple(buffer: Buffer): Promise<FilaClienteSimpleImportado[]> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  } catch {
    throw new BadRequestException("El archivo no es un Excel válido (.xlsx). Descarga la plantilla y vuelve a intentarlo.");
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("El archivo no tiene ninguna hoja");
  }

  const columnas = mapearColumnas(worksheet);
  if (!columnas.nombreCompleto || !columnas.zona || !columnas.tipoServicio || !columnas.montoBase) {
    throw new Error(
      'El archivo debe tener, al menos, las columnas "Nombre completo", "Zona", "Tipo de servicio" y "Monto base" en la primera fila.',
    );
  }

  const filas: FilaClienteSimpleImportado[] = [];
  for (let fila = 2; fila <= worksheet.rowCount; fila++) {
    const nombreCompleto = textoCelda(worksheet, fila, columnas.nombreCompleto);
    // Fila totalmente vacía: se omite en silencio (no es un error del usuario).
    if (!nombreCompleto && worksheet.getRow(fila).cellCount === 0) continue;

    filas.push({
      numeroFila: fila,
      nombreCompleto,
      dni: columnas.dni ? textoCelda(worksheet, fila, columnas.dni) : null,
      telefono: columnas.telefono ? textoCelda(worksheet, fila, columnas.telefono) : null,
      direccion: columnas.direccion ? textoCelda(worksheet, fila, columnas.direccion) : null,
      zona: textoCelda(worksheet, fila, columnas.zona),
      tipoServicio: textoCelda(worksheet, fila, columnas.tipoServicio),
      montoBase: numeroCelda(worksheet, fila, columnas.montoBase),
      fechaAlta: columnas.fechaAlta ? fechaCelda(worksheet, fila, columnas.fechaAlta) : null,
    });
  }

  return filas;
}

/** Plantilla descargable: encabezados + una fila de ejemplo, para que el gestor de una
 * empresa nueva sepa exactamente qué columnas llenar antes de importar su lista de clientes. */
export async function generarPlantillaClientesExcel(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const hoja = workbook.addWorksheet("Clientes");
  hoja.columns = [
    { header: "Nombre completo", key: "nombreCompleto", width: 30 },
    { header: "DNI", key: "dni", width: 12 },
    { header: "Telefono", key: "telefono", width: 14 },
    { header: "Direccion", key: "direccion", width: 28 },
    { header: "Zona", key: "zona", width: 18 },
    { header: "Tipo de servicio", key: "tipoServicio", width: 16 },
    { header: "Monto base", key: "montoBase", width: 12 },
    { header: "Fecha de alta", key: "fechaAlta", width: 14 },
  ];
  hoja.getRow(1).font = { bold: true };
  hoja.addRow({
    nombreCompleto: "Juan Pérez García",
    dni: "12345678",
    telefono: "999999999",
    direccion: "Jr. Las Flores 123",
    zona: "Centro",
    tipoServicio: "cable",
    montoBase: 25,
    fechaAlta: new Date(),
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
