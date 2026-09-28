import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { MetodosPagoEmpresaService } from "./metodos-pago-empresa.service";
import { CreateMetodoPagoEmpresaDto } from "./dto/create-metodo-pago-empresa.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Roles("gestor")
@Controller("metodos-pago-empresa")
export class MetodosPagoEmpresaController {
  constructor(private service: MetodosPagoEmpresaService) {}

  // Cobrador también puede ver esta lista: la usa para decirle al cliente a qué cuenta
  // transferir cuando paga por Yape/Plin/banco.
  @Roles("gestor", "cobrador")
  @Get()
  listar() {
    return this.service.listar();
  }

  @Post()
  crear(@Body() dto: CreateMetodoPagoEmpresaDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.service.crear(dto, usuario.empresaId!);
  }

  @Delete(":id")
  eliminar(@Param("id") id: string) {
    return this.service.eliminar(id);
  }
}
