import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { OnusService } from "./onus.service";
import { CreateOnuDto } from "./dto/create-onu.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Roles("gestor")
@Controller("onus")
export class OnusController {
  constructor(private onusService: OnusService) {}

  @Get()
  listar(@Query("oltId") oltId?: string, @Query("contratoId") contratoId?: string) {
    return this.onusService.listar({ oltId, contratoId });
  }

  @Post()
  crear(@Body() dto: CreateOnuDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.onusService.crear(dto, usuario.empresaId!, usuario.userId);
  }
}
