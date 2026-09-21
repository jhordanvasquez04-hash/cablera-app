import { Injectable } from "@nestjs/common";
import { TenantPrismaService, type ScopedPrismaClient } from "../prisma/tenant-prisma.service";
import { construirWorkbookBackup } from "./backup-excel.builder";

@Injectable()
export class ExportacionService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  private get prisma(): ScopedPrismaClient {
    return this.tenantPrisma.client;
  }

  async generarBackupExcel(): Promise<Buffer> {
    const [clientes, cargos, boletas, movimientosCaja, gastosReportados] = await Promise.all([
      this.prisma.cliente.findMany({
        include: { zona: true, serviciosContratados: { include: { tipoServicio: true } } },
        orderBy: { nombreCompleto: "asc" },
      }),
      this.prisma.cargoMensual.findMany({
        include: { cliente: true, servicioContratado: { include: { tipoServicio: true } } },
        orderBy: [{ anio: "desc" }, { mes: "desc" }],
      }),
      this.prisma.boleta.findMany({
        include: { cliente: true, registradoPor: true },
        orderBy: { numero: "desc" },
      }),
      this.prisma.movimientoCaja.findMany({
        include: { categoria: true },
        orderBy: { fecha: "desc" },
      }),
      this.prisma.gastoReportado.findMany({
        include: { usuario: true },
        orderBy: { fecha: "desc" },
      }),
    ]);

    return construirWorkbookBackup({ clientes, cargos, boletas, movimientosCaja, gastosReportados });
  }
}
