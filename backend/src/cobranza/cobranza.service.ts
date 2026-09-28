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
        serviciosContratados: { where: { estado: "activo" }, include: { tipoServicio: true } },
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

    // Fusión con Keysls: lo que se cobra mes a mes es CADA CONTRATO (ServicioContratado), no el
    // cliente como bloque — un cliente con 2 contratos puede tener uno al día y otro con deuda.
    // Misma fuente de datos que `filas` (ya cargada arriba), solo agrupada por servicio en vez
    // de por cliente.
    const contratos = clientes
      .flatMap((cliente) =>
        cliente.serviciosContratados.map((servicio) => {
          const cargosDelServicio = cliente.cargos.filter((c) => c.servicioContratadoId === servicio.id);
          const deudaTotal = cargosDelServicio.reduce((suma, cargo) => {
            const pagado = cargo.pagos.reduce((s, pago) => s + pago.montoAplicado, 0);
            return suma + (cargo.montoCorrespondiente - pagado);
          }, 0);
          const montoEfectivo = this.descuentosService.calcularMontoEfectivo(servicio.montoBase, descuentosVigentes.get(servicio.id));

          return {
            servicioContratadoId: servicio.id,
            clienteId: cliente.id,
            clienteNombre: cliente.nombreCompleto,
            dni: cliente.dni,
            telefono: cliente.telefono,
            // `numeroContrato` es en realidad el número del CLIENTE (compartido por todos sus
            // contratos) — `numeroServicio` diferencia cada uno, y `numeroCompleto` es lo que se
            // muestra ("ZCE-0003-2"). Ver el comentario en ServicioContratado.numero.
            numeroContrato: cliente.numeroContrato,
            numeroServicio: servicio.numero,
            numeroCompleto: `${cliente.numeroContrato}-${servicio.numero ?? "?"}`,
            zona: { id: cliente.zona.id, nombre: cliente.zona.nombre },
            tipoServicioId: servicio.tipoServicioId,
            tipoServicio: servicio.tipoServicio.nombre,
            montoBase: Number(montoEfectivo.toFixed(2)),
            suspendido: servicio.estado === "suspendido",
            mesesPendientes: agruparPeriodosConsecutivos(cargosDelServicio.map((c) => ({ anio: c.anio, mes: c.mes }))),
            // Fusión con Keysls: cuántos períodos con saldo pendiente tiene este contrato — el
            // texto de arriba ("Ene-Mar 2026") es para mostrar, este número es para filtrar
            // (1 mes / 2 meses / 3+ meses) sin tener que parsear el texto.
            mesesPendientesCount: cargosDelServicio.length,
            deudaTotal: Number(deudaTotal.toFixed(2)),
          };
        }),
      )
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
      contratosConDeudaCount: contratos.length,
      contratos,
    };
  }
}
