import { Injectable } from "@nestjs/common";
import { TenantPrismaService, type ScopedPrismaClient } from "../prisma/tenant-prisma.service";
import type { CreateCategoriaEgresoDto } from "./dto/create-categoria-egreso.dto";

@Injectable()
export class CategoriasEgresoService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  private get prisma(): ScopedPrismaClient {
    return this.tenantPrisma.client;
  }

  listar() {
    return this.prisma.categoriaEgreso.findMany({ orderBy: { nombre: "asc" } });
  }

  crear(dto: CreateCategoriaEgresoDto, empresaId: string) {
    return this.prisma.categoriaEgreso.create({ data: { nombre: dto.nombre.trim(), empresaId } });
  }
}
