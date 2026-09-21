import { Module } from "@nestjs/common";
import { BoletasController } from "./boletas.controller";
import { BoletasService } from "./boletas.service";
import { CargosModule } from "../cargos/cargos.module";

@Module({
  imports: [CargosModule],
  controllers: [BoletasController],
  providers: [BoletasService],
  exports: [BoletasService],
})
export class BoletasModule {}
