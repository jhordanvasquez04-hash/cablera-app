import { BadRequestException, Injectable } from "@nestjs/common";
import type { Descuento, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateDescuentoDto } from "./dto/create-descuento.dto";

type Cliente = PrismaService | Prisma.TransactionClient;

function sumarMeses(fecha: Date, meses: number): Date {
  const resultado = new Date(fecha);
  resultado.setMonth(resultado.getMonth() + meses);
  return resultado;
}

// Sigue siendo singleton (no TenantPrismaService): igual que ConfiguracionService, el
// cron de generación de cargos lo usa sin request/empresa en contexto. Los métodos de
// lectura no necesitan empresaId explícito porque ya filtran por servicioContratadoId, y
// un servicio ya está acotado a una sola empresa — solo `crear()` sí lo necesita, porque
// inserta una fila nueva.
@Injectable()
export class DescuentosService {
  constructor(private prisma: PrismaService) {}

  async crear(servicioContratadoId: string, clienteId: string, dto: CreateDescuentoDto, empresaId: string) {
    if (!dto.cantidadMeses && !dto.fechaFin) {
      throw new BadRequestException("Debes indicar la cantidad de meses o una fecha de fin");
    }

    const fechaInicio = new Date();
    const fechaFin = dto.fechaFin ? new Date(dto.fechaFin) : sumarMeses(fechaInicio, dto.cantidadMeses!);

    return this.prisma.descuento.create({
      data: {
        clienteId,
        servicioContratadoId,
        porcentaje: dto.porcentaje,
        fechaInicio,
        cantidadMeses: dto.cantidadMeses ?? null,
        fechaFin,
        empresaId,
      },
    });
  }

  listarPorServicio(servicioContratadoId: string) {
    return this.prisma.descuento.findMany({ where: { servicioContratadoId }, orderBy: { fechaInicio: "desc" } });
  }

  /** El descuento vigente de un servicio contratado en una fecha dada (el más reciente si hay varios). */
  async obtenerVigente(servicioContratadoId: string, fecha: Date = new Date(), cliente: Cliente = this.prisma): Promise<Descuento | null> {
    return cliente.descuento.findFirst({
      where: { servicioContratadoId, fechaInicio: { lte: fecha }, fechaFin: { gte: fecha } },
      orderBy: { fechaInicio: "desc" },
    });
  }

  /** Versión en lote: evita N+1 al listar muchos servicios a la vez. */
  async obtenerVigentesPorServicios(servicioIds: string[], fecha: Date = new Date()): Promise<Map<string, Descuento>> {
    if (servicioIds.length === 0) return new Map();

    const vigentes = await this.prisma.descuento.findMany({
      where: { servicioContratadoId: { in: servicioIds }, fechaInicio: { lte: fecha }, fechaFin: { gte: fecha } },
      orderBy: { fechaInicio: "desc" },
    });

    const mapa = new Map<string, Descuento>();
    for (const descuento of vigentes) {
      if (!mapa.has(descuento.servicioContratadoId)) {
        mapa.set(descuento.servicioContratadoId, descuento);
      }
    }
    return mapa;
  }

  /** Única función que calcula el monto efectivo (monto base - descuento vigente). La usan el cron y todas las vistas. */
  calcularMontoEfectivo(montoBase: number, descuentoVigente: Pick<Descuento, "porcentaje"> | null | undefined): number {
    if (!descuentoVigente) return montoBase;
    return Number((montoBase * (1 - descuentoVigente.porcentaje / 100)).toFixed(2));
  }
}
