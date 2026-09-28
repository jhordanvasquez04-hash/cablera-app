import { Module } from "@nestjs/common";
import { CategoriasEgresoController } from "./categorias-egreso.controller";
import { CategoriasEgresoService } from "./categorias-egreso.service";
import { MovimientosCajaController } from "./movimientos-caja.controller";
import { MovimientosCajaService } from "./movimientos-caja.service";
import { GastosReportadosController } from "./gastos-reportados.controller";
import { GastosReportadosService } from "./gastos-reportados.service";
import { CajaTurnosController } from "./caja-turnos.controller";
import { CajaTurnosService } from "./caja-turnos.service";
import { ConfiguracionModule } from "../configuracion/configuracion.module";

@Module({
  imports: [ConfiguracionModule],
  controllers: [CategoriasEgresoController, MovimientosCajaController, GastosReportadosController, CajaTurnosController],
  providers: [CategoriasEgresoService, MovimientosCajaService, GastosReportadosService, CajaTurnosService],
})
export class CajaModule {}
