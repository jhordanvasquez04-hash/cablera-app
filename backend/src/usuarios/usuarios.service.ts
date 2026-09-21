import { ConflictException, Injectable } from "@nestjs/common";
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
  listar() {
    return this.tenantPrisma.client.usuario.findMany({
      where: { rol: { in: ["gestor", "cobrador"] } },
      select: { id: true, nombre: true, email: true, rol: true, createdAt: true },
      orderBy: { nombre: "asc" },
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
}
