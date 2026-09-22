import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { UpdateConfiguracionDto } from "./dto/update-configuracion.dto";

// Sigue siendo singleton (no TenantPrismaService): el cron de generación de cargos
// (sin request/empresa en contexto) también necesita leer la configuración de CADA
// empresa activa, una por una — así que `empresaId` viaja explícito en cada método en
// vez de resolverse por inyección. Usa el PrismaService crudo con el filtro a mano.
@Injectable()
export class ConfiguracionService {
  constructor(private prisma: PrismaService) {}

  async getConfiguracion(empresaId: string) {
    return this.prisma.configuracion.upsert({
      where: { empresaId },
      update: {},
      create: { nombreEmpresa: "Mi Cablera", empresaId },
    });
  }

  async updateConfiguracion(empresaId: string, dto: UpdateConfiguracionDto) {
    await this.getConfiguracion(empresaId);
    return this.prisma.configuracion.update({
      where: { empresaId },
      data: dto,
    });
  }

  async actualizarLogo(empresaId: string, logoUrl: string | null) {
    await this.getConfiguracion(empresaId);
    return this.prisma.configuracion.update({
      where: { empresaId },
      data: { logoUrl },
    });
  }
}
