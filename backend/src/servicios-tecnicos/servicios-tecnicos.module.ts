import { Module } from "@nestjs/common";
import { ServiciosTecnicosController } from "./servicios-tecnicos.controller";
import { ServiciosTecnicosService } from "./servicios-tecnicos.service";

@Module({
  controllers: [ServiciosTecnicosController],
  providers: [ServiciosTecnicosService],
})
export class ServiciosTecnicosModule {}
