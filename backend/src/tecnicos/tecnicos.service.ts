import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { TenantPrismaService } from "../prisma/tenant-prisma.service";
import type { CreateTecnicoDto } from "./dto/create-tecnico.dto";
import type { UpdateTecnicoDto } from "./dto/update-tecnico.dto";

function sinPassword<T extends { passwordHash: string }>(tecnico: T) {
  const { passwordHash: _omitido, ...resto } = tecnico;
  return resto;
}

@Injectable()
export class TecnicosService {
  // `prisma` (crudo) solo para findByEmail: el login del portal (/auth/tecnico/login,
  // @Public()) necesita buscar por correo ANTES de tener una empresa en el contexto — mismo
  // motivo exacto que UsuariosService.findByEmail.
  constructor(
    private prisma: PrismaService,
    private tenantPrisma: TenantPrismaService,
  ) {}

  findByEmail(email: string) {
    return this.prisma.tecnico.findFirst({
      where: { email: { equals: email.trim(), mode: "insensitive" } },
      include: { empresa: { select: { estado: true } } },
    });
  }

  async listar() {
    const tecnicos = await this.tenantPrisma.client.tecnico.findMany({
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    });
    return tecnicos.map(sinPassword);
  }

  async crear(dto: CreateTecnicoDto, empresaId: string) {
    const existente = await this.findByEmail(dto.email);
    if (existente) {
      throw new ConflictException("Ya existe un técnico con ese correo");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const tecnico = await this.tenantPrisma.client.tecnico.create({
      data: {
        nombre: dto.nombre.trim(),
        apellido: dto.apellido.trim(),
        dni: dto.dni.trim(),
        telefono: dto.telefono?.trim() || null,
        email: dto.email.trim().toLowerCase(),
        passwordHash,
        zona: dto.zona?.trim() || null,
        vehiculo: dto.vehiculo?.trim() || null,
        empresaId,
      },
    });
    return sinPassword(tecnico);
  }

  private async obtenerDeLaEmpresa(id: string) {
    const tecnico = await this.tenantPrisma.client.tecnico.findUnique({ where: { id } });
    if (!tecnico) {
      throw new NotFoundException("Técnico no encontrado");
    }
    return tecnico;
  }

  async actualizar(id: string, dto: UpdateTecnicoDto) {
    await this.obtenerDeLaEmpresa(id);
    const tecnico = await this.tenantPrisma.client.tecnico.update({
      where: { id },
      data: {
        nombre: dto.nombre?.trim(),
        apellido: dto.apellido?.trim(),
        telefono: dto.telefono?.trim(),
        zona: dto.zona?.trim(),
        vehiculo: dto.vehiculo?.trim(),
      },
    });
    return sinPassword(tecnico);
  }

  // "Eliminar" = desactivar (mismo criterio que Usuario): bloquea el login del portal sin
  // borrar su historial de contratos instalados / órdenes asignadas.
  async desactivar(id: string) {
    await this.obtenerDeLaEmpresa(id);
    const tecnico = await this.tenantPrisma.client.tecnico.update({ where: { id }, data: { activo: false } });
    return sinPassword(tecnico);
  }

  async activar(id: string) {
    await this.obtenerDeLaEmpresa(id);
    const tecnico = await this.tenantPrisma.client.tecnico.update({ where: { id }, data: { activo: true } });
    return sinPassword(tecnico);
  }

  async resetearPassword(id: string, nuevaPassword: string) {
    await this.obtenerDeLaEmpresa(id);
    const passwordHash = await bcrypt.hash(nuevaPassword, 10);
    await this.tenantPrisma.client.tecnico.update({ where: { id }, data: { passwordHash } });
    return { ok: true };
  }
}
