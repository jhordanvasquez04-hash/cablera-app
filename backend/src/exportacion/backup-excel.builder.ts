import ExcelJS from "exceljs";

function agregarHoja(workbook: ExcelJS.Workbook, nombre: string, columnas: Partial<ExcelJS.Column>[]) {
  const hoja = workbook.addWorksheet(nombre);
  hoja.columns = columnas;
  hoja.getRow(1).font = { bold: true };
  return hoja;
}

function hojaClientes(workbook: ExcelJS.Workbook, clientes: Array<Record<string, any>>) {
  const hoja = agregarHoja(workbook, "Clientes", [
    { header: "N° Contrato", key: "numeroContrato", width: 14 },
    { header: "DNI", key: "dni", width: 12 },
    { header: "Nombre completo", key: "nombreCompleto", width: 30 },
    { header: "Teléfono", key: "telefono", width: 14 },
    { header: "Dirección", key: "direccion", width: 28 },
    { header: "Zona", key: "zona", width: 18 },
    { header: "Estado", key: "estadoServicio", width: 12 },
    { header: "Servicios contratados", key: "servicios", width: 32 },
    { header: "Fecha de alta", key: "fechaAlta", width: 14 },
    { header: "Fecha de baja", key: "fechaBaja", width: 14 },
    { header: "Motivo de baja", key: "motivoBaja", width: 24 },
  ]);
  for (const cliente of clientes) {
    hoja.addRow({
      numeroContrato: cliente.numeroContrato,
      dni: cliente.dni,
      nombreCompleto: cliente.nombreCompleto,
      telefono: cliente.telefono,
      direccion: cliente.direccion,
      zona: cliente.zona.nombre,
      estadoServicio: cliente.estadoServicio,
      servicios: cliente.serviciosContratados
        .map((servicio: any) => `${servicio.tipoServicio.nombre} (S/ ${servicio.montoBase.toFixed(2)}, ${servicio.estado})`)
        .join(", "),
      fechaAlta: cliente.fechaAlta.toISOString().slice(0, 10),
      fechaBaja: cliente.fechaBaja ? cliente.fechaBaja.toISOString().slice(0, 10) : null,
      motivoBaja: cliente.motivoBaja,
    });
  }
}

function hojaServiciosContratados(workbook: ExcelJS.Workbook, clientes: Array<Record<string, any>>) {
  const hoja = agregarHoja(workbook, "Servicios contratados", [
    { header: "N° Contrato", key: "numeroContrato", width: 14 },
    { header: "Cliente", key: "cliente", width: 30 },
    { header: "Tipo de servicio", key: "tipoServicio", width: 16 },
    { header: "Monto base", key: "montoBase", width: 12 },
    { header: "Estado", key: "estado", width: 12 },
    { header: "Fecha de alta", key: "fechaAlta", width: 14 },
    { header: "Fecha de baja", key: "fechaBaja", width: 14 },
  ]);
  for (const cliente of clientes) {
    for (const servicio of cliente.serviciosContratados) {
      hoja.addRow({
        numeroContrato: cliente.numeroContrato,
        cliente: cliente.nombreCompleto,
        tipoServicio: servicio.tipoServicio.nombre,
        montoBase: servicio.montoBase,
        estado: servicio.estado,
        fechaAlta: servicio.fechaAlta.toISOString().slice(0, 10),
        fechaBaja: servicio.fechaBaja ? servicio.fechaBaja.toISOString().slice(0, 10) : null,
      });
    }
  }
}

function hojaCargos(workbook: ExcelJS.Workbook, cargos: Array<Record<string, any>>) {
  const hoja = agregarHoja(workbook, "Cargos mensuales", [
    { header: "N° Contrato", key: "numeroContrato", width: 14 },
    { header: "Cliente", key: "cliente", width: 30 },
    { header: "Servicio", key: "servicio", width: 16 },
    { header: "Año", key: "anio", width: 8 },
    { header: "Mes", key: "mes", width: 8 },
    { header: "Monto", key: "monto", width: 12 },
    { header: "Estado", key: "estado", width: 12 },
  ]);
  for (const cargo of cargos) {
    hoja.addRow({
      numeroContrato: cargo.cliente.numeroContrato,
      cliente: cargo.cliente.nombreCompleto,
      servicio: cargo.servicioContratado.tipoServicio.nombre,
      anio: cargo.anio,
      mes: cargo.mes,
      monto: cargo.montoCorrespondiente,
      estado: cargo.estado,
    });
  }
}

function hojaBoletas(workbook: ExcelJS.Workbook, boletas: Array<Record<string, any>>) {
  const hoja = agregarHoja(workbook, "Boletas", [
    { header: "Folio", key: "folio", width: 12 },
    { header: "Cliente", key: "cliente", width: 30 },
    { header: "Fecha", key: "fecha", width: 14 },
    { header: "Método de pago", key: "metodoPago", width: 16 },
    { header: "Monto total", key: "montoTotal", width: 12 },
    { header: "Estado", key: "estado", width: 12 },
    { header: "Registrado por", key: "registradoPor", width: 22 },
  ]);
  for (const boleta of boletas) {
    hoja.addRow({
      folio: `001-${String(boleta.numero).padStart(4, "0")}`,
      cliente: boleta.cliente.nombreCompleto,
      fecha: boleta.fecha.toISOString().slice(0, 10),
      metodoPago: boleta.metodoPago,
      montoTotal: boleta.montoTotal,
      estado: boleta.estado,
      registradoPor: boleta.registradoPor?.nombre ?? null,
    });
  }
}

function hojaMovimientosCaja(workbook: ExcelJS.Workbook, movimientos: Array<Record<string, any>>) {
  const hoja = agregarHoja(workbook, "Caja", [
    { header: "Fecha", key: "fecha", width: 14 },
    { header: "Tipo", key: "tipo", width: 10 },
    { header: "Monto", key: "monto", width: 12 },
    { header: "Método de pago", key: "metodoPago", width: 16 },
    { header: "Categoría", key: "categoria", width: 20 },
    { header: "Descripción", key: "descripcion", width: 30 },
  ]);
  for (const movimiento of movimientos) {
    hoja.addRow({
      fecha: movimiento.fecha.toISOString().slice(0, 10),
      tipo: movimiento.tipo,
      monto: movimiento.monto,
      metodoPago: movimiento.metodoPago,
      categoria: movimiento.categoria?.nombre ?? null,
      descripcion: movimiento.descripcion,
    });
  }
}

function hojaGastosReportados(workbook: ExcelJS.Workbook, gastos: Array<Record<string, any>>) {
  const hoja = agregarHoja(workbook, "Gastos reportados", [
    { header: "Fecha", key: "fecha", width: 14 },
    { header: "Reportado por", key: "usuario", width: 22 },
    { header: "Monto", key: "monto", width: 12 },
    { header: "Descripción", key: "descripcion", width: 30 },
    { header: "Estado", key: "estado", width: 12 },
  ]);
  for (const gasto of gastos) {
    hoja.addRow({
      fecha: gasto.fecha.toISOString().slice(0, 10),
      usuario: gasto.usuario.nombre,
      monto: gasto.monto,
      descripcion: gasto.descripcion,
      estado: gasto.estado,
    });
  }
}

export interface DatosBackupExcel {
  clientes: Array<Record<string, any>>;
  cargos: Array<Record<string, any>>;
  boletas: Array<Record<string, any>>;
  movimientosCaja: Array<Record<string, any>>;
  gastosReportados: Array<Record<string, any>>;
}

/** Construye el workbook de backup a partir de datos ya consultados (y ya filtrados por tenant
 * por quien los consultó) — no toca la base de datos, así lo reutilizan tanto el endpoint
 * bajo demanda (una empresa) como el cron diario (todas las empresas activas, una por una). */
export async function construirWorkbookBackup(datos: DatosBackupExcel): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Cablera";
  workbook.created = new Date();

  hojaClientes(workbook, datos.clientes);
  hojaServiciosContratados(workbook, datos.clientes);
  hojaCargos(workbook, datos.cargos);
  hojaBoletas(workbook, datos.boletas);
  hojaMovimientosCaja(workbook, datos.movimientosCaja);
  hojaGastosReportados(workbook, datos.gastosReportados);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
