import { Module } from "@nestjs/common";
import { PortalTecnicoController } from "./portal-tecnico.controller";
import { PortalTecnicoOrdenesService } from "./portal-tecnico-ordenes.service";
import { PortalTecnicoOnusService } from "./portal-tecnico-onus.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  // Necesita AuthModule por TecnicoAuthGuard (que a su vez usa el JwtService configurado ahí).
  imports: [AuthModule],
  controllers: [PortalTecnicoController],
  providers: [PortalTecnicoOrdenesService, PortalTecnicoOnusService],
})
export class PortalTecnicoModule {}
