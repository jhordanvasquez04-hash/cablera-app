import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CajaTurnosService } from "./caja-turnos.service";
import { AbrirTurnoDto } from "./dto/abrir-turno.dto";
import { CerrarTurnoDto } from "./dto/cerrar-turno.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Roles("gestor", "cobrador")
@Controller("caja-turnos")
export class CajaTurnosController {
  constructor(private cajaTurnosService: CajaTurnosService) {}

  @Get()
  listar() {
    return this.cajaTurnosService.listar();
  }

  @Get("abierto")
  turnoAbierto() {
    return this.cajaTurnosService.turnoAbierto();
  }

  @Post("abrir")
  abrir(@Body() dto: AbrirTurnoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.cajaTurnosService.abrir(dto, usuario.userId, usuario.empresaId!);
  }

  @Post(":id/cerrar")
  cerrar(@Param("id") id: string, @Body() dto: CerrarTurnoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.cajaTurnosService.cerrar(id, dto, usuario.userId);
  }
}
