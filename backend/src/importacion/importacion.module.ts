import { Module } from "@nestjs/common";
import { ImportacionController } from "./importacion.controller";
import { ImportacionService } from "./importacion.service";
import { ZonasModule } from "../zonas/zonas.module";
import { TiposServicioModule } from "../tipos-servicio/tipos-servicio.module";
import { ClientesModule } from "../clientes/clientes.module";

@Module({
  imports: [ZonasModule, TiposServicioModule, ClientesModule],
  controllers: [ImportacionController],
  providers: [ImportacionService],
})
export class ImportacionModule {}
