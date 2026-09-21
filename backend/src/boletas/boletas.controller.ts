import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { BoletasService } from "./boletas.service";
import { RegistrarPagoDto } from "./dto/registrar-pago.dto";
import { AnularBoletaDto } from "./dto/anular-boleta.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("boletas")
export class BoletasController {
  constructor(private boletasService: BoletasService) {}

  @Roles("gestor", "cobrador")
  @Post()
  registrarPago(@Body() dto: RegistrarPagoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.boletasService.registrarPago(dto, usuario.userId, usuario.empresaId!);
  }

  @Roles("gestor", "cobrador")
  @Get()
  listar(@Query("busqueda") busqueda?: string, @Query("clienteId") clienteId?: string) {
    return this.boletasService.listar({ busqueda, clienteId });
  }

  @Roles("gestor", "cobrador")
  @Get(":id")
  obtener(@Param("id") id: string) {
    return this.boletasService.obtener(id);
  }

  @Roles("gestor")
  @Post(":id/anular")
  anular(@Param("id") id: string, @Body() dto: AnularBoletaDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.boletasService.anular(id, dto, usuario.userId, usuario.empresaId!);
  }
}
