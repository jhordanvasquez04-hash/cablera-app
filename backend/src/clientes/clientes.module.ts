import { Module } from "@nestjs/common";
import { ClientesController } from "./clientes.controller";
import { ClientesService } from "./clientes.service";
import { ZonasModule } from "../zonas/zonas.module";
import { CargosModule } from "../cargos/cargos.module";
import { BoletasModule } from "../boletas/boletas.module";
import { DescuentosModule } from "../descuentos/descuentos.module";

@Module({
  imports: [ZonasModule, CargosModule, BoletasModule, DescuentosModule],
  controllers: [ClientesController],
  providers: [ClientesService],
  exports: [ClientesService],
})
export class ClientesModule {}
