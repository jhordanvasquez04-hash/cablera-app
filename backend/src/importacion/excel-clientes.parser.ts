import { BadRequestException } from "@nestjs/common";
import type { Worksheet } from "exceljs";
import ExcelJS from "exceljs";

const COLUMNA_ZONA = 1;
const COLUMNA_NOMBRES = 3;
const COLUMNA_APELLIDOS = 4;
const COLUMNA_DNI = 5;
const COLUMNA_CELULAR = 6;
const COLUMNA_PAGO = 7;
const COLUMNA_PRIMER_MES = 8; // ENERO
const MESES_EN_FILA = 12;

const PATRON_ZONA = /CASERIO\s+(.+)$/i;

export interface FilaClienteImportado {
  nombreCompleto: string;
  dni: string | null;
  telefono: string | null;
  montoBase: number;
  /** índice 0 = enero ... índice 11 = diciembre. Valor = código histórico si el mes está pagado, null si no. */
  pagosPorMes: (string | null)[];
}

export interface GrupoZonaImportado {
  nombreZona: string;
  clientes: FilaClienteImportado[];
}

function valorCelda(worksheet: Worksheet, fila: number, columna: number): string | number | null {
  const valor = worksheet.getCell(fila, columna).value;
  if (valor === null || valor === undefined) {
    return null;
  }
  if (typeof valor === "object") {
    if ("result" in valor) {
      return (valor.result as string | number | null) ?? null;
    }
    if ("richText" in valor) {
      return (valor.richText as { text: string }[]).map((parte) => parte.text).join("");
    }
    if ("text" in valor) {
      return (valor as { text: string }).text;
    }
    return null;
  }
  return valor as string | number;
}

function textoCelda(worksheet: Worksheet, fila: number, columna: number): string | null {
  const valor = valorCelda(worksheet, fila, columna);
  if (valor === null) return null;
  const texto = String(valor).trim();
  return texto.length > 0 ? texto : null;
}

function numeroCelda(worksheet: Worksheet, fila: number, columna: number): number | null {
  const valor = valorCelda(worksheet, fila, columna);
  if (valor === null) return null;
  const numero = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

export async function parsearExcelClientes(buffer: Buffer): Promise<GrupoZonaImportado[]> {
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

  const grupos: GrupoZonaImportado[] = [];
  let grupoActual: GrupoZonaImportado | null = null;

  for (let fila = 2; fila <= worksheet.rowCount; fila++) {
    const encabezadoZona = textoCelda(worksheet, fila, COLUMNA_ZONA);
    if (encabezadoZona) {
      const coincidencia = encabezadoZona.match(PATRON_ZONA);
      const nombreZona = (coincidencia ? coincidencia[1] : encabezadoZona).trim();
      grupoActual = { nombreZona, clientes: [] };
      grupos.push(grupoActual);
    }

    const nombres = textoCelda(worksheet, fila, COLUMNA_NOMBRES);
    if (!nombres || !grupoActual) {
      continue;
    }

    const apellidos = textoCelda(worksheet, fila, COLUMNA_APELLIDOS) ?? "";
    const nombreCompleto = `${nombres} ${apellidos}`.replace(/\s+/g, " ").trim();

    const dniNumero = numeroCelda(worksheet, fila, COLUMNA_DNI);
    const dni = dniNumero !== null ? String(dniNumero) : textoCelda(worksheet, fila, COLUMNA_DNI);

    const celularNumero = numeroCelda(worksheet, fila, COLUMNA_CELULAR);
    const telefono = celularNumero !== null ? String(celularNumero) : textoCelda(worksheet, fila, COLUMNA_CELULAR);

    const montoBase = numeroCelda(worksheet, fila, COLUMNA_PAGO) ?? 0;

    const pagosPorMes: (string | null)[] = [];
    for (let i = 0; i < MESES_EN_FILA; i++) {
      pagosPorMes.push(textoCelda(worksheet, fila, COLUMNA_PRIMER_MES + i));
    }

    grupoActual.clientes.push({ nombreCompleto, dni, telefono, montoBase, pagosPorMes });
  }

  return grupos;
}
