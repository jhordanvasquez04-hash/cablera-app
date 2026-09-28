import { Module } from "@nestjs/common";
import { ContratosController } from "./contratos.controller";
import { ContratosService } from "./contratos.service";
import { ZonasModule } from "../zonas/zonas.module";
import { TiposServicioModule } from "../tipos-servicio/tipos-servicio.module";
import { ClientesModule } from "../clientes/clientes.module";

@Module({
  imports: [ZonasModule, TiposServicioModule, ClientesModule],
  controllers: [ContratosController],
  providers: [ContratosService],
  exports: [ContratosService],
})
export class ContratosModule {}
