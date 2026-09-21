import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import type { EstadoServicioTecnico } from "@prisma/client";
import { ServiciosTecnicosService } from "./servicios-tecnicos.service";
import { CreateServicioTecnicoDto, ComentarServicioTecnicoDto, LiquidarServicioTecnicoDto } from "./dto/create-servicio-tecnico.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Roles("gestor", "cobrador")
@Controller("servicios-tecnicos")
export class ServiciosTecnicosController {
  constructor(private serviciosTecnicosService: ServiciosTecnicosService) {}

  @Get()
  listar(
    @Query("estado") estado?: EstadoServicioTecnico,
    @Query("tipoServicioTecnicoId") tipoServicioTecnicoId?: string,
    @Query("clienteId") clienteId?: string,
  ) {
    return this.serviciosTecnicosService.listar({ estado, tipoServicioTecnicoId, clienteId });
  }

  @Get(":id")
  obtener(@Param("id") id: string) {
    return this.serviciosTecnicosService.obtener(id);
  }

  @Post()
  crear(@Body() dto: CreateServicioTecnicoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.serviciosTecnicosService.crear(dto, usuario.userId, usuario.empresaId!);
  }

  @Post(":id/comentar")
  comentar(@Param("id") id: string, @Body() dto: ComentarServicioTecnicoDto) {
    return this.serviciosTecnicosService.comentar(id, dto.comentario);
  }

  @Post(":id/liquidar")
  liquidar(@Param("id") id: string, @Body() dto: LiquidarServicioTecnicoDto) {
    return this.serviciosTecnicosService.liquidar(id, dto.comentarioFinal);
  }

  @Roles("gestor")
  @Delete(":id")
  eliminar(@Param("id") id: string) {
    return this.serviciosTecnicosService.eliminar(id);
  }
}
