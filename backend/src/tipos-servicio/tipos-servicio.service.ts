import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { TenantPrismaService, type ScopedPrismaClient } from "../prisma/tenant-prisma.service";
import type { CreateTipoServicioDto } from "./dto/create-tipo-servicio.dto";

type Cliente = ScopedPrismaClient | Prisma.TransactionClient;

@Injectable()
export class TiposServicioService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  private get prisma(): ScopedPrismaClient {
    return this.tenantPrisma.client;
  }

  listar() {
    return this.prisma.tipoServicio.findMany({ orderBy: { nombre: "asc" } });
  }

  crear(dto: CreateTipoServicioDto, empresaId: string) {
    return this.prisma.tipoServicio.create({ data: { nombre: dto.nombre.trim().toLowerCase(), empresaId } });
  }

  /** Usado por la importación para obtener/crear el tipo "cable" sin duplicar lógica. */
  async obtenerOCrearPorNombre(nombre: string, empresaId: string, cliente: Cliente = this.prisma) {
    // Ver el comentario en zonas.service.ts sobre por qué se convierte a `tx` antes de usarlo.
    const tx = cliente as Prisma.TransactionClient;
    const nombreNormalizado = nombre.trim().toLowerCase();
    const existente = await tx.tipoServicio.findFirst({ where: { nombre: nombreNormalizado, empresaId } });
    if (existente) {
      return existente;
    }
    return tx.tipoServicio.create({ data: { nombre: nombreNormalizado, empresaId } });
  }
}
