import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { TenantPrismaService, type ScopedPrismaClient } from "../prisma/tenant-prisma.service";
import { DescuentosService } from "../descuentos/descuentos.service";
import { diaEnLima } from "../common/fecha-lima.util";
import type { CrearCargoManualDto } from "./dto/crear-cargo-manual.dto";
import type { AplicarDescuentoCargoDto } from "./dto/aplicar-descuento-cargo.dto";
import type { GenerarCargosDto } from "./dto/generar-cargos.dto";
import type { DescuentoMasivoDto } from "./dto/descuento-masivo.dto";

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
    // Fusión con Keysls: descuento puntual sobre este cargo (ver comentario en el schema, modelo
    // CargoMensual) — si `montoOriginal` es null, el cargo nunca tuvo descuento.
    montoOriginal: cargo.montoOriginal,
    notaDescuento: cargo.notaDescuento,
    tipoServicio: { id: cargo.servicioContratado.tipoServicio.id, nombre: cargo.servicioContratado.tipoServicio.nombre },
  };
}

/** "AAAA-MM" -> {anio, mes}. El DTO ya valida el formato con @Matches, así que acá no vuelve a fallar. */
function parsearPeriodo(periodo: string): { anio: number; mes: number } {
  const [anio, mes] = periodo.split("-").map(Number);
  return { anio, mes };
}

function formatearPeriodo(anio: number, mes: number): string {
  return `${anio}-${String(mes).padStart(2, "0")}`;
}

/** Mes calendario anterior a {anio, mes}, con acarreo de año. */
function mesAnterior(anio: number, mes: number): { anio: number; mes: number } {
  return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}

/** Último instante de {anio, mes} en UTC — para comparar contra fechaAlta (¿ya existía el servicio ese mes?). */
function finDeMes(anio: number, mes: number): Date {
  return new Date(Date.UTC(anio, mes, 0, 23, 59, 59, 999));
}

@Injectable()
export class CargosService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private descuentosService: DescuentosService,
  ) {}

  private get prisma(): ScopedPrismaClient {
    return this.tenantPrisma.client;
  }

  /** Cargos con saldo pendiente (pendiente o parcial) de un cliente, del más antiguo al más reciente. */
  async listarPendientesPorCliente(clienteId: string, empresaId: string, cliente: Cliente = this.prisma) {
    // Ver el comentario en zonas.service.ts sobre por qué se convierte a `tx` antes de usarlo.
    const tx = cliente as Prisma.TransactionClient;
    const cargos = await tx.cargoMensual.findMany({
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
    const tx = cliente as Prisma.TransactionClient;
    const cargo = await tx.cargoMensual.findFirstOrThrow({
      where: { id: cargoId, empresaId },
      include: { pagos: { include: { boleta: true } } },
    });

    const pagado = cargo.pagos
      .filter((pago) => pago.boleta.estado === "emitida")
      .reduce((suma, pago) => suma + pago.montoAplicado, 0);

    const estado = pagado <= 0 ? "pendiente" : pagado >= cargo.montoCorrespondiente ? "pagado" : "parcial";

    if (estado !== cargo.estado) {
      await tx.cargoMensual.update({ where: { id: cargoId }, data: { estado } });
    }
  }

  // ───────────────────────────────────────────────────────────────────────
  // Fusión con Keysls: generación manual de cargos ("Generar cargos del mes"),
  // cargo manual puntual, descuento por cargo y descuento masivo.
  // ───────────────────────────────────────────────────────────────────────

  /**
   * Contratos elegibles para generar cargo: el período actual (si aún no tiene cargo) y, como
   * red de seguridad, el mes inmediato anterior si también quedó sin generar (ej. el cron no
   * corrió ese día). Un mismo servicio puede aparecer dos veces, una por cada período.
   */
  async previaGeneracion(empresaId: string, fecha: Date = new Date()) {
    const { anio, mes } = diaEnLima(fecha);
    const anterior = mesAnterior(anio, mes);
    const periodoActual = formatearPeriodo(anio, mes);

    const servicios = await this.prisma.servicioContratado.findMany({
      where: { estado: "activo", empresaId, cliente: { estadoServicio: "activo" } },
      include: { cliente: true },
    });
    if (servicios.length === 0) return { periodo: periodoActual, contratos: [] };

    const servicioIds = servicios.map((s) => s.id);
    const [cargosExistentes, descuentosVigentes] = await Promise.all([
      this.prisma.cargoMensual.findMany({
        where: {
          servicioContratadoId: { in: servicioIds },
          OR: [
            { anio: anterior.anio, mes: anterior.mes },
            { anio, mes },
          ],
        },
        select: { servicioContratadoId: true, anio: true, mes: true },
      }),
      this.descuentosService.obtenerVigentesPorServicios(servicioIds, fecha),
    ]);

    const yaGenerado = new Set(cargosExistentes.map((c) => `${c.servicioContratadoId}-${c.anio}-${c.mes}`));

    const contratos: { contratoId: string; numero: string; cliente: string; periodo: string; monto: number }[] = [];
    for (const servicio of servicios) {
      const montoEfectivo = this.descuentosService.calcularMontoEfectivo(servicio.montoBase, descuentosVigentes.get(servicio.id));
      const numero = `${servicio.cliente.numeroContrato}-${servicio.numero ?? "?"}`;

      // Atrasado: solo si el servicio ya existía ese mes (no se factura antes de su alta).
      const claveAnterior = `${servicio.id}-${anterior.anio}-${anterior.mes}`;
      if (!yaGenerado.has(claveAnterior) && servicio.fechaAlta <= finDeMes(anterior.anio, anterior.mes)) {
        contratos.push({
          contratoId: servicio.id,
          numero,
          cliente: servicio.cliente.nombreCompleto,
          periodo: formatearPeriodo(anterior.anio, anterior.mes),
          monto: montoEfectivo,
        });
      }

      const claveActual = `${servicio.id}-${anio}-${mes}`;
      if (!yaGenerado.has(claveActual) && servicio.fechaAlta <= finDeMes(anio, mes)) {
        contratos.push({
          contratoId: servicio.id,
          numero,
          cliente: servicio.cliente.nombreCompleto,
          periodo: periodoActual,
          monto: montoEfectivo,
        });
      }
    }

    return { periodo: periodoActual, contratos };
  }

  /** Genera de una vez todos los cargos elegibles (ver previaGeneracion), aplicando exoneraciones/descuentos solo al período actual. */
  async generarManual(empresaId: string, dto: GenerarCargosDto, fecha: Date = new Date()) {
    const preview = await this.previaGeneracion(empresaId, fecha);
    const exonerarIds = new Set(dto.exonerarIds ?? []);
    const descuentos = dto.descuentos ?? {};

    let creados = 0;
    for (const fila of preview.contratos) {
      const { anio, mes } = parsearPeriodo(fila.periodo);
      const esPeriodoActual = fila.periodo === preview.periodo;

      let montoCorrespondiente = fila.monto;
      let montoOriginal: number | null = null;
      let notaDescuento: string | null = null;
      let estado: "pendiente" | "exonerado" = "pendiente";

      if (esPeriodoActual && exonerarIds.has(fila.contratoId)) {
        estado = "exonerado";
        montoOriginal = fila.monto;
        notaDescuento = "Exonerado en la generación mensual";
      } else if (esPeriodoActual && Number(descuentos[fila.contratoId]) > 0) {
        const pct = Number(descuentos[fila.contratoId]);
        montoOriginal = fila.monto;
        montoCorrespondiente = Number((fila.monto * (1 - pct / 100)).toFixed(2));
        notaDescuento = `Descuento ${pct}% en la generación mensual`;
      }

      // Servicio con alcance de tenant, no debería chocar con `empresaId`, pero se busca al
      // cliente dueño igual porque CargoMensual lo denormaliza.
      const servicio = await this.prisma.servicioContratado.findUnique({ where: { id: fila.contratoId } });
      if (!servicio) continue;

      try {
        await this.prisma.cargoMensual.create({
          data: {
            clienteId: servicio.clienteId,
            servicioContratadoId: servicio.id,
            anio,
            mes,
            montoCorrespondiente,
            montoOriginal,
            notaDescuento,
            estado,
            empresaId,
          },
        });
        creados++;
      } catch (error) {
        // P2002: alguien más ya generó este cargo justo antes (ej. doble clic) — se ignora la fila.
        if (!(error instanceof Object && "code" in error && error.code === "P2002")) throw error;
      }
    }

    return { periodo: preview.periodo, creados };
  }

  /** Cargo puntual fuera del ciclo normal (ej. reconexión, mora, cargo por equipo) — no tiene descuento. */
  async crearManual(empresaId: string, dto: CrearCargoManualDto) {
    const servicio = await this.prisma.servicioContratado.findUnique({ where: { id: dto.servicioContratadoId } });
    if (!servicio) throw new BadRequestException("El servicio contratado indicado no existe");

    const { anio, mes } = parsearPeriodo(dto.periodo);
    const existente = await this.prisma.cargoMensual.findUnique({
      where: { servicioContratadoId_anio_mes: { servicioContratadoId: dto.servicioContratadoId, anio, mes } },
    });
    if (existente) throw new BadRequestException("Ese contrato ya tiene un cargo generado para ese período");

    const cargo = await this.prisma.cargoMensual.create({
      data: {
        clienteId: servicio.clienteId,
        servicioContratadoId: dto.servicioContratadoId,
        anio,
        mes,
        montoCorrespondiente: dto.monto,
        estado: "pendiente",
        empresaId,
      },
      include: INCLUDE_CARGO,
    });
    return resumirCargo(cargo);
  }

  private async obtenerCargoPropio(cargoId: string, empresaId: string) {
    const cargo = await this.prisma.cargoMensual.findFirst({ where: { id: cargoId, empresaId }, include: INCLUDE_CARGO });
    if (!cargo) throw new NotFoundException("Cargo no encontrado");
    return cargo;
  }

  /** Descuento % puntual sobre un cargo puntual (reemplaza al anterior si ya tenía uno). */
  async aplicarDescuento(cargoId: string, dto: AplicarDescuentoCargoDto, empresaId: string) {
    const cargo = await this.obtenerCargoPropio(cargoId, empresaId);
    if (cargo.estado !== "pendiente") {
      throw new BadRequestException("Solo se puede aplicar descuento a un cargo pendiente (sin abonos)");
    }

    const base = cargo.montoOriginal ?? cargo.montoCorrespondiente;
    const nuevoMonto = Number((base * (1 - dto.porcentaje / 100)).toFixed(2));

    const actualizado = await this.prisma.cargoMensual.update({
      where: { id: cargoId },
      data: { montoCorrespondiente: nuevoMonto, montoOriginal: base, notaDescuento: `Descuento ${dto.porcentaje}%` },
      include: INCLUDE_CARGO,
    });
    return resumirCargo(actualizado);
  }

  /** Revierte el descuento puntual de un cargo, devolviéndolo a su monto original. */
  async quitarDescuento(cargoId: string, empresaId: string) {
    const cargo = await this.obtenerCargoPropio(cargoId, empresaId);
    if (cargo.montoOriginal == null) {
      throw new BadRequestException("Este cargo no tiene ningún descuento aplicado");
    }

    const actualizado = await this.prisma.cargoMensual.update({
      where: { id: cargoId },
      data: { montoCorrespondiente: cargo.montoOriginal, montoOriginal: null, notaDescuento: null },
      include: INCLUDE_CARGO,
    });
    return resumirCargo(actualizado);
  }

  /** Cuántos cargos pendientes de un período se verían afectados por un descuento masivo, y cuántos ya tienen uno. */
  async descuentoMasivoPreview(empresaId: string, periodo: string) {
    const { anio, mes } = parsearPeriodo(periodo);
    const [cantidad, cantidadConDescuento] = await Promise.all([
      this.prisma.cargoMensual.count({ where: { empresaId, anio, mes, estado: "pendiente" } }),
      this.prisma.cargoMensual.count({ where: { empresaId, anio, mes, estado: "pendiente", montoOriginal: { not: null } } }),
    ]);
    return { cantidad, cantidadConDescuento };
  }

  /** Aplica un % de descuento a TODOS los cargos pendientes (no parciales, no pagados) de un período. */
  async descuentoMasivo(empresaId: string, dto: DescuentoMasivoDto) {
    const { anio, mes } = parsearPeriodo(dto.periodo);
    const cargos = await this.prisma.cargoMensual.findMany({ where: { empresaId, anio, mes, estado: "pendiente" } });
    const nota = dto.motivo?.trim() || `Descuento masivo ${dto.porcentaje}%`;

    await this.prisma.$transaction(
      cargos.map((cargo) => {
        const base = cargo.montoOriginal ?? cargo.montoCorrespondiente;
        const nuevoMonto = Number((base * (1 - dto.porcentaje / 100)).toFixed(2));
        return this.prisma.cargoMensual.update({
          where: { id: cargo.id },
          data: { montoCorrespondiente: nuevoMonto, montoOriginal: base, notaDescuento: nota },
        });
      }),
    );

    return { actualizados: cargos.length, periodo: dto.periodo };
  }

  /** Revierte el descuento masivo de un período: cada cargo vuelve a su monto original. */
  async quitarDescuentoMasivo(empresaId: string, periodo: string) {
    const { anio, mes } = parsearPeriodo(periodo);
    const cargos = await this.prisma.cargoMensual.findMany({
      where: { empresaId, anio, mes, estado: "pendiente", montoOriginal: { not: null } },
    });

    await this.prisma.$transaction(
      cargos.map((cargo) =>
        this.prisma.cargoMensual.update({
          where: { id: cargo.id },
          data: { montoCorrespondiente: cargo.montoOriginal!, montoOriginal: null, notaDescuento: null },
        }),
      ),
    );

    return { revertidos: cargos.length };
  }
}
