import { Controller, Get, Query } from "@nestjs/common";
import { CobranzaService } from "./cobranza.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Roles("gestor", "cobrador")
@Controller("cobranza")
export class CobranzaController {
  constructor(private cobranzaService: CobranzaService) {}

  @Get("resumen")
  resumen(
    @CurrentUser() usuario: AuthenticatedUser,
    @Query("zonaId") zonaId?: string,
    @Query("busqueda") busqueda?: string,
  ) {
    return this.cobranzaService.resumen({ zonaId, busqueda }, usuario.userId);
  }
}
