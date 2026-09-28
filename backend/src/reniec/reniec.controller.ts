import { Controller, Get, Param } from "@nestjs/common";
import { ReniecService } from "./reniec.service";
import { Roles } from "../auth/decorators/roles.decorator";

@Roles("gestor", "cobrador")
@Controller("reniec")
export class ReniecController {
  constructor(private reniecService: ReniecService) {}

  @Get(":dni")
  consultar(@Param("dni") dni: string) {
    return this.reniecService.consultarDni(dni);
  }
}
