import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ProductosService } from "./productos.service";
import { CreateProductoDto } from "./dto/create-producto.dto";
import { UpdateProductoDto } from "./dto/update-producto.dto";
import { RegistrarMovimientoDto } from "./dto/registrar-movimiento.dto";
import { CreateVarianteDto } from "./dto/create-variante.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

// Catálogo de almacén (equipos, materiales, uniformes) + kardex de entradas/salidas. Solo
// gestor: a diferencia de Planes/PuntoRed, un cobrador no tiene ninguna razón de negocio para
// ver el stock — y el consumo de materiales en campo pasa por el portal del técnico, no acá.
@Roles("gestor")
@Controller("productos")
export class ProductosController {
  constructor(private productosService: ProductosService) {}

  @Get()
  listar(@Query("categoria") categoria?: string, @Query("soloActivos") soloActivos?: string) {
    return this.productosService.listar({ categoria, soloActivos: soloActivos === "true" });
  }

  @Get(":id")
  obtener(@Param("id") id: string) {
    return this.productosService.obtener(id);
  }

  @Post()
  crear(@Body() dto: CreateProductoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.productosService.crear(dto, usuario.empresaId!);
  }

  @Patch(":id")
  actualizar(@Param("id") id: string, @Body() dto: UpdateProductoDto) {
    return this.productosService.actualizar(id, dto);
  }

  @Get(":id/movimientos")
  listarMovimientos(@Param("id") id: string) {
    return this.productosService.listarMovimientos(id);
  }

  @Post(":id/movimientos")
  registrarMovimiento(@Param("id") id: string, @Body() dto: RegistrarMovimientoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.productosService.registrarMovimiento(id, dto, usuario.empresaId!);
  }

  @Get(":id/variantes")
  listarVariantes(@Param("id") id: string) {
    return this.productosService.listarVariantes(id);
  }

  @Post(":id/variantes")
  crearVariante(@Param("id") id: string, @Body() dto: CreateVarianteDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.productosService.crearVariante(id, dto, usuario.empresaId!);
  }

  @Delete("variantes/:id")
  eliminarVariante(@Param("id") id: string) {
    return this.productosService.eliminarVariante(id);
  }
}
