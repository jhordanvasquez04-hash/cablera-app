import { Injectable, NotFoundException } from "@nestjs/common";
import { TenantPrismaService, type ScopedPrismaClient } from "../prisma/tenant-prisma.service";
import type { CreateMetodoPagoEmpresaDto } from "./dto/create-metodo-pago-empresa.dto";

@Injectable()
export class MetodosPagoEmpresaService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  private get prisma(): ScopedPrismaClient {
    return this.tenantPrisma.client;
  }

  listar() {
    return this.prisma.metodoPagoEmpresa.findMany({ orderBy: { createdAt: "asc" } });
  }

  crear(dto: CreateMetodoPagoEmpresaDto, empresaId: string) {
    return this.prisma.metodoPagoEmpresa.create({
      data: {
        tipo: dto.tipo,
        numero: dto.numero.trim(),
        banco: dto.banco?.trim() || null,
        titular: dto.titular?.trim() || null,
        empresaId,
      },
    });
  }

  async eliminar(id: string) {
    const existente = await this.prisma.metodoPagoEmpresa.findUnique({ where: { id } });
    if (!existente) {
      throw new NotFoundException("Método de pago no encontrado");
    }
    return this.prisma.metodoPagoEmpresa.delete({ where: { id } });
  }
}
