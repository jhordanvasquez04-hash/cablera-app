import { Module } from "@nestjs/common";
import { SecretariosController } from "./secretarios.controller";
import { SecretariosService } from "./secretarios.service";

@Module({
  controllers: [SecretariosController],
  providers: [SecretariosService],
  exports: [SecretariosService],
})
export class SecretariosModule {}
