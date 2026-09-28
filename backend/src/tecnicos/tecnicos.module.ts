import { Module } from "@nestjs/common";
import { TecnicosController } from "./tecnicos.controller";
import { TecnicosService } from "./tecnicos.service";

@Module({
  controllers: [TecnicosController],
  providers: [TecnicosService],
  exports: [TecnicosService],
})
export class TecnicosModule {}
