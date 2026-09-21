import { Controller, Get, StreamableFile } from "@nestjs/common";
import { ExportacionService } from "./exportacion.service";
import { Roles } from "../auth/decorators/roles.decorator";

@Roles("gestor")
@Controller("exportacion")
export class ExportacionController {
  constructor(private exportacionService: ExportacionService) {}

  @Get("backup-excel")
  async backupExcel(): Promise<StreamableFile> {
    const buffer = await this.exportacionService.generarBackupExcel();
    const fecha = new Date().toISOString().slice(0, 10);
    return new StreamableFile(buffer, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      disposition: `attachment; filename="backup-cablera-${fecha}.xlsx"`,
    });
  }
}
