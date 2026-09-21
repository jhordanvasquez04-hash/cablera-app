import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ZonasService } from "./zonas.service";
import { CreateZonaDto } from "./dto/create-zona.dto";
import { UpdateZonaDto } from "./dto/update-zona.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Roles("gestor")
@Controller("zonas")
export class ZonasController {
  constructor(private zonasService: ZonasService) {}

  @Roles("gestor", "cobrador")
  @Get()
  listar() {
    return this.zonasService.listar();
  }

  @Get("sugerir-codigo")
  sugerirCodigo(@Query("nombre") nombre: string) {
    return this.zonasService.sugerirCodigo(nombre ?? "");
  }

  @Get(":id")
  obtener(@Param("id") id: string) {
    return this.zonasService.obtener(id);
  }

  @Post()
  crear(@Body() dto: CreateZonaDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.zonasService.crear(dto, usuario.empresaId!);
  }

  @Patch(":id")
  actualizar(@Param("id") id: string, @Body() dto: UpdateZonaDto) {
    return this.zonasService.actualizar(id, dto);
  }

  @Delete(":id")
  eliminar(@Param("id") id: string) {
    return this.zonasService.eliminar(id);
  }
}
