import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { EstadoServicioTecnico, Prisma } from "@prisma/client";
import { TenantPrismaService, type ScopedPrismaClient } from "../prisma/tenant-prisma.service";
import type { CreateServicioTecnicoDto } from "./dto/create-servicio-tecnico.dto";

const INCLUDE = {
  tipoServicioTecnico: true,
  cliente: { select: { id: true, nombreCompleto: true } },
  registradoPor: { select: { id: true, nombre: true } },
} satisfies Prisma.ServicioTecnicoInclude;

export interface FiltrosServiciosTecnicos {
  estado?: EstadoServicioTecnico;
  tipoServicioTecnicoId?: string;
  clienteId?: string;
}

@Injectable()
export class ServiciosTecnicosService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  private get prisma(): ScopedPrismaClient {
    return this.tenantPrisma.client;
  }

  private formatear(servicio: Prisma.ServicioTecnicoGetPayload<{ include: typeof INCLUDE }>) {
    return {
      id: servicio.id,
      folio: `ST-${String(servicio.folio).padStart(4, "0")}`,
      tipo: servicio.tipoServicioTecnico.nombre,
      tipoServicioTecnicoId: servicio.tipoServicioTecnicoId,
      cliente: servicio.cliente,
      tecnico: servicio.tecnico,
      estado: servicio.estado,
      datosPropios: servicio.datosPropios,
      comentario: servicio.comentario,
      comentarioFinal: servicio.comentarioFinal,
      fechaCreacion: servicio.fechaCreacion,
      fechaProgramada: servicio.fechaProgramada,
      fechaLiquidacion: servicio.fechaLiquidacion,
      registradoPor: servicio.registradoPor?.nombre ?? null,
    };
  }

  async listar(filtros: FiltrosServiciosTecnicos) {
    const servicios = await this.prisma.servicioTecnico.findMany({
      where: {
        estado: filtros.estado || undefined,
        tipoServicioTecnicoId: filtros.tipoServicioTecnicoId || undefined,
        clienteId: filtros.clienteId || undefined,
      },
      include: INCLUDE,
      orderBy: { fechaCreacion: "desc" },
    });
    return servicios.map((servicio) => this.formatear(servicio));
  }

  async obtener(id: string) {
    const servicio = await this.prisma.servicioTecnico.findUnique({ where: { id }, include: INCLUDE });
    if (!servicio) {
      throw new NotFoundException("Servicio técnico no encontrado");
    }
    return this.formatear(servicio);
  }

  async crear(dto: CreateServicioTecnicoDto, usuarioId: string, empresaId: string) {
    // El folio ya no es autoincrement (una secuencia de Postgres es global, no se puede
    // particionar por tenant): se incrementa transaccionalmente sobre
    // Empresa.correlativoServicioTecnicoActual, igual que Cliente.numeroContrato.
    const servicio = await this.prisma.$transaction(async (tx) => {
      const empresaActualizada = await tx.empresa.update({
        where: { id: empresaId },
        data: { correlativoServicioTecnicoActual: { increment: 1 } },
      });
      return tx.servicioTecnico.create({
        data: {
          tipoServicioTecnicoId: dto.tipoServicioTecnicoId,
          clienteId: dto.clienteId,
          tecnico: dto.tecnico || null,
          fechaProgramada: dto.fechaProgramada ? new Date(dto.fechaProgramada) : null,
          comentario: dto.comentario || null,
          datosPropios: dto.datosPropios ?? {},
          registradoPorId: usuarioId,
          empresaId,
          folio: empresaActualizada.correlativoServicioTecnicoActual,
        },
        include: INCLUDE,
      });
    });
    return this.formatear(servicio);
  }

  async comentar(id: string, comentario: string) {
    await this.obtener(id);
    const servicio = await this.prisma.servicioTecnico.update({
      where: { id },
      data: { comentario },
      include: INCLUDE,
    });
    return this.formatear(servicio);
  }

  async eliminar(id: string) {
    await this.obtener(id);
    await this.prisma.servicioTecnico.delete({ where: { id } });
    return { ok: true };
  }

  async liquidar(id: string, comentarioFinal?: string) {
    const actual = await this.obtener(id);
    if (actual.estado === "liquidado") {
      throw new BadRequestException("Este servicio ya está liquidado");
    }
    const servicio = await this.prisma.servicioTecnico.update({
      where: { id },
      data: { estado: "liquidado", fechaLiquidacion: new Date(), comentarioFinal: comentarioFinal || undefined },
      include: INCLUDE,
    });
    return this.formatear(servicio);
  }
}
