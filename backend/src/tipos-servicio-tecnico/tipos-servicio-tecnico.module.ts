import { Module } from "@nestjs/common";
import { TiposServicioTecnicoController } from "./tipos-servicio-tecnico.controller";
import { TiposServicioTecnicoService } from "./tipos-servicio-tecnico.service";

@Module({
  controllers: [TiposServicioTecnicoController],
  providers: [TiposServicioTecnicoService],
  exports: [TiposServicioTecnicoService],
})
export class TiposServicioTecnicoModule {}
