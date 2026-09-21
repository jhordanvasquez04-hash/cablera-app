import { Body, Controller, Get, Post } from "@nestjs/common";
import { TiposServicioService } from "./tipos-servicio.service";
import { CreateTipoServicioDto } from "./dto/create-tipo-servicio.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Roles("gestor")
@Controller("tipos-servicio")
export class TiposServicioController {
  constructor(private tiposServicioService: TiposServicioService) {}

  @Get()
  listar() {
    return this.tiposServicioService.listar();
  }

  @Post()
  crear(@Body() dto: CreateTipoServicioDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.tiposServicioService.crear(dto, usuario.empresaId!);
  }
}
