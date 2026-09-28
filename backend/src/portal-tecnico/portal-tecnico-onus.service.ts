import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedTecnico } from "../auth/decorators/current-tecnico.decorator";
import type { CreateOnuDto } from "../onus/dto/create-onu.dto";

/** Igual que PortalTecnicoOrdenesService: PrismaService crudo, filtrado a mano por empresaId
 * (un técnico no tiene request.user, así que TenantPrismaService no aplica acá). */
@Injectable()
export class PortalTecnicoOnusService {
  constructor(private prisma: PrismaService) {}

  private async validarPropio(id: string, empresaId: string, buscar: (id: string) => Promise<{ empresaId: string } | null>, mensaje: string) {
    const encontrado = await buscar(id);
    if (!encontrado || encontrado.empresaId !== empresaId) {
      throw new BadRequestException(mensaje);
    }
  }

  async crear(dto: CreateOnuDto, tecnico: AuthenticatedTecnico) {
    await this.validarPropio(dto.oltId, tecnico.empresaId, (id) => this.prisma.olt.findUnique({ where: { id } }), "El OLT indicado no existe");
    if (dto.contratoId) {
      await this.validarPropio(dto.contratoId, tecnico.empresaId, (id) => this.prisma.contrato.findUnique({ where: { id } }), "El contrato indicado no existe");
    }
    if (dto.ordenServicioId) {
      await this.validarPropio(
        dto.ordenServicioId,
        tecnico.empresaId,
        (id) => this.prisma.ordenServicio.findUnique({ where: { id } }),
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
        autorizadoPorTecnicoId: tecnico.tecnicoId,
        empresaId: tecnico.empresaId,
      },
    });
  }
}
