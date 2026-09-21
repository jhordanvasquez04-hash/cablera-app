import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { PrismaService } from "../prisma/prisma.service";
import { construirWorkbookBackup } from "./backup-excel.builder";

const CARPETA_BACKUPS = join(process.cwd(), "backups");

@Injectable()
export class ExportacionCronService {
  private readonly logger = new Logger(ExportacionCronService.name);

  constructor(private prisma: PrismaService) {}

  // Todos los días a las 2 a.m. (después del cron de generación de cargos): copia de
  // seguridad en Excel de cada empresa activa, sobrescribiendo el archivo del día anterior.
  @Cron("0 2 * * *")
  async cronDiario() {
    const empresasActivas = await this.prisma.empresa.findMany({ where: { estado: "activa" } });
    await mkdir(CARPETA_BACKUPS, { recursive: true });

    for (const empresa of empresasActivas) {
      const buffer = await this.generarBackupExcelDeEmpresa(empresa.id);
      await writeFile(join(CARPETA_BACKUPS, `backup-${empresa.slug}-ultimo.xlsx`), buffer);
      this.logger.log(`Backup diario generado para "${empresa.slug}"`);
    }
  }

  private async generarBackupExcelDeEmpresa(empresaId: string): Promise<Buffer> {
    const [clientes, cargos, boletas, movimientosCaja, gastosReportados] = await Promise.all([
      this.prisma.cliente.findMany({
        where: { empresaId },
        include: { zona: true, serviciosContratados: { include: { tipoServicio: true } } },
        orderBy: { nombreCompleto: "asc" },
      }),
      this.prisma.cargoMensual.findMany({
        where: { empresaId },
        include: { cliente: true, servicioContratado: { include: { tipoServicio: true } } },
        orderBy: [{ anio: "desc" }, { mes: "desc" }],
      }),
      this.prisma.boleta.findMany({
        where: { empresaId },
        include: { cliente: true, registradoPor: true },
        orderBy: { numero: "desc" },
      }),
      this.prisma.movimientoCaja.findMany({
        where: { empresaId },
        include: { categoria: true },
        orderBy: { fecha: "desc" },
      }),
      this.prisma.gastoReportado.findMany({
        where: { empresaId },
        include: { usuario: true },
        orderBy: { fecha: "desc" },
      }),
    ]);

    return construirWorkbookBackup({ clientes, cargos, boletas, movimientosCaja, gastosReportados });
  }
}
