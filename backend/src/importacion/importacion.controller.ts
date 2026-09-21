import { BadRequestException, Controller, Get, Post, Query, StreamableFile, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ImportacionService } from "./importacion.service";
import { generarPlantillaClientesExcel } from "./excel-clientes-simple.parser";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

const CINCO_MB = 5 * 1024 * 1024;

@Roles("gestor")
@Controller("importacion")
export class ImportacionController {
  constructor(private importacionService: ImportacionService) {}

  // Migración histórica (formato fijo tipo PARIAS: zonas por "CASERIO X", 12 columnas de
  // pagos por mes) — pensada para migrar una cartera de clientes YA existente con su
  // historial de cobranza. Ver "clientes-lista-excel" para alta simple sin historial.
  @Post("clientes-excel")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: CINCO_MB } }))
  importarClientes(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() usuario: AuthenticatedUser,
    @Query("anio") anio?: string,
  ) {
    if (!file) {
      throw new BadRequestException("Debes adjuntar un archivo Excel (.xlsx)");
    }

    const anioNumero = anio ? Number(anio) : new Date().getFullYear();
    return this.importacionService.importarClientesDesdeExcel(file.buffer, anioNumero, usuario.empresaId!);
  }

  // Alta masiva simple: plantilla genérica por encabezados de columna, sin historial de
  // cobranza. Pensada para una empresa nueva (o para acelerar el llenado en cualquier
  // momento) que solo necesita cargar su lista de clientes actuales.
  @Get("plantilla-clientes-excel")
  async plantillaClientes(): Promise<StreamableFile> {
    const buffer = await generarPlantillaClientesExcel();
    return new StreamableFile(buffer, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      disposition: 'attachment; filename="plantilla-clientes.xlsx"',
    });
  }

  @Post("clientes-lista-excel")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: CINCO_MB } }))
  importarListaClientes(@UploadedFile() file: Express.Multer.File, @CurrentUser() usuario: AuthenticatedUser) {
    if (!file) {
      throw new BadRequestException("Debes adjuntar un archivo Excel (.xlsx)");
    }

    return this.importacionService.importarListaClientesDesdeExcel(file.buffer, usuario.empresaId!);
  }
}
