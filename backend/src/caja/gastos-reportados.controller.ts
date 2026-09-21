import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { GastosReportadosService } from "./gastos-reportados.service";
import { ReportarGastoDto } from "./dto/reportar-gasto.dto";
import { AprobarGastoDto } from "./dto/aprobar-gasto.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("caja/gastos-reportados")
export class GastosReportadosController {
  constructor(private gastosReportadosService: GastosReportadosService) {}

  @Roles("gestor", "cobrador")
  @Post()
  reportar(@Body() dto: ReportarGastoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.gastosReportadosService.reportar(dto, usuario.userId, usuario.empresaId!);
  }

  @Roles("gestor")
  @Get()
  listar(@Query("estado") estado?: "pendiente" | "aprobado" | "rechazado") {
    return this.gastosReportadosService.listar(estado);
  }

  @Roles("gestor")
  @Post(":id/aprobar")
  aprobar(@Param("id") id: string, @Body() dto: AprobarGastoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.gastosReportadosService.aprobar(id, dto.metodoPago, usuario.empresaId!);
  }

  @Roles("gestor")
  @Post(":id/rechazar")
  rechazar(@Param("id") id: string) {
    return this.gastosReportadosService.rechazar(id);
  }
}
