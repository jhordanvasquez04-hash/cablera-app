import { Body, Controller, Get, Post } from "@nestjs/common";
import { CategoriasEgresoService } from "./categorias-egreso.service";
import { CreateCategoriaEgresoDto } from "./dto/create-categoria-egreso.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Roles("gestor")
@Controller("categorias-egreso")
export class CategoriasEgresoController {
  constructor(private categoriasEgresoService: CategoriasEgresoService) {}

  @Get()
  listar() {
    return this.categoriasEgresoService.listar();
  }

  @Post()
  crear(@Body() dto: CreateCategoriaEgresoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.categoriasEgresoService.crear(dto, usuario.empresaId!);
  }
}
