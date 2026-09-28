import { BadRequestException, Body, Controller, Delete, Get, Ip, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AdminService } from "./admin.service";
import { CreateEmpresaDto } from "./dto/create-empresa.dto";
import { UpdateEmpresaDto } from "./dto/update-empresa.dto";
import { ActualizarEstadoEmpresaDto } from "./dto/actualizar-estado-empresa.dto";
import { ResetearPasswordUsuarioDto } from "./dto/resetear-password-usuario.dto";
import { RegistrarPagoSuscripcionDto } from "./dto/registrar-pago-suscripcion.dto";
import { RegistrarPagoSuscripcionGlobalDto } from "./dto/registrar-pago-suscripcion-global.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import type { DatosImportacion } from "./importar-clientes";

const VEINTE_MB = 20 * 1024 * 1024;

// Panel proveedor externo: fuera de cualquier empresa/tenant, solo super_admin.
@Roles("super_admin")
@Controller("admin")
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get("resumen")
  resumen() {
    return this.adminService.resumen();
  }

  @Get("empresas")
  listarEmpresas() {
    return this.adminService.listarEmpresas();
  }

  @Get("empresas/:id")
  obtenerEmpresa(@Param("id") id: string) {
    return this.adminService.obtenerEmpresaDetalle(id);
  }

  @Post("empresas")
  crearEmpresa(@Body() dto: CreateEmpresaDto, @Ip() ip: string) {
    return this.adminService.crearEmpresa(dto, ip);
  }

  @Patch("empresas/:id")
  actualizarEmpresa(@Param("id") id: string, @Body() dto: UpdateEmpresaDto, @Ip() ip: string) {
    return this.adminService.actualizarEmpresa(id, dto, ip);
  }

  @Patch("empresas/:id/estado")
  actualizarEstado(@Param("id") id: string, @Body() dto: ActualizarEstadoEmpresaDto, @Ip() ip: string) {
    return this.adminService.actualizarEstado(id, dto.estado, ip);
  }

  // Mantenidos por compatibilidad con el panel anterior — internamente son actualizarEstado().
  @Post("empresas/:id/activar")
  activar(@Param("id") id: string, @Ip() ip: string) {
    return this.adminService.actualizarEstado(id, "activa", ip);
  }

  @Post("empresas/:id/suspender")
  suspender(@Param("id") id: string, @Ip() ip: string) {
    return this.adminService.actualizarEstado(id, "suspendida", ip);
  }

  @Patch("usuarios/:id/password")
  resetearPasswordUsuario(@Param("id") id: string, @Body() dto: ResetearPasswordUsuarioDto, @Ip() ip: string) {
    return this.adminService.resetearPasswordUsuario(id, dto.password, ip);
  }

  @Get("actividad")
  listarActividad(@Query("limite") limite?: string) {
    return this.adminService.listarActividad(limite ? Number(limite) : undefined);
  }

  @Get("pagos")
  listarTodosLosPagos() {
    return this.adminService.listarTodosLosPagos();
  }

  @Get("empresas/:id/pagos-suscripcion")
  listarPagosSuscripcion(@Param("id") id: string) {
    return this.adminService.listarPagosSuscripcion(id);
  }

  @Post("empresas/:id/pagos-suscripcion")
  registrarPagoSuscripcion(@Param("id") id: string, @Body() dto: RegistrarPagoSuscripcionDto, @Ip() ip: string) {
    return this.adminService.registrarPagoSuscripcion(id, dto, ip);
  }

  @Post("pagos-suscripcion")
  registrarPagoSuscripcionGlobal(@Body() dto: RegistrarPagoSuscripcionGlobalDto, @Ip() ip: string) {
    return this.adminService.registrarPagoSuscripcion(dto.empresaId, dto, ip);
  }

  @Delete("pagos-suscripcion/:id")
  eliminarPagoSuscripcion(@Param("id") id: string, @Ip() ip: string) {
    return this.adminService.eliminarPagoSuscripcion(id, ip);
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
