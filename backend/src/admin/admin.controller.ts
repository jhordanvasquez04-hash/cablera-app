import { BadRequestException, Body, Controller, Get, Param, Post, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AdminService } from "./admin.service";
import { CreateEmpresaDto } from "./dto/create-empresa.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import type { DatosImportacion } from "./importar-clientes";

const VEINTE_MB = 20 * 1024 * 1024;

// Panel proveedor externo: fuera de cualquier empresa/tenant, solo super_admin.
@Roles("super_admin")
@Controller("admin")
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get("empresas")
  listarEmpresas() {
    return this.adminService.listarEmpresas();
  }

  @Post("empresas")
  crearEmpresa(@Body() dto: CreateEmpresaDto) {
    return this.adminService.crearEmpresa(dto);
  }

  @Post("empresas/:id/activar")
  activar(@Param("id") id: string) {
    return this.adminService.activar(id);
  }

  @Post("empresas/:id/suspender")
  suspender(@Param("id") id: string) {
    return this.adminService.suspender(id);
  }

  /**
   * Carga masiva de zonas/clientes/servicios para una empresa, a partir del JSON de histórico
   * (ver `importar-clientes.ts`). Pensado para el onboarding de una empresa nueva desde el panel
   * proveedor, sin necesitar acceso a una terminal del servidor.
   *
   * `?generarCargoInicial=true`: a cada cliente nuevo (con servicios activos) se le crea de una
   * vez el cargo del mes en curso, para que no aparezca con deuda S/ 0 hasta su próximo ciclo.
   */
  @Post("empresas/:id/importar-clientes")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: VEINTE_MB } }))
  async importarClientes(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query("generarCargoInicial") generarCargoInicial?: string,
  ) {
    if (!file) {
      throw new BadRequestException("Debes adjuntar el archivo JSON de clientes");
    }
    let datos: DatosImportacion;
    try {
      datos = JSON.parse(file.buffer.toString("utf-8"));
    } catch {
      throw new BadRequestException("El archivo no es un JSON válido");
    }
    if (!Array.isArray(datos?.zonas) || !Array.isArray(datos?.clientes)) {
      throw new BadRequestException('El archivo debe tener la forma { "zonas": [...], "clientes": [...] }');
    }
    return this.adminService.importarClientes(id, datos, {
      generarCargoInicial: generarCargoInicial === "true" || generarCargoInicial === "1",
    });
  }
}
