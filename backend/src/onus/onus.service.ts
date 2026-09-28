import { BadRequestException, Injectable } from "@nestjs/common";
import { TenantPrismaService, type ScopedPrismaClient } from "../prisma/tenant-prisma.service";
import type { CreateOnuDto } from "./dto/create-onu.dto";

const INCLUDE = {
  olt: { select: { id: true, nombre: true } },
  contrato: { select: { id: true, servicioContratado: { select: { cliente: { select: { nombreCompleto: true } } } } } },
  autorizadoPorUsuario: { select: { id: true, nombre: true } },
  autorizadoPorTecnico: { select: { id: true, nombre: true, apellido: true } },
} as const;

@Injectable()
export class OnusService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  private get prisma(): ScopedPrismaClient {
    return this.tenantPrisma.client;
  }

  listar(filtros: { oltId?: string; contratoId?: string }) {
    return this.prisma.onu.findMany({
      where: { oltId: filtros.oltId || undefined, contratoId: filtros.contratoId || undefined },
      include: INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  private async validarPertenece<T>(consulta: Promise<T | null>, mensaje: string): Promise<void> {
    const encontrado = await consulta;
    if (!encontrado) {
      throw new BadRequestException(mensaje);
    }
  }

  async crear(dto: CreateOnuDto, empresaId: string, autorizadoPorUsuarioId: string) {
    // Alcance de tenant en las tres: un id de otra empresa llega como "no existe" — mismo
    // patrón que el resto de los validarX de este proyecto.
    await this.validarPertenece(this.prisma.olt.findUnique({ where: { id: dto.oltId } }), "El OLT indicado no existe");
    if (dto.contratoId) {
      await this.validarPertenece(this.prisma.contrato.findUnique({ where: { id: dto.contratoId } }), "El contrato indicado no existe");
    }
    if (dto.ordenServicioId) {
      await this.validarPertenece(
        this.prisma.ordenServicio.findUnique({ where: { id: dto.ordenServicioId } }),
        "La orden de servicio indicada no existe",
      );
    }

    return this.prisma.onu.create({
      data: {
        oltId: dto.oltId,
        numeroSerie: dto.numeroSerie.trim(),
        onuId: dto.onuId,
        puerto: dto.puerto.trim(),
        nombre: dto.nombre.trim(),
        vlan: dto.vlan.trim(),
        perfilServicio: dto.perfilServicio.trim(),
        onuType: dto.onuType.trim(),
        estado: dto.estado,
        mensajeError: dto.estado === "fallida" ? dto.mensajeError?.trim() || null : null,
        contratoId: dto.contratoId || null,
        ordenServicioId: dto.ordenServicioId || null,
        autorizadoPorUsuarioId,
        empresaId,
      },
      include: INCLUDE,
    });
  }
}
