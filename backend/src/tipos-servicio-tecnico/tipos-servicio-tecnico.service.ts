import { Injectable } from "@nestjs/common";
import { TenantPrismaService, type ScopedPrismaClient } from "../prisma/tenant-prisma.service";
import type { CreateTipoServicioTecnicoDto, UpdateTipoServicioTecnicoDto } from "./dto/create-tipo-servicio-tecnico.dto";

@Injectable()
export class TiposServicioTecnicoService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  private get prisma(): ScopedPrismaClient {
    return this.tenantPrisma.client;
  }

  listar() {
    return this.prisma.tipoServicioTecnico.findMany({ orderBy: { nombre: "asc" } });
  }

  crear(dto: CreateTipoServicioTecnicoDto, empresaId: string) {
    return this.prisma.tipoServicioTecnico.create({
      data: { nombre: dto.nombre.trim(), camposDefinicion: dto.camposDefinicion ?? [], empresaId },
    });
  }

  actualizar(id: string, dto: UpdateTipoServicioTecnicoDto) {
    return this.prisma.tipoServicioTecnico.update({
      where: { id },
      data: {
        nombre: dto.nombre?.trim(),
        camposDefinicion: dto.camposDefinicion,
      },
    });
  }
}
