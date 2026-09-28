import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { CargosService } from "./cargos.service";
import { CrearCargoManualDto } from "./dto/crear-cargo-manual.dto";
import { AplicarDescuentoCargoDto } from "./dto/aplicar-descuento-cargo.dto";
import { GenerarCargosDto } from "./dto/generar-cargos.dto";
import { DescuentoMasivoDto } from "./dto/descuento-masivo.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

// Fusión con Keysls: generación manual de cargos, cargo puntual y descuentos (por cargo y
// masivo). El cron (GeneracionCargosService) sigue generando el día de facturación de cada
// servicio; esto es el complemento manual para adelantar/recuperar/ajustar desde Cobranza.
@Roles("gestor", "cobrador")
@Controller("cargos")
export class CargosController {
  constructor(private cargosService: CargosService) {}

  @Get("preview")
  preview(@CurrentUser() usuario: AuthenticatedUser) {
    return this.cargosService.previaGeneracion(usuario.empresaId!);
  }

  @Post("generar")
  generar(@Body() dto: GenerarCargosDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.cargosService.generarManual(usuario.empresaId!, dto);
  }

  @Post()
  crearManual(@Body() dto: CrearCargoManualDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.cargosService.crearManual(usuario.empresaId!, dto);
  }

  // Solo gestor: mismo criterio que Keysls (ADMIN/SUPERVISOR) para tocar montos por descuento.
  @Roles("gestor")
  @Post(":id/descuento")
  aplicarDescuento(@Param("id") id: string, @Body() dto: AplicarDescuentoCargoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.cargosService.aplicarDescuento(id, dto, usuario.empresaId!);
  }

  @Roles("gestor")
  @Delete(":id/descuento")
  quitarDescuento(@Param("id") id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.cargosService.quitarDescuento(id, usuario.empresaId!);
  }

  @Roles("gestor")
  @Get("descuento-masivo/preview")
  descuentoMasivoPreview(@Query("periodo") periodo: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.cargosService.descuentoMasivoPreview(usuario.empresaId!, periodo);
  }

  @Roles("gestor")
  @Post("descuento-masivo")
  descuentoMasivo(@Body() dto: DescuentoMasivoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.cargosService.descuentoMasivo(usuario.empresaId!, dto);
  }

  @Roles("gestor")
  @Delete("descuento-masivo")
  quitarDescuentoMasivo(@Query("periodo") periodo: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.cargosService.quitarDescuentoMasivo(usuario.empresaId!, periodo);
  }
}
