import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { TecnicosService } from "./tecnicos.service";
import { CreateTecnicoDto } from "./dto/create-tecnico.dto";
import { UpdateTecnicoDto } from "./dto/update-tecnico.dto";
import { ResetearPasswordTecnicoDto } from "./dto/resetear-password-tecnico.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

// Catálogo de técnicos de campo, gestionado por el gestor. Es distinto de /usuarios: un técnico
// no entra a este panel — tiene su propio login en /auth/tecnico/login (ver auth.controller.ts).
@Roles("gestor")
@Controller("tecnicos")
export class TecnicosController {
  constructor(private tecnicosService: TecnicosService) {}

  @Get()
  listar() {
    return this.tecnicosService.listar();
  }

  @Post()
  crear(@Body() dto: CreateTecnicoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.tecnicosService.crear(dto, usuario.empresaId!);
  }

  @Patch(":id")
  actualizar(@Param("id") id: string, @Body() dto: UpdateTecnicoDto) {
    return this.tecnicosService.actualizar(id, dto);
  }

  @Post(":id/desactivar")
  desactivar(@Param("id") id: string) {
    return this.tecnicosService.desactivar(id);
  }

  @Post(":id/activar")
  activar(@Param("id") id: string) {
    return this.tecnicosService.activar(id);
  }

  @Post(":id/resetear-password")
  resetearPassword(@Param("id") id: string, @Body() dto: ResetearPasswordTecnicoDto) {
    return this.tecnicosService.resetearPassword(id, dto.password);
  }
}
