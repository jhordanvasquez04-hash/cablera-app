import { Module } from "@nestjs/common";
import { DescuentosService } from "./descuentos.service";

@Module({
  providers: [DescuentosService],
  exports: [DescuentosService],
})
export class DescuentosModule {}
