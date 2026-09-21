import { Controller, Post } from "@nestjs/common";
import { GeneracionCargosService } from "./generacion-cargos.service";
import { Roles } from "../auth/decorators/roles.decorator";

// Dispara la generación de cargos para TODAS las empresas activas de la plataforma — ya
// no es una acción de un negocio puntual, así que queda reservada al panel proveedor
// (antes era @Roles("gestor"); con multi-tenant eso dejaría que cualquier gestor de
// cualquier empresa disparara la facturación de las demás).
@Roles("super_admin")
@Controller("cron")
export class CronController {
  constructor(private generacionCargosService: GeneracionCargosService) {}

  @Post("generar-cargos")
  generarCargos() {
    return this.generacionCargosService.generarCargosDelDia();
  }
}
