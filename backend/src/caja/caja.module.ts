import { Module } from "@nestjs/common";
import { CategoriasEgresoController } from "./categorias-egreso.controller";
import { CategoriasEgresoService } from "./categorias-egreso.service";
import { MovimientosCajaController } from "./movimientos-caja.controller";
import { MovimientosCajaService } from "./movimientos-caja.service";
import { GastosReportadosController } from "./gastos-reportados.controller";
import { GastosReportadosService } from "./gastos-reportados.service";

@Module({
  controllers: [CategoriasEgresoController, MovimientosCajaController, GastosReportadosController],
  providers: [CategoriasEgresoService, MovimientosCajaService, GastosReportadosService],
})
export class CajaModule {}
