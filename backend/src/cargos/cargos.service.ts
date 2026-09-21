import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { TenantPrismaService, type ScopedPrismaClient } from "../prisma/tenant-prisma.service";

type Cliente = ScopedPrismaClient | Prisma.TransactionClient;

const INCLUDE_CARGO = {
  pagos: { include: { boleta: true } },
  servicioContratado: { include: { tipoServicio: true } },
} satisfies Prisma.CargoMensualInclude;

type CargoConPagos = Prisma.CargoMensualGetPayload<{ include: typeof INCLUDE_CARGO }>;

function resumirCargo(cargo: CargoConPagos) {
  const pagado = cargo.pagos
    .filter((pago) => pago.boleta.estado === "emitida")
    .reduce((suma, pago) => suma + pago.montoAplicado, 0);

  return {
    id: cargo.id,
    anio: cargo.anio,
    mes: cargo.mes,
    montoCorrespondiente: cargo.montoCorrespondiente,
    montoPagado: pagado,
    saldo: Number((cargo.montoCorrespondiente - pagado).toFixed(2)),
    estado: cargo.estado,
    servicioContratadoId: cargo.servicioContratadoId,
    tipoServicio: { id: cargo.servicioContratado.tipoServicio.id, nombre: cargo.servicioContratado.tipoServicio.nombre },
  };
}

@Injectable()
export class CargosService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  private get prisma(): ScopedPrismaClient {
    return this.tenantPrisma.client;
  }

  /** Cargos con saldo pendiente (pendiente o parcial) de un cliente, del más antiguo al más reciente. */
  async listarPendientesPorCliente(clienteId: string, empresaId: string, cliente: Cliente = this.prisma) {
    const cargos = await cliente.cargoMensual.findMany({
      where: { clienteId, estado: { in: ["pendiente", "parcial"] }, empresaId },
      include: INCLUDE_CARGO,
      orderBy: [{ anio: "asc" }, { mes: "asc" }],
    });

    return cargos.map(resumirCargo);
  }

  /** Todos los cargos de un cliente (para la vista "deuda mes a mes" de su ficha), del más antiguo al más reciente. */
  async listarTodosPorCliente(clienteId: string, empresaId: string) {
    const cargos = await this.prisma.cargoMensual.findMany({
      where: { clienteId, empresaId },
      include: INCLUDE_CARGO,
      orderBy: [{ anio: "asc" }, { mes: "asc" }],
    });

    return cargos.map(resumirCargo);
  }

  /** Recalcula el estado de un cargo a partir de la suma de sus pagos vigentes (no anulados). */
  async recalcularEstado(cargoId: string, empresaId: string, cliente: Cliente = this.prisma) {
    const cargo = await cliente.cargoMensual.findFirstOrThrow({
      where: { id: cargoId, empresaId },
      include: { pagos: { include: { boleta: true } } },
    });

    const pagado = cargo.pagos
      .filter((pago) => pago.boleta.estado === "emitida")
      .reduce((suma, pago) => suma + pago.montoAplicado, 0);

    const estado = pagado <= 0 ? "pendiente" : pagado >= cargo.montoCorrespondiente ? "pagado" : "parcial";

    if (estado !== cargo.estado) {
      await cliente.cargoMensual.update({ where: { id: cargoId }, data: { estado } });
    }
  }
}
