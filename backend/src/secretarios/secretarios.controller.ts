import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { SecretariosService } from "./secretarios.service";
import { CreateSecretarioDto } from "./dto/create-secretario.dto";
import { UpdateSecretarioDto } from "./dto/update-secretario.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Roles("gestor")
@Controller("secretarios")
export class SecretariosController {
  constructor(private secretariosService: SecretariosService) {}

  @Get()
  listar() {
    return this.secretariosService.listar();
  }

  @Post()
  crear(@Body() dto: CreateSecretarioDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.secretariosService.crear(dto, usuario.empresaId!);
  }

  @Patch(":id")
  actualizar(@Param("id") id: string, @Body() dto: UpdateSecretarioDto) {
    return this.secretariosService.actualizar(id, dto);
  }
}
