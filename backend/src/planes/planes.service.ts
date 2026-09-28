import { Injectable } from "@nestjs/common";
import type { TipoServicioRed } from "@prisma/client";
import { TenantPrismaService, type ScopedPrismaClient } from "../prisma/tenant-prisma.service";
import type { CreatePlanDto } from "./dto/create-plan.dto";
import type { UpdatePlanDto } from "./dto/update-plan.dto";

export interface FiltrosPlanes {
  tipoServicio?: TipoServicioRed;
  soloActivos?: boolean;
}

@Injectable()
export class PlanesService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  private get prisma(): ScopedPrismaClient {
    return this.tenantPrisma.client;
  }

  listar(filtros: FiltrosPlanes = {}) {
    return this.prisma.plan.findMany({
      where: {
        tipoServicio: filtros.tipoServicio || undefined,
        activo: filtros.soloActivos ? true : undefined,
      },
      orderBy: [{ tipoServicio: "asc" }, { mbps: "asc" }],
    });
  }

  crear(dto: CreatePlanDto, empresaId: string) {
    return this.prisma.plan.create({
      data: {
        nombre: dto.nombre.trim(),
        tipoServicio: dto.tipoServicio,
        mbps: dto.mbps ?? null,
        precio: dto.precio,
        empresaId,
      },
    });
  }

  // Un plan nunca se borra (podría estar referenciado por servicios contratados u órdenes de
  // servicio ya creadas): "eliminar" en la pantalla es `actualizar(id, { activo: false })`, igual
  // que el resto de catálogos de este esquema.
  actualizar(id: string, dto: UpdatePlanDto) {
    return this.prisma.plan.update({
      where: { id },
      data: {
        nombre: dto.nombre?.trim(),
        tipoServicio: dto.tipoServicio,
        mbps: dto.mbps,
        precio: dto.precio,
        activo: dto.activo,
      },
    });
  }
}
