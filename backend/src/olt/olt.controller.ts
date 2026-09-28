import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { OltService } from "./olt.service";
import { CreateOltDto } from "./dto/create-olt.dto";
import { UpdateOltDto } from "./dto/update-olt.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

// Catálogo de equipos OLT (fibra) — credenciales SSH/Telnet cifradas (ver olt.service.ts).
// Solo gestor: es infraestructura de red, no algo que un cobrador necesite ver. Sin DELETE a
// propósito: borrar un OLT arrastra (Cascade) todo su historial de autorizaciones de ONU.
@Roles("gestor")
@Controller("olt")
export class OltController {
  constructor(private oltService: OltService) {}

  @Get()
  listar() {
    return this.oltService.listar();
  }

  @Post()
  crear(@Body() dto: CreateOltDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.oltService.crear(dto, usuario.empresaId!);
  }

  @Patch(":id")
  actualizar(@Param("id") id: string, @Body() dto: UpdateOltDto) {
    return this.oltService.actualizar(id, dto);
  }
}
