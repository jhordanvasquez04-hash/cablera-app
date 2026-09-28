import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { TenantPrismaService, type ScopedPrismaClient } from "../prisma/tenant-prisma.service";
import { ConfiguracionService } from "../configuracion/configuracion.service";
import type { AbrirTurnoDto } from "./dto/abrir-turno.dto";
import type { CerrarTurnoDto } from "./dto/cerrar-turno.dto";

const INCLUDE = {
  usuarioApertura: { select: { id: true, nombre: true } },
  usuarioCierre: { select: { id: true, nombre: true } },
} as const;

/** Modo "apertura_cierre" de Configuracion.modoCaja: arqueo de caja por turno (fusión con
 * Keysls). El otro modo ("resumen", el que ya existía) sigue funcionando exactamente igual —
 * esto es aditivo, una empresa que no lo active nunca ve estos endpoints usados. */
@Injectable()
export class CajaTurnosService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private configuracionService: ConfiguracionService,
  ) {}

  private get prisma(): ScopedPrismaClient {
    return this.tenantPrisma.client;
  }

  listar() {
    return this.prisma.cajaTurno.findMany({ include: INCLUDE, orderBy: { fechaApertura: "desc" } });
  }

  turnoAbierto() {
    return this.prisma.cajaTurno.findFirst({ where: { estado: "abierta" }, include: INCLUDE });
  }

  async abrir(dto: AbrirTurnoDto, usuarioId: string, empresaId: string) {
    const configuracion = await this.configuracionService.getConfiguracion(empresaId);
    if (configuracion.modoCaja !== "apertura_cierre") {
      throw new BadRequestException("Esta empresa no usa el modo de caja con apertura/cierre (revisa Configuración)");
    }
    const yaAbierto = await this.turnoAbierto();
    if (yaAbierto) {
      throw new BadRequestException("Ya hay un turno de caja abierto");
    }
    return this.prisma.cajaTurno.create({
      data: { usuarioAperturaId: usuarioId, montoInicial: dto.montoInicial, empresaId },
      include: INCLUDE,
    });
  }

  private async obtenerAbierto(id: string) {
    const turno = await this.prisma.cajaTurno.findUnique({ where: { id } });
    if (!turno) {
      throw new NotFoundException("Turno de caja no encontrado");
    }
    if (turno.estado !== "abierta") {
      throw new BadRequestException("Este turno ya está cerrado");
    }
    return turno;
  }

  async cerrar(id: string, dto: CerrarTurnoDto, usuarioId: string) {
    const turno = await this.obtenerAbierto(id);

    // Arqueo en EFECTIVO desde la apertura: lo único que de verdad se "cuenta" al cierre (yape/
    // plin/transferencia no tienen billetes que contar). montoEsperado = inicial + cobros en
    // efectivo + ingresos de caja en efectivo - egresos de caja en efectivo, todo desde la apertura.
    const [boletasEfectivo, movimientosEfectivo] = await Promise.all([
      this.prisma.boleta.aggregate({
        where: { metodoPago: "efectivo", estado: "emitida", fecha: { gte: turno.fechaApertura } },
        _sum: { montoTotal: true },
      }),
      this.prisma.movimientoCaja.findMany({
        where: { metodoPago: "efectivo", fecha: { gte: turno.fechaApertura } },
        select: { tipo: true, monto: true },
      }),
    ]);

    const ingresosCajaEfectivo = movimientosEfectivo.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + m.monto, 0);
    const egresosCajaEfectivo = movimientosEfectivo.filter((m) => m.tipo === "egreso").reduce((s, m) => s + m.monto, 0);
    const montoEsperado = Number(
      (turno.montoInicial + (boletasEfectivo._sum.montoTotal ?? 0) + ingresosCajaEfectivo - egresosCajaEfectivo).toFixed(2),
    );
    const diferencia = Number((dto.montoContado - montoEsperado).toFixed(2));

    return this.prisma.cajaTurno.update({
      where: { id },
      data: {
        estado: "cerrada",
        fechaCierre: new Date(),
        usuarioCierreId: usuarioId,
        montoEsperado,
        montoContado: dto.montoContado,
        diferencia,
        observacion: dto.observacion?.trim() || null,
      },
      include: INCLUDE,
    });
  }
}
