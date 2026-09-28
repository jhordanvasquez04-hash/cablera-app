import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { PuntosRedService } from "./puntos-red.service";
import { CreatePuntoRedDto } from "./dto/create-punto-red.dto";
import { UpdatePuntoRedDto } from "./dto/update-punto-red.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Roles("gestor")
@Controller("puntos-red")
export class PuntosRedController {
  constructor(private puntosRedService: PuntosRedService) {}

  @Roles("gestor", "cobrador")
  @Get()
  listar() {
    return this.puntosRedService.listar();
  }

  @Post()
  crear(@Body() dto: CreatePuntoRedDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.puntosRedService.crear(dto, usuario.empresaId!);
  }

  @Patch(":id")
  actualizar(@Param("id") id: string, @Body() dto: UpdatePuntoRedDto) {
    return this.puntosRedService.actualizar(id, dto);
  }

  @Delete(":id")
  eliminar(@Param("id") id: string) {
    return this.puntosRedService.eliminar(id);
  }
}
