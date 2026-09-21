import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { MetodoPago, Prisma } from "@prisma/client";
import { TenantPrismaService, type ScopedPrismaClient } from "../prisma/tenant-prisma.service";
import { CargosService } from "../cargos/cargos.service";
import { formatearPeriodoCorto } from "../cargos/periodo.util";
import type { RegistrarPagoDto } from "./dto/registrar-pago.dto";
import type { AnularBoletaDto } from "./dto/anular-boleta.dto";

type Tx = Prisma.TransactionClient;

export function formatearFolio(numero: number): string {
  return `001-${String(numero).padStart(4, "0")}`;
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
}
