import { Body, Controller, Get, Param, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";
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

  // Fusión con Keysls: comprobante de pago en PDF. @Res() sin passthrough porque el PDF se
  // escribe directo al stream de respuesta (doc.pipe(res)) — Nest no debe tocarlo después.
  @Roles("gestor", "cobrador")
  @Get(":id/comprobante")
  comprobante(@Param("id") id: string, @Res() res: Response, @CurrentUser() usuario: AuthenticatedUser) {
    return this.boletasService.generarComprobantePdf(id, usuario.empresaId!, res);
  }

  @Roles("gestor")
  @Post(":id/anular")
  anular(@Param("id") id: string, @Body() dto: AnularBoletaDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.boletasService.anular(id, dto, usuario.userId, usuario.empresaId!);
  }
}
