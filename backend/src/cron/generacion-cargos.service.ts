import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { ConfiguracionService } from "../configuracion/configuracion.service";
import { DescuentosService } from "../descuentos/descuentos.service";
import { diaEnLima } from "../common/fecha-lima.util";

export interface ResumenGeneracionCargos {
  fecha: string;
  empresasEvaluadas: number;
  serviciosEvaluados: number;
  cargosCreados: number;
}

interface ResumenPorEmpresa {
  empresaId: string;
  fecha: string;
  serviciosEvaluados: number;
  cargosCreados: number;
}

@Injectable()
export class GeneracionCargosService {
  private readonly logger = new Logger(GeneracionCargosService.name);

  constructor(
    private prisma: PrismaService,
    private configuracionService: ConfiguracionService,
    private descuentosService: DescuentosService,
  ) {}

  // Todos los días a la 1 a.m.: genera el cargo mensual de cada cliente activo, de CADA
  // empresa activa, cuya fecha de facturación (propia o la global de esa empresa) sea hoy.
  @Cron("0 1 * * *")
  async cronDiario() {
    const resumen = await this.generarCargosDelDia();
    this.logger.log(
      `Generación automática de cargos: ${resumen.cargosCreados} cargo(s) nuevo(s) de ${resumen.serviciosEvaluados} servicio(s) activos en ${resumen.empresasEvaluadas} empresa(s)`,
    );
  }

  async generarCargosDelDia(fecha: Date = new Date()): Promise<ResumenGeneracionCargos> {
    const empresasActivas = await this.prisma.empresa.findMany({ where: { estado: "activa" } });

    const porEmpresa: ResumenPorEmpresa[] = [];
    for (const empresa of empresasActivas) {
      porEmpresa.push(await this.generarCargosDelDiaParaEmpresa(empresa.id, fecha));
    }

    return {
      fecha: fecha.toISOString(),
      empresasEvaluadas: empresasActivas.length,
      serviciosEvaluados: porEmpresa.reduce((suma, r) => suma + r.serviciosEvaluados, 0),
      cargosCreados: porEmpresa.reduce((suma, r) => suma + r.cargosCreados, 0),
    };
  }

  private async generarCargosDelDiaParaEmpresa(empresaId: string, fecha: Date): Promise<ResumenPorEmpresa> {
    const configuracion = await this.configuracionService.getConfiguracion(empresaId);
    const { anio, mes, dia } = diaEnLima(fecha);

    // Solo se factura un servicio si tanto él como el cliente dueño siguen activos —
    // un cliente suspendido/retirado no genera cargos nuevos aunque algún servicio suyo
    // siga marcado "activo" individualmente.
    const serviciosActivos = await this.prisma.servicioContratado.findMany({
      where: { estado: "activo", empresaId, cliente: { estadoServicio: "activo" } },
    });
    const serviciosDelDia = serviciosActivos.filter(
      (servicio) => (servicio.fechaFacturacionOverride ?? configuracion.fechaFacturacionGlobal) === dia,
    );

    let cargosCreados = 0;

    for (const servicio of serviciosDelDia) {
      const existente = await this.prisma.cargoMensual.findUnique({
        where: { servicioContratadoId_anio_mes: { servicioContratadoId: servicio.id, anio, mes } },
      });
      if (existente) continue;

      const descuentoVigente = await this.descuentosService.obtenerVigente(servicio.id, fecha);
      const montoCorrespondiente = this.descuentosService.calcularMontoEfectivo(servicio.montoBase, descuentoVigente);

      await this.prisma.cargoMensual.create({
        data: {
          clienteId: servicio.clienteId,
          servicioContratadoId: servicio.id,
          anio,
          mes,
          montoCorrespondiente,
          estado: "pendiente",
          empresaId,
        },
      });
      cargosCreados++;
    }

    return { empresaId, fecha: fecha.toISOString(), serviciosEvaluados: serviciosDelDia.length, cargosCreados };
  }
}
