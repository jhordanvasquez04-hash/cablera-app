import ExcelJS from "exceljs";

interface ResumenParaExcel {
  desde: Date;
  hasta: Date;
  porMetodo: Array<{ metodo: string; monto: number; cantidadCobros: number }>;
  ingresosTotal: number;
  egresosTotal: number;
  neto: number;
}

interface MovimientoParaExcel {
  fecha: Date;
  tipo: string;
  monto: number;
  metodoPago: string;
  categoria: string | null;
  descripcion: string | null;
}

/** Construye el Excel de un periodo de Caja: una hoja de resumen y una de detalle de movimientos
 * (egresos + ingresos manuales, la misma lista que ya ve el gestor en pantalla). */
export async function construirWorkbookCaja(resumen: ResumenParaExcel, movimientos: MovimientoParaExcel[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Cablera";
  workbook.created = new Date();

  const hojaResumen = workbook.addWorksheet("Resumen");
  hojaResumen.columns = [
    { header: "Concepto", key: "concepto", width: 26 },
    { header: "Valor", key: "valor", width: 18 },
  ];
  hojaResumen.getRow(1).font = { bold: true };
  hojaResumen.addRow({ concepto: "Periodo desde", valor: resumen.desde.toISOString().slice(0, 10) });
  hojaResumen.addRow({ concepto: "Periodo hasta", valor: resumen.hasta.toISOString().slice(0, 10) });
  hojaResumen.addRow({ concepto: "Ingresos totales", valor: resumen.ingresosTotal });
  hojaResumen.addRow({ concepto: "Egresos totales", valor: resumen.egresosTotal });
  hojaResumen.addRow({ concepto: "Neto del periodo", valor: resumen.neto });
  hojaResumen.addRow({});
  hojaResumen.addRow({ concepto: "Cobrado por método", valor: "" }).font = { bold: true };
  for (const item of resumen.porMetodo) {
    hojaResumen.addRow({ concepto: item.metodo, valor: item.monto });
  }

  const hojaMovimientos = workbook.addWorksheet("Movimientos");
  hojaMovimientos.columns = [
    { header: "Fecha", key: "fecha", width: 14 },
    { header: "Tipo", key: "tipo", width: 10 },
    { header: "Categoría", key: "categoria", width: 20 },
    { header: "Descripción", key: "descripcion", width: 32 },
    { header: "Método", key: "metodoPago", width: 14 },
    { header: "Monto", key: "monto", width: 12 },
  ];
  hojaMovimientos.getRow(1).font = { bold: true };
  for (const movimiento of movimientos) {
    hojaMovimientos.addRow({
      fecha: movimiento.fecha.toISOString().slice(0, 10),
      tipo: movimiento.tipo,
      categoria: movimiento.categoria,
      descripcion: movimiento.descripcion,
      metodoPago: movimiento.metodoPago,
      monto: movimiento.monto,
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
