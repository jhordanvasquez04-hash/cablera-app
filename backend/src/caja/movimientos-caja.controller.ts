import { Body, Controller, Delete, Get, Param, Patch, Post, Query, StreamableFile } from "@nestjs/common";
import { MovimientosCajaService } from "./movimientos-caja.service";
import { CreateMovimientoDto } from "./dto/create-movimiento.dto";
import { UpdateMovimientoDto } from "./dto/update-movimiento.dto";
import { construirWorkbookCaja } from "./caja-excel.builder";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Roles("gestor")
@Controller("caja")
export class MovimientosCajaController {
  constructor(private movimientosCajaService: MovimientosCajaService) {}

  @Post("movimientos")
  crear(@Body() dto: CreateMovimientoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.movimientosCajaService.crear(dto, usuario.empresaId!);
  }

  @Get("movimientos")
  listar(@Query("desde") desde?: string, @Query("hasta") hasta?: string) {
    return this.movimientosCajaService.listar(desde, hasta);
  }

  @Patch("movimientos/:id")
  actualizar(@Param("id") id: string, @Body() dto: UpdateMovimientoDto) {
    return this.movimientosCajaService.actualizar(id, dto);
  }

  @Delete("movimientos/:id")
  eliminar(@Param("id") id: string) {
    return this.movimientosCajaService.eliminar(id);
  }

  @Get("resumen")
  resumen(@Query("desde") desde?: string, @Query("hasta") hasta?: string) {
    return this.movimientosCajaService.resumen(desde, hasta);
  }

  @Get("tendencia")
  tendencia(@Query("meses") meses?: string) {
    return this.movimientosCajaService.tendencia(meses ? Number(meses) : 6);
  }

  @Get("exportar")
  async exportar(@Query("desde") desde?: string, @Query("hasta") hasta?: string): Promise<StreamableFile> {
    const [resumen, movimientos] = await Promise.all([
      this.movimientosCajaService.resumen(desde, hasta),
      this.movimientosCajaService.listar(desde, hasta),
    ]);
    const buffer = await construirWorkbookCaja(resumen, movimientos);
    const rango = `${resumen.desde.toISOString().slice(0, 10)}_${resumen.hasta.toISOString().slice(0, 10)}`;
    return new StreamableFile(buffer, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      disposition: `attachment; filename="caja-${rango}.xlsx"`,
    });
  }
}
