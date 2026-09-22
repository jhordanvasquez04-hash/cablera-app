import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateEmpresaDto } from "./dto/create-empresa.dto";
import { importarClientes, type DatosImportacion } from "./importar-clientes";

// Único módulo (junto a los cron) con permiso explícito para usar el PrismaService crudo:
// el panel proveedor opera A PROPÓSITO cruzando empresas (listarlas, crearlas, suspenderlas).
@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async listarEmpresas() {
    const empresas = await this.prisma.empresa.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { clientes: true, usuarios: true } } },
    });

    return empresas.map((empresa) => ({
      id: empresa.id,
      nombre: empresa.nombre,
      slug: empresa.slug,
      estado: empresa.estado,
      clientesCount: empresa._count.clientes,
      usuariosCount: empresa._count.usuarios,
      createdAt: empresa.createdAt,
    }));
  }

  async crearEmpresa(dto: CreateEmpresaDto) {
    const slugExistente = await this.prisma.empresa.findUnique({ where: { slug: dto.slug } });
    if (slugExistente) {
      throw new ConflictException(`Ya existe una empresa con el slug "${dto.slug}"`);
    }

    const emailExistente = await this.prisma.usuario.findUnique({ where: { email: dto.gestorEmail } });
    if (emailExistente) {
      throw new ConflictException("Ya existe un usuario con ese correo");
    }

    const passwordHash = await bcrypt.hash(dto.gestorPassword, 10);

    return this.prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({
        data: { nombre: dto.nombre.trim(), slug: dto.slug.trim().toLowerCase() },
      });

      await tx.configuracion.create({
        data: { nombreEmpresa: empresa.nombre, empresaId: empresa.id },
      });

      const gestor = await tx.usuario.create({
        data: {
          nombre: dto.gestorNombre.trim(),
          email: dto.gestorEmail.trim().toLowerCase(),
          passwordHash,
          rol: "gestor",
          empresaId: empresa.id,
        },
      });

      return {
        empresa: { id: empresa.id, nombre: empresa.nombre, slug: empresa.slug, estado: empresa.estado },
        gestor: { id: gestor.id, nombre: gestor.nombre, email: gestor.email },
      };
    });
  }

  private async obtenerEmpresa(id: string) {
    const empresa = await this.prisma.empresa.findUnique({ where: { id } });
    if (!empresa) {
      throw new NotFoundException("Empresa no encontrada");
    }
    return empresa;
  }

  async activar(id: string) {
    await this.obtenerEmpresa(id);
    return this.prisma.empresa.update({ where: { id }, data: { estado: "activa" } });
  }

  async suspender(id: string) {
    await this.obtenerEmpresa(id);
    // No revoca tokens ya emitidos (límite aceptado, documentado en el plan): el bloqueo
    // real ocurre en el próximo intento de login de un usuario de esta empresa.
    return this.prisma.empresa.update({ where: { id }, data: { estado: "suspendida" } });
  }

  async importarClientes(id: string, datos: DatosImportacion) {
    await this.obtenerEmpresa(id);
    return importarClientes(this.prisma, id, datos);
  }
}
