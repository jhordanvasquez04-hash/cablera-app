import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { UsuariosService } from "./usuarios.service";
import { CreateUsuarioDto } from "./dto/create-usuario.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Roles("gestor")
@Controller("usuarios")
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @Get()
  listar() {
    return this.usuariosService.listar();
  }

  @Post()
  crear(@Body() dto: CreateUsuarioDto) {
    return this.usuariosService.crear(dto);
  }

  // "Eliminar" un usuario en el panel: ver el comentario en usuarios.service.ts sobre por qué
  // desactiva en vez de borrar (el historial de boletas/gastos/servicios técnicos se conserva).
  @Post(":id/desactivar")
  desactivar(@Param("id") id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.usuariosService.desactivar(id, usuario.userId);
  }

  @Post(":id/activar")
  activar(@Param("id") id: string) {
    return this.usuariosService.activar(id);
  }
}
