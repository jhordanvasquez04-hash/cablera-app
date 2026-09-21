import { Injectable } from "@nestjs/common";
import type { MetodoPago } from "@prisma/client";
import { TenantPrismaService, type ScopedPrismaClient } from "../prisma/tenant-prisma.service";
import type { CreateMovimientoDto } from "./dto/create-movimiento.dto";
import type { UpdateMovimientoDto } from "./dto/update-movimiento.dto";

const METODOS_PAGO: MetodoPago[] = ["efectivo", "yape", "plin", "transferencia"];

// Perú no usa horario de verano: el offset es siempre UTC-5, todo el año.
const LIMA_OFFSET_HOURS = 5;

/**
 * Rango del período a consultar. Si el caller no manda `desde`/`hasta`, el corte de "hoy" y del
 * "mes en curso" se calcula explícitamente en hora de Lima (no en la del proceso de Node): así el
 * resumen no cambia si algún día esto corre en un servidor configurado en UTC u otro huso.
 */
function rangoPeriodo(desde?: string, hasta?: string) {
  const limaAhora = new Date(Date.now() - LIMA_OFFSET_HOURS * 60 * 60 * 1000);
  const anio = limaAhora.getUTCFullYear();
  const mes = limaAhora.getUTCMonth();
  const dia = limaAhora.getUTCDate();

  const inicio = desde ? new Date(desde) : new Date(Date.UTC(anio, mes, 1, LIMA_OFFSET_HOURS, 0, 0, 0));
  const fin = hasta ? new Date(hasta) : new Date(Date.UTC(anio, mes, dia + 1, LIMA_OFFSET_HOURS, 0, 0, -1));
  return { inicio, fin };
}

@Injectable()
export class MovimientosCajaService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  private get prisma(): ScopedPrismaClient {
    return this.tenantPrisma.client;
  }

  actualizar(id: string, dto: UpdateMovimientoDto) {
    return this.prisma.movimientoCaja.update({
      where: { id },
      data: {
        fecha: dto.fecha ? new Date(dto.fecha) : undefined,
        monto: dto.monto,
        metodoPago: dto.metodoPago,
        categoriaId: dto.categoriaId !== undefined ? dto.categoriaId || null : undefined,
        descripcion: dto.descripcion,
      },
    });
  }

  eliminar(id: string) {
    return this.prisma.movimientoCaja.delete({ where: { id } });
  }

  /** Ingresos/egresos/neto mes a mes, para la gráfica de tendencia (los últimos `meses`, incluido
   * el actual). Trae boletas + movimientos de todo el rango en dos consultas y agrupa en memoria:
   * más simple y suficientemente rápido que un group-by por mes en SQL para este volumen. */
  async tendencia(meses: number) {
    const limaAhora = new Date(Date.now() - LIMA_OFFSET_HOURS * 60 * 60 * 1000);
    const anioActual = limaAhora.getUTCFullYear();
    const mesActual = limaAhora.getUTCMonth();
    const inicioRango = new Date(Date.UTC(anioActual, mesActual - (meses - 1), 1, LIMA_OFFSET_HOURS, 0, 0, 0));

    const [boletas, movimientos] = await Promise.all([
      this.prisma.boleta.findMany({
        where: { estado: "emitida", fecha: { gte: inicioRango } },
        select: { fecha: true, montoTotal: true },
      }),
      this.prisma.movimientoCaja.findMany({
        where: { fecha: { gte: inicioRango } },
        select: { fecha: true, monto: true, tipo: true },
      }),
    ]);

    const claveMes = (fecha: Date) => {
      const limaFecha = new Date(fecha.getTime() - LIMA_OFFSET_HOURS * 60 * 60 * 1000);
      return `${limaFecha.getUTCFullYear()}-${limaFecha.getUTCMonth()}`;
    };

    const resultado: Array<{ anio: number; mes: number; ingresos: number; egresos: number; neto: number }> = [];
    for (let i = meses - 1; i >= 0; i--) {
      const fechaMes = new Date(Date.UTC(anioActual, mesActual - i, 1));
      const anio = fechaMes.getUTCFullYear();
      const mes = fechaMes.getUTCMonth();
      const clave = `${anio}-${mes}`;

      const ingresosBoletas = boletas.filter((b) => claveMes(b.fecha) === clave).reduce((s, b) => s + b.montoTotal, 0);
      const ingresosManuales = movimientos
        .filter((m) => m.tipo === "ingreso" && claveMes(m.fecha) === clave)
        .reduce((s, m) => s + m.monto, 0);
      const egresos = movimientos
        .filter((m) => m.tipo === "egreso" && claveMes(m.fecha) === clave)
        .reduce((s, m) => s + m.monto, 0);
      const ingresos = ingresosBoletas + ingresosManuales;

      resultado.push({
        anio,
        mes,
        ingresos: Number(ingresos.toFixed(2)),
        egresos: Number(egresos.toFixed(2)),
        neto: Number((ingresos - egresos).toFixed(2)),
      });
    }
    return resultado;
  }

  crear(dto: CreateMovimientoDto, empresaId: string) {
    return this.prisma.movimientoCaja.create({
      data: {
        tipo: dto.tipo,
        fecha: new Date(dto.fecha),
        monto: dto.monto,
        metodoPago: dto.metodoPago,
        categoriaId: dto.categoriaId || null,
        descripcion: dto.descripcion,
        empresaId,
      },
    });
  }

  async listar(desde?: string, hasta?: string) {
    const { inicio, fin } = rangoPeriodo(desde, hasta);
    const movimientos = await this.prisma.movimientoCaja.findMany({
      where: { fecha: { gte: inicio, lte: fin } },
      include: { categoria: true },
      orderBy: { fecha: "desc" },
    });
    // Misma forma que `resumen().egresos`: la app Android espera `categoria` como el nombre (string),
    // no la relación completa de Prisma.
    return movimientos.map((movimiento) => ({
      id: movimiento.id,
      tipo: movimiento.tipo,
      fecha: movimiento.fecha,
      monto: movimiento.monto,
      metodoPago: movimiento.metodoPago,
      categoriaId: movimiento.categoriaId,
      categoria: movimiento.categoria?.nombre ?? null,
      descripcion: movimiento.descripcion,
    }));
  }

  async resumen(desde?: string, hasta?: string) {
    const { inicio, fin } = rangoPeriodo(desde, hasta);

    const [boletas, movimientos] = await Promise.all([
      this.prisma.boleta.findMany({
        where: { estado: "emitida", fecha: { gte: inicio, lte: fin } },
        select: { metodoPago: true, montoTotal: true },
      }),
      this.prisma.movimientoCaja.findMany({
        where: { fecha: { gte: inicio, lte: fin } },
        include: { categoria: true },
        orderBy: { fecha: "desc" },
      }),
    ]);

    const porMetodo = METODOS_PAGO.map((metodo) => {
      const cobrosDelMetodo = boletas.filter((boleta) => boleta.metodoPago === metodo);
      const ingresosManualesDelMetodo = movimientos.filter((m) => m.tipo === "ingreso" && m.metodoPago === metodo);
      return {
        metodo,
        monto:
          cobrosDelMetodo.reduce((s, b) => s + b.montoTotal, 0) +
          ingresosManualesDelMetodo.reduce((s, m) => s + m.monto, 0),
        cantidadCobros: cobrosDelMetodo.length,
      };
    });

    const egresos = movimientos.filter((m) => m.tipo === "egreso");
    const ingresosManuales = movimientos.filter((m) => m.tipo === "ingreso");
    const ingresosTotal =
      boletas.reduce((s, b) => s + b.montoTotal, 0) + ingresosManuales.reduce((s, m) => s + m.monto, 0);
    const egresosTotal = egresos.reduce((s, m) => s + m.monto, 0);

    return {
      desde: inicio,
      hasta: fin,
      porMetodo,
      ingresosTotal: Number(ingresosTotal.toFixed(2)),
      egresosTotal: Number(egresosTotal.toFixed(2)),
      neto: Number((ingresosTotal - egresosTotal).toFixed(2)),
      egresos: egresos.map((egreso) => ({
        id: egreso.id,
        fecha: egreso.fecha,
        monto: egreso.monto,
        metodoPago: egreso.metodoPago,
        categoria: egreso.categoria?.nombre ?? null,
        descripcion: egreso.descripcion,
      })),
    };
  }
}
