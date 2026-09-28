import { Module } from "@nestjs/common";
import { PuntosRedController } from "./puntos-red.controller";
import { PuntosRedService } from "./puntos-red.service";

@Module({
  controllers: [PuntosRedController],
  providers: [PuntosRedService],
  exports: [PuntosRedService],
})
export class PuntosRedModule {}
