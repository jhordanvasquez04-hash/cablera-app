import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import type { EstadoOrdenServicio } from "@prisma/client";
import { OrdenesServicioService } from "./ordenes-servicio.service";
import { CreateOrdenServicioDto } from "./dto/create-orden-servicio.dto";
import { UpdateOrdenServicioDto } from "./dto/update-orden-servicio.dto";
import { AsignarTecnicoDto } from "./dto/asignar-tecnico.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Roles("gestor")
@Controller("ordenes-servicio")
export class OrdenesServicioController {
  constructor(private ordenesServicioService: OrdenesServicioService) {}

  @Roles("gestor", "cobrador")
  @Get()
  listar(@Query("estado") estado?: EstadoOrdenServicio, @Query("tecnicoId") tecnicoId?: string) {
    return this.ordenesServicioService.listar({ estado, tecnicoId });
  }

  @Roles("gestor", "cobrador")
  @Get(":id")
  obtener(@Param("id") id: string) {
    return this.ordenesServicioService.obtener(id);
  }

  @Post()
  crear(@Body() dto: CreateOrdenServicioDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.ordenesServicioService.crear(dto, usuario.empresaId!);
  }

  @Patch(":id")
  actualizar(@Param("id") id: string, @Body() dto: UpdateOrdenServicioDto) {
    return this.ordenesServicioService.actualizar(id, dto);
  }

  @Post(":id/asignar")
  asignar(@Param("id") id: string, @Body() dto: AsignarTecnicoDto) {
    return this.ordenesServicioService.asignar(id, dto.tecnicoId);
  }

  @Post(":id/cancelar")
  cancelar(@Param("id") id: string) {
    return this.ordenesServicioService.cancelar(id);
  }
}
