import { Module } from "@nestjs/common";
import { CargosService } from "./cargos.service";

@Module({
  providers: [CargosService],
  exports: [CargosService],
})
export class CargosModule {}
