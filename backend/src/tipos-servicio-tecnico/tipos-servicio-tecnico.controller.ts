import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { TiposServicioTecnicoService } from "./tipos-servicio-tecnico.service";
import { CreateTipoServicioTecnicoDto, UpdateTipoServicioTecnicoDto } from "./dto/create-tipo-servicio-tecnico.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("tipos-servicio-tecnico")
export class TiposServicioTecnicoController {
  constructor(private tiposServicioTecnicoService: TiposServicioTecnicoService) {}

  @Roles("gestor", "cobrador")
  @Get()
  listar() {
    return this.tiposServicioTecnicoService.listar();
  }

  @Roles("gestor")
  @Post()
  crear(@Body() dto: CreateTipoServicioTecnicoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.tiposServicioTecnicoService.crear(dto, usuario.empresaId!);
  }

  @Roles("gestor")
  @Patch(":id")
  actualizar(@Param("id") id: string, @Body() dto: UpdateTipoServicioTecnicoDto) {
    return this.tiposServicioTecnicoService.actualizar(id, dto);
  }
}
