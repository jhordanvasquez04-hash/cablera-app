import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { TenantPrismaService } from "../prisma/tenant-prisma.service";
import type { CreateUsuarioDto } from "./dto/create-usuario.dto";

@Injectable()
export class UsuariosService {
  // `prisma` (crudo) solo para findByEmail: el login (/auth/login es @Public()) necesita
  // buscar por correo ANTES de tener una empresa en el contexto, y el correo es único a
  // nivel global — es la única excepción intencional a "todo pasa por tenantPrisma" aquí.
  constructor(
    private prisma: PrismaService,
    private tenantPrisma: TenantPrismaService,
  ) {}

  findByEmail(email: string) {
    // Sin distinguir mayúsculas: "Gestor@x.com" y "gestor@x.com" son la misma cuenta.
    return this.prisma.usuario.findFirst({
      where: { email: { equals: email.trim(), mode: "insensitive" } },
      include: { empresa: { select: { estado: true } } },
    });
  }

  // Nunca se listan super_admin: esa cuenta es del panel proveedor externo, no de esta app.
  // Al usar tenantPrisma, además queda automáticamente acotado a la empresa del que llama.
  // Incluye a los desactivados (para poder reactivarlos): el frontend los distingue por `activo`.
  listar() {
    return this.tenantPrisma.client.usuario.findMany({
      where: { rol: { in: ["gestor", "cobrador"] } },
      select: { id: true, nombre: true, email: true, rol: true, activo: true, createdAt: true },
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    });
  }

  async crear(dto: CreateUsuarioDto) {
    const existente = await this.findByEmail(dto.email);
    if (existente) {
      throw new ConflictException("Ya existe un usuario con ese correo");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const usuario = await this.tenantPrisma.client.usuario.create({
      data: { nombre: dto.nombre, email: dto.email.trim().toLowerCase(), passwordHash, rol: dto.rol },
    });

    const { passwordHash: _omitido, ...usuarioSinPassword } = usuario;
    return usuarioSinPassword;
  }

  private async obtenerUsuarioDeLaEmpresa(id: string) {
    const usuario = await this.tenantPrisma.client.usuario.findFirst({ where: { id, rol: { in: ["gestor", "cobrador"] } } });
    if (!usuario) {
      throw new NotFoundException("Usuario no encontrado");
    }
    return usuario;
  }

  /**
   * "Eliminar" = desactivar (ver el comentario en schema.prisma sobre `Usuario.activo`): bloquea
   * el login de esa cuenta sin borrar su historial de boletas/gastos/servicios técnicos.
   */
  async desactivar(id: string, quienLlamaId: string) {
    const usuario = await this.obtenerUsuarioDeLaEmpresa(id);

    if (usuario.id === quienLlamaId) {
      throw new BadRequestException("No puedes desactivar tu propia cuenta");
    }

    if (usuario.rol === "gestor") {
      const otrosGestoresActivos = await this.tenantPrisma.client.usuario.count({
        where: { rol: "gestor", activo: true, id: { not: id } },
      });
      if (otrosGestoresActivos === 0) {
        throw new BadRequestException("Debe quedar al menos un gestor activo en la empresa");
      }
    }

    const { passwordHash: _omitido, ...resultado } = await this.tenantPrisma.client.usuario.update({
      where: { id },
      data: { activo: false },
    });
    return resultado;
  }

  async activar(id: string) {
    await this.obtenerUsuarioDeLaEmpresa(id);
    const { passwordHash: _omitido, ...resultado } = await this.tenantPrisma.client.usuario.update({
      where: { id },
      data: { activo: true },
    });
    return resultado;
  }
}
