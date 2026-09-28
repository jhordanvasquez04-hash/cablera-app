import { Module } from "@nestjs/common";
import { MetodosPagoEmpresaController } from "./metodos-pago-empresa.controller";
import { MetodosPagoEmpresaService } from "./metodos-pago-empresa.service";

@Module({
  controllers: [MetodosPagoEmpresaController],
  providers: [MetodosPagoEmpresaService],
})
export class MetodosPagoEmpresaModule {}
