import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ContratosService } from "./contratos.service";
import { CreateContratoDto } from "./dto/create-contrato.dto";
import { UpdateContratoDto } from "./dto/update-contrato.dto";
import { DarDeBajaContratoDto } from "./dto/dar-de-baja-contrato.dto";
import { ImportarContratosDto } from "./dto/importar-contratos.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Roles("gestor")
@Controller("contratos")
export class ContratosController {
  constructor(private contratosService: ContratosService) {}

  @Roles("gestor", "cobrador")
  @Get()
  listar() {
    return this.contratosService.listar();
  }

  @Roles("gestor", "cobrador")
  @Get(":id")
  obtener(@Param("id") id: string) {
    return this.contratosService.obtener(id);
  }

  @Post()
  crear(@Body() dto: CreateContratoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.contratosService.crear(dto, usuario.empresaId!);
  }

  // Fusión con Keysls: importación masiva desde la plantilla de Excel (mismo shape que
  // contratos.controller.js#importarLote — ver ImportarContratosDto).
  @Post("importar")
  importar(@Body() dto: ImportarContratosDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.contratosService.importarLote(dto.filas, usuario.empresaId!);
  }

  @Patch(":id")
  actualizar(@Param("id") id: string, @Body() dto: UpdateContratoDto) {
    return this.contratosService.actualizar(id, dto);
  }

  @Post(":id/suspender")
  suspender(@Param("id") id: string) {
    return this.contratosService.suspender(id);
  }

  @Post(":id/activar")
  activar(@Param("id") id: string) {
    return this.contratosService.activar(id);
  }

  @Post(":id/cortar")
  cortar(@Param("id") id: string) {
    return this.contratosService.cortar(id);
  }

  @Post(":id/baja")
  darDeBaja(@Param("id") id: string, @Body() dto: DarDeBajaContratoDto) {
    return this.contratosService.darDeBaja(id, dto.motivo);
  }
}
