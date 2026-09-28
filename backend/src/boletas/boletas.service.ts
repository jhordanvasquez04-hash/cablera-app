import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { MetodoPago, Prisma } from "@prisma/client";
import PDFDocument from "pdfkit";
import type { Response } from "express";
import { TenantPrismaService, type ScopedPrismaClient } from "../prisma/tenant-prisma.service";
import { CargosService } from "../cargos/cargos.service";
import { formatearPeriodoCorto } from "../cargos/periodo.util";
import { numeroALetras } from "../common/numero-a-letras.util";
import type { RegistrarPagoDto } from "./dto/registrar-pago.dto";
import type { AnularBoletaDto } from "./dto/anular-boleta.dto";

type Tx = Prisma.TransactionClient;

export function formatearFolio(numero: number): string {
  return `001-${String(numero).padStart(4, "0")}`;
}

const METODO_LABEL: Record<MetodoPago, string> = {
  efectivo: "Efectivo",
  yape: "Yape",
  plin: "Plin",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
};

const NOMBRES_MES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function fmtFechaCorta(f: Date): string {
  return new Date(f).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Primer y último día de un mes calendario (anio, mes 1-based), formateados dd/mm/aaaa. */
function rangoPeriodo(anio: number, mes: number): { inicio: string; fin: string } {
  const inicio = new Date(anio, mes - 1, 1);
  const fin = new Date(anio, mes, 0);
  return { inicio: fmtFechaCorta(inicio), fin: fmtFechaCorta(fin) };
}

@Injectable()
export class BoletasService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private cargosService: CargosService,
  ) {}

  private get prisma(): ScopedPrismaClient {
    return this.tenantPrisma.client;
  }

  private async registrarPagoInterno(
    tx: Tx,
    datos: { clienteId: string; cargoIds: string[]; montoPagado: number; metodoPago: MetodoPago },
    usuarioId: string,
    empresaId: string,
    reemplazaAId?: string,
  ) {
    const cargosDisponibles = await this.cargosService.listarPendientesPorCliente(datos.clienteId, empresaId, tx);
    const cargosSeleccionados = cargosDisponibles.filter((cargo) => datos.cargoIds.includes(cargo.id));

    if (cargosSeleccionados.length !== datos.cargoIds.length) {
      throw new BadRequestException("Alguno de los cargos seleccionados no existe o ya está pagado");
    }

    const saldoTotal = cargosSeleccionados.reduce((suma, cargo) => suma + cargo.saldo, 0);
    if (datos.montoPagado > saldoTotal + 0.01) {
      throw new BadRequestException("El monto pagado no puede superar la deuda seleccionada");
    }

    let restante = datos.montoPagado;
    const aplicaciones: { cargoId: string; monto: number }[] = [];

    for (const cargo of cargosSeleccionados) {
      if (restante <= 0) break;
      const aplicar = Math.min(restante, cargo.saldo);
      if (aplicar > 0) {
        aplicaciones.push({ cargoId: cargo.id, monto: Number(aplicar.toFixed(2)) });
        restante = Number((restante - aplicar).toFixed(2));
      }
    }

    // El número ya no es autoincrement (una secuencia de Postgres es global, no se puede
    // particionar por tenant): se incrementa transaccionalmente sobre
    // Empresa.correlativoBoletaActual, igual que Cliente.numeroContrato.
    const empresaActualizada = await tx.empresa.update({
      where: { id: empresaId },
      data: { correlativoBoletaActual: { increment: 1 } },
    });

    const boleta = await tx.boleta.create({
      data: {
        numero: empresaActualizada.correlativoBoletaActual,
        clienteId: datos.clienteId,
        metodoPago: datos.metodoPago,
        montoTotal: datos.montoPagado,
        registradoPorId: usuarioId,
        reemplazaAId,
        empresaId,
        pagos: {
          create: aplicaciones.map((aplicacion) => ({
            cargoId: aplicacion.cargoId,
            montoAplicado: aplicacion.monto,
            empresaId,
          })),
        },
      },
      include: { pagos: true },
    });

    for (const aplicacion of aplicaciones) {
      await this.cargosService.recalcularEstado(aplicacion.cargoId, empresaId, tx);
    }

    return boleta;
  }

  async registrarPago(dto: RegistrarPagoDto, usuarioId: string, empresaId: string) {
    // El cast es necesario porque $transaction() sobre un cliente extendido con $extends()
    // devuelve un tipo estructuralmente distinto a Prisma.TransactionClient, aunque en runtime
    // conserva la misma extensión de aislamiento por tenant (verificado en verificar-aislamiento.ts).
    return this.prisma.$transaction((tx) => this.registrarPagoInterno(tx as unknown as Tx, dto, usuarioId, empresaId));
  }

  async listar(filtros: { busqueda?: string; clienteId?: string } = {}) {
    const boletas = await this.prisma.boleta.findMany({
      where: {
        clienteId: filtros.clienteId || undefined,
        ...(filtros.busqueda
          ? { cliente: { nombreCompleto: { contains: filtros.busqueda, mode: "insensitive" } } }
          : {}),
      },
      include: { cliente: { include: { zona: true } }, pagos: { include: { cargo: { include: { servicioContratado: { include: { tipoServicio: true } } } } } } },
      orderBy: { numero: "desc" },
      take: 100,
    });

    return boletas.map((boleta) => this.formatearResumen(boleta));
  }

  async obtener(id: string) {
    const boleta = await this.prisma.boleta.findUnique({
      where: { id },
      include: {
        cliente: { include: { zona: true } },
        registradoPor: true,
        pagos: { include: { cargo: { include: { servicioContratado: { include: { tipoServicio: true } } } } } },
      },
    });

    if (!boleta) {
      throw new NotFoundException("Boleta no encontrada");
    }

    return this.formatearDetalle(boleta);
  }

  // Devuelve el detalle formateado (this.obtener) en vez del row crudo de la transacción: la app
  // Android deserializa la respuesta como el mismo BoletaDetalleDto que usan las demás vistas.
  async anular(id: string, dto: AnularBoletaDto, usuarioId: string, empresaId: string) {
    const idAMostrar = await this.prisma.$transaction(async (txExt) => {
      const tx = txExt as unknown as Tx;
      const boleta = await tx.boleta.findFirst({ where: { id, empresaId }, include: { pagos: true } });
      if (!boleta) {
        throw new NotFoundException("Boleta no encontrada");
      }
      if (boleta.estado === "anulada") {
        throw new BadRequestException("La boleta ya está anulada");
      }

      await tx.boleta.update({ where: { id }, data: { estado: "anulada" } });

      for (const pago of boleta.pagos) {
        await this.cargosService.recalcularEstado(pago.cargoId, empresaId, tx);
      }

      if (dto.cargoIds && dto.montoPagado && dto.metodoPago) {
        const nueva = await this.registrarPagoInterno(
          tx,
          { clienteId: boleta.clienteId, cargoIds: dto.cargoIds, montoPagado: dto.montoPagado, metodoPago: dto.metodoPago },
          usuarioId,
          empresaId,
          boleta.id,
        );
        return nueva.id;
      }

      return id;
    });

    return this.obtener(idAMostrar);
  }

  private concepto(pagos: { cargo: { anio: number; mes: number; montoCorrespondiente: number }; montoAplicado: number }[]) {
    return pagos
      .map(
        (pago) =>
          `${formatearPeriodoCorto(pago.cargo.anio, pago.cargo.mes)} ${pago.cargo.anio}${
            pago.montoAplicado < pago.cargo.montoCorrespondiente ? " (saldo)" : ""
          }`,
      )
      .join(", ");
  }

  private formatearResumen(boleta: any) {
    return {
      id: boleta.id,
      folio: formatearFolio(boleta.numero),
      fecha: boleta.fecha,
      cliente: { id: boleta.cliente.id, nombreCompleto: boleta.cliente.nombreCompleto, zona: boleta.cliente.zona.nombre },
      concepto: this.concepto(boleta.pagos),
      metodoPago: boleta.metodoPago,
      montoTotal: boleta.montoTotal,
      estado: boleta.estado,
    };
  }

  private formatearDetalle(boleta: any) {
    return {
      ...this.formatearResumen(boleta),
      dni: boleta.cliente.dni,
      registradoPor: boleta.registradoPor?.nombre ?? null,
      lineas: boleta.pagos.map((pago: any) => ({
        periodo: `${formatearPeriodoCorto(pago.cargo.anio, pago.cargo.mes)} ${pago.cargo.anio}`,
        servicio: pago.cargo.servicioContratado.tipoServicio.nombre,
        montoAplicado: pago.montoAplicado,
        esSaldo: pago.montoAplicado < pago.cargo.montoCorrespondiente,
      })),
    };
  }

  // ───────────────────────────────────────────────────────────────────────
  // Fusión con Keysls: comprobante de pago en PDF (ticket A5) — mismo diseño que
  // pagos.controller.js#comprobante del backend de Keysls, adaptado a los datos de cablera
  // (folio propio de Boleta.numero en vez de un correlativo global + id, sin logo porque
  // Empresa no tiene ese campo acá).
  // ───────────────────────────────────────────────────────────────────────
  async generarComprobantePdf(id: string, empresaId: string, res: Response) {
    const boleta = await this.prisma.boleta.findFirst({
      where: { id, empresaId },
      include: {
        cliente: true,
        pagos: {
          include: { cargo: { include: { servicioContratado: { include: { tipoServicio: true, contrato: true } } } } },
        },
      },
    });
    if (!boleta) {
      throw new NotFoundException("Boleta no encontrada");
    }

    const empresa = await this.prisma.empresa.findUnique({ where: { id: empresaId } });

    // Igual que en Keysls: para un cargo que quedó PARCIAL hay que sumar TODOS sus pagos
    // (no solo el de esta boleta) para mostrar cuánto queda pendiente de ese mes.
    const cargosParciales = boleta.pagos.filter((p) => p.cargo.estado === "parcial").map((p) => p.cargoId);
    const saldosPorCargo = new Map<string, number>();
    if (cargosParciales.length > 0) {
      const sumas = await this.prisma.pago.groupBy({
        by: ["cargoId"],
        where: { cargoId: { in: cargosParciales } },
        _sum: { montoAplicado: true },
      });
      for (const s of sumas) saldosPorCargo.set(s.cargoId, s._sum.montoAplicado ?? 0);
    }

    const primerPago = boleta.pagos[0];
    const servicio = primerPago?.cargo.servicioContratado;
    const contrato = servicio?.contrato;
    const monto = boleta.montoTotal;
    const numeroComprobante = formatearFolio(boleta.numero);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="comprobante_${boleta.id.slice(0, 8)}.pdf"`);

    const doc = new PDFDocument({ size: "A5", margin: 32 });
    doc.pipe(res);

    const anchoUtil = doc.page.width - 64;
    const bordeX = 22;
    const bordeY = 22;
    const linea = () => {
      doc.strokeColor("#000").lineWidth(0.5).moveTo(32, doc.y).lineTo(doc.page.width - 32, doc.y).stroke();
      doc.moveDown(0.5);
    };

    // ── Encabezado ──
    doc.fontSize(15).font("Helvetica-Bold").fillColor("#000").text(empresa?.nombre || "Mi Empresa", { align: "center" });
    if (empresa?.ruc) doc.fontSize(11).font("Helvetica-Bold").text(empresa.ruc, { align: "center" });
    doc.moveDown(0.5);

    if (empresa?.agencia) doc.fontSize(9).font("Helvetica-Bold").text(empresa.agencia, { align: "center" });
    if (empresa?.direccion) doc.fontSize(8.5).font("Helvetica").text(empresa.direccion, { align: "center" });
    if (empresa?.telefono) doc.fontSize(8.5).font("Helvetica").text(empresa.telefono, { align: "center" });
    doc.moveDown(0.6);

    doc.fontSize(12).font("Helvetica-Bold").text("RECIBO", { align: "center" });
    doc.fontSize(11).font("Helvetica-Bold").text(numeroComprobante, { align: "center" });
    doc.moveDown(0.6);
    linea();

    // ── Datos del pago ──
    doc.fontSize(9).font("Helvetica");
    const fechaObj = new Date(boleta.fecha);
    doc.font("Helvetica-Bold").text("Fecha: ", { continued: true }).font("Helvetica").text(fmtFechaCorta(fechaObj), { continued: true, width: anchoUtil / 2 });
    doc
      .font("Helvetica-Bold")
      .text("  Hora: ", { continued: true })
      .font("Helvetica")
      .text(fechaObj.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    doc.moveDown(0.4);

    doc.font("Helvetica-Bold").text("Cliente: ", { continued: true }).font("Helvetica").text(boleta.cliente.nombreCompleto);
    doc.font("Helvetica-Bold").text("Dni/Ruc: ", { continued: true }).font("Helvetica").text(boleta.cliente.dni || "—");
    doc.font("Helvetica-Bold").text("Dirección: ", { continued: true }).font("Helvetica").text(contrato?.direccion || boleta.cliente.direccion || "—");
    doc.moveDown(0.4);

    doc.font("Helvetica-Bold").text("Forma: ", { continued: true }).font("Helvetica").text(METODO_LABEL[boleta.metodoPago]);
    doc.moveDown(0.6);
    linea();

    // ── Tabla de conceptos ──
    doc.font("Helvetica-Bold").fontSize(9);
    const colDescX = 32;
    const colImpX = doc.page.width - 32 - 60;
    doc.text("Descripción", colDescX, doc.y, { continued: false });
    doc.text("Importe", colImpX, doc.y - doc.currentLineHeight(), { width: 60, align: "right" });
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(9);

    for (const pago of boleta.pagos) {
      const nombreServicio = pago.cargo.servicioContratado.tipoServicio.nombre;
      const { inicio, fin } = rangoPeriodo(pago.cargo.anio, pago.cargo.mes);
      const desc = `Mensualidad ${NOMBRES_MES[pago.cargo.mes - 1].toUpperCase()}, del ${inicio} Al ${fin} (${nombreServicio})`;
      const yInicio = doc.y;
      doc.text(desc, colDescX, yInicio, { width: colImpX - colDescX - 8 });
      const yTrasDesc = doc.y;
      doc.text(pago.montoAplicado.toFixed(2), colImpX, yInicio, { width: 60, align: "right" });
      doc.y = Math.max(yTrasDesc, yInicio + doc.currentLineHeight());

      if (pago.cargo.estado === "parcial") {
        const saldoPendiente = pago.cargo.montoCorrespondiente - (saldosPorCargo.get(pago.cargoId) ?? 0);
        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor("#B45309")
          .text(`Pago parcial — saldo pendiente de este mes: S/ ${saldoPendiente.toFixed(2)}`, colDescX, doc.y, { width: anchoUtil });
        doc.fillColor("#000").fontSize(9);
      }
      doc.moveDown(0.2);
    }

    doc.moveDown(0.4);
    linea();

    // ── Totales ──
    doc.font("Helvetica-Bold").fontSize(9).text(`Son: ${numeroALetras(monto)}`, 32, doc.y, { width: anchoUtil });
    doc.moveDown(0.4);
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("Total:", colDescX, doc.y, { continued: true, width: colImpX - colDescX - 8 })
      .text(monto.toFixed(2), { align: "right" });

    doc.moveDown(1);
    doc.font("Helvetica").fontSize(10).text("Gracias por su preferencia!", { align: "center" });

    // ── Borde del ticket ──
    const yFinBox = doc.y + 10;
    doc.rect(bordeX, bordeY, doc.page.width - bordeX * 2, yFinBox - bordeY).lineWidth(1).strokeColor("#000").stroke();

    doc.end();
  }
}
