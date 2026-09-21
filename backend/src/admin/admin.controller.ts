import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { CreateEmpresaDto } from "./dto/create-empresa.dto";
import { Roles } from "../auth/decorators/roles.decorator";

// Panel proveedor externo: fuera de cualquier empresa/tenant, solo super_admin.
@Roles("super_admin")
@Controller("admin")
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get("empresas")
  listarEmpresas() {
    return this.adminService.listarEmpresas();
  }

  @Post("empresas")
  crearEmpresa(@Body() dto: CreateEmpresaDto) {
    return this.adminService.crearEmpresa(dto);
  }

  @Post("empresas/:id/activar")
  activar(@Param("id") id: string) {
    return this.adminService.activar(id);
  }

  @Post("empresas/:id/suspender")
  suspender(@Param("id") id: string) {
    return this.adminService.suspender(id);
  }
}
