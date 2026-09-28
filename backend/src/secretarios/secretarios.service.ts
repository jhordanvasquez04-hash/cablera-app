import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { TenantPrismaService, type ScopedPrismaClient } from "../prisma/tenant-prisma.service";
import type { CreateSecretarioDto } from "./dto/create-secretario.dto";
import type { UpdateSecretarioDto } from "./dto/update-secretario.dto";

@Injectable()
export class SecretariosService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  private get prisma(): ScopedPrismaClient {
    return this.tenantPrisma.client;
  }

  listar() {
    return this.prisma.secretario.findMany({
      include: { usuario: { select: { id: true, nombre: true, email: true } } },
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    });
  }

  private async validarUsuario(usuarioId: string | null | undefined) {
    if (!usuarioId) return null;
    // Alcance de tenant: un usuarioId de otra empresa ya llega como "no existe".
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) {
      throw new BadRequestException("El usuario indicado no existe");
    }
    return usuarioId;
  }

  async crear(dto: CreateSecretarioDto, empresaId: string) {
    const usuarioId = await this.validarUsuario(dto.usuarioId);
    return this.prisma.secretario.create({
      data: {
        nombre: dto.nombre.trim(),
        apellido: dto.apellido.trim(),
        dni: dto.dni.trim(),
        telefono: dto.telefono?.trim() || null,
        email: dto.email.trim().toLowerCase(),
        usuarioId,
        empresaId,
      },
      include: { usuario: { select: { id: true, nombre: true, email: true } } },
    });
  }

  private async obtenerDeLaEmpresa(id: string) {
    const secretario = await this.prisma.secretario.findUnique({ where: { id } });
    if (!secretario) {
      throw new NotFoundException("Secretario no encontrado");
    }
    return secretario;
  }

  async actualizar(id: string, dto: UpdateSecretarioDto) {
    await this.obtenerDeLaEmpresa(id);
    const usuarioId = dto.usuarioId !== undefined ? (dto.usuarioId ? await this.validarUsuario(dto.usuarioId) : null) : undefined;
    return this.prisma.secretario.update({
      where: { id },
      data: {
        nombre: dto.nombre?.trim(),
        apellido: dto.apellido?.trim(),
        telefono: dto.telefono?.trim(),
        activo: dto.activo,
        usuarioId,
      },
      include: { usuario: { select: { id: true, nombre: true, email: true } } },
    });
  }
}
