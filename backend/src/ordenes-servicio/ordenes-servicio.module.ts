import { Module } from "@nestjs/common";
import { OrdenesServicioController } from "./ordenes-servicio.controller";
import { OrdenesServicioService } from "./ordenes-servicio.service";

@Module({
  controllers: [OrdenesServicioController],
  providers: [OrdenesServicioService],
  exports: [OrdenesServicioService],
})
export class OrdenesServicioModule {}
