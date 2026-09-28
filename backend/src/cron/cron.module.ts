import { Module } from "@nestjs/common";
import { CronController } from "./cron.controller";
import { GeneracionCargosService } from "./generacion-cargos.service";
import { LimpiezaSesionesService } from "./limpieza-sesiones.service";
import { ConfiguracionModule } from "../configuracion/configuracion.module";
import { DescuentosModule } from "../descuentos/descuentos.module";

@Module({
  imports: [ConfiguracionModule, DescuentosModule],
  controllers: [CronController],
  providers: [GeneracionCargosService, LimpiezaSesionesService],
})
export class CronModule {}
