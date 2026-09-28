import { Module } from "@nestjs/common";
import { CargosService } from "./cargos.service";
import { CargosController } from "./cargos.controller";
import { DescuentosModule } from "../descuentos/descuentos.module";

@Module({
  imports: [DescuentosModule],
  controllers: [CargosController],
  providers: [CargosService],
  exports: [CargosService],
})
export class CargosModule {}
