import { Module } from "@nestjs/common";
import { CobranzaController } from "./cobranza.controller";
import { CobranzaService } from "./cobranza.service";
import { DescuentosModule } from "../descuentos/descuentos.module";

@Module({
  imports: [DescuentosModule],
  controllers: [CobranzaController],
  providers: [CobranzaService],
})
export class CobranzaModule {}
