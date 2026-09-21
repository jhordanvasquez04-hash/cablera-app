import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { TenantPrismaService, type ScopedPrismaClient } from "../prisma/tenant-prisma.service";
import { agruparPeriodosConsecutivos } from "../cargos/periodo.util";
import { DescuentosService } from "../descuentos/descuentos.service";

export interface FiltrosCobranza {
  zonaId?: string;
  busqueda?: string;
}

@Injectable()
export class CobranzaService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private descuentosService: DescuentosService,
  ) {}

  private get prisma(): ScopedPrismaClient {
    return this.tenantPrisma.client;
  }

  async resumen(filtros: FiltrosCobranza, usuarioId: string) {
    const ahora = new Date();
    // UTC, no hora local: los cargos/boletas importados desde Excel guardan sus fechas
    // en medianoche UTC del mes correspondiente, así que el corte de "mes actual" debe
    // usar el mismo criterio para no excluir pagos del mes en curso por el huso horario.
    const inicioMes = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1));
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);

    const [cobradoMesAgg, egresosMesAgg, cobradoHoyAgg, cobrosHoyCount] = await Promise.all([
      this.prisma.boleta.aggregate({
        where: { estado: "emitida", fecha: { gte: inicioMes } },
        _sum: { montoTotal: true },
      }),
      this.prisma.movimientoCaja.aggregate({
        where: { tipo: "egreso", fecha: { gte: inicioMes } },
        _sum: { monto: true },
      }),
      this.prisma.boleta.aggregate({
        where: { estado: "emitida", fecha: { gte: inicioHoy }, registradoPorId: usuarioId },
        _sum: { montoTotal: true },
      }),
      this.prisma.boleta.count({
        where: { estado: "emitida", fecha: { gte: inicioHoy }, registradoPorId: usuarioId },
      }),
    ]);

    const where: Prisma.ClienteWhereInput = {
      estadoServicio: { not: "retirado" },
      zonaId: filtros.zonaId || undefined,
      ...(filtros.busqueda
        ? {
            OR: [
              { nombreCompleto: { contains: filtros.busqueda, mode: "insensitive" } },
              { dni: { contains: filtros.busqueda, mode: "insensitive" } },
              { telefono: { contains: filtros.busqueda, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const clientes = await this.prisma.cliente.findMany({
      where,
      include: {
        zona: true,
        cargos: { where: { estado: { in: ["pendiente", "parcial"] } }, include: { pagos: true } },
        serviciosContratados: { where: { estado: "activo" } },
      },
      orderBy: { nombreCompleto: "asc" },
    });

    const servicioIds = clientes.flatMap((c) => c.serviciosContratados.map((s) => s.id));
    const descuentosVigentes = await this.descuentosService.obtenerVigentesPorServicios(servicioIds);

    const filas = clientes
      .map((cliente) => {
        const deudaTotal = cliente.cargos.reduce((suma, cargo) => {
          const pagado = cargo.pagos.reduce((s, pago) => s + pago.montoAplicado, 0);
          return suma + (cargo.montoCorrespondiente - pagado);
        }, 0);

        const montoBase = cliente.serviciosContratados.reduce(
          (suma, servicio) => suma + this.descuentosService.calcularMontoEfectivo(servicio.montoBase, descuentosVigentes.get(servicio.id)),
          0,
        );

        return {
          id: cliente.id,
          numeroContrato: cliente.numeroContrato,
          nombreCompleto: cliente.nombreCompleto,
          dni: cliente.dni,
          telefono: cliente.telefono,
          zona: { id: cliente.zona.id, nombre: cliente.zona.nombre },
          montoBase: Number(montoBase.toFixed(2)),
          suspendido: cliente.estadoServicio === "suspendido",
          mesesPendientes: agruparPeriodosConsecutivos(cliente.cargos.map((c) => ({ anio: c.anio, mes: c.mes }))),
          deudaTotal: Number(deudaTotal.toFixed(2)),
        };
      })
      .filter((fila) => fila.deudaTotal > 0.005);

    const deudaAcumulada = filas.reduce((suma, fila) => suma + fila.deudaTotal, 0);
    const cobradoMes = cobradoMesAgg._sum.montoTotal ?? 0;
    const egresosMes = egresosMesAgg._sum.monto ?? 0;

    return {
      cobradoMes,
      deudaAcumulada: Number(deudaAcumulada.toFixed(2)),
      egresosMes,
      saldoNeto: Number((cobradoMes - egresosMes).toFixed(2)),
      cobradoHoyPorUsuario: cobradoHoyAgg._sum.montoTotal ?? 0,
      cobrosHoyPorUsuarioCount: cobrosHoyCount,
      clientesConDeudaCount: filas.length,
      clientes: filas,
    };
  }
}
