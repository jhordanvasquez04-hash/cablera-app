import { Module } from "@nestjs/common";
import { TiposServicioController } from "./tipos-servicio.controller";
import { TiposServicioService } from "./tipos-servicio.service";

@Module({
  controllers: [TiposServicioController],
  providers: [TiposServicioService],
  exports: [TiposServicioService],
})
export class TiposServicioModule {}
