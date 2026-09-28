import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import type { TipoServicioRed } from "@prisma/client";
import { PlanesService } from "./planes.service";
import { CreatePlanDto } from "./dto/create-plan.dto";
import { UpdatePlanDto } from "./dto/update-plan.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Roles("gestor")
@Controller("planes")
export class PlanesController {
  constructor(private planesService: PlanesService) {}

  @Roles("gestor", "cobrador")
  @Get()
  listar(@Query("tipoServicio") tipoServicio?: TipoServicioRed, @Query("soloActivos") soloActivos?: string) {
    return this.planesService.listar({ tipoServicio, soloActivos: soloActivos === "true" });
  }

  @Post()
  crear(@Body() dto: CreatePlanDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.planesService.crear(dto, usuario.empresaId!);
  }

  @Patch(":id")
  actualizar(@Param("id") id: string, @Body() dto: UpdatePlanDto) {
    return this.planesService.actualizar(id, dto);
  }
}
