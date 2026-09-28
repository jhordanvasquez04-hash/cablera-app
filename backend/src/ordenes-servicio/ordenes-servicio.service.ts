import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { EstadoOrdenServicio } from "@prisma/client";
import { TenantPrismaService, type ScopedPrismaClient } from "../prisma/tenant-prisma.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateOrdenServicioDto } from "./dto/create-orden-servicio.dto";
import type { UpdateOrdenServicioDto } from "./dto/update-orden-servicio.dto";

const INCLUDE = {
  tecnico: { select: { id: true, nombre: true, apellido: true } },
  plan: { select: { id: true, nombre: true } },
  contrato: { select: { id: true, servicioContratado: { select: { cliente: { select: { nombreCompleto: true } } } } } },
} as const;

// Estados desde los que ya no tiene sentido seguir editando/reasignando: la orden está cerrada.
const ESTADOS_CERRADOS = ["completada", "cancelada"];

@Injectable()
export class OrdenesServicioService {
  // `prisma` (crudo) solo para el correlativo transaccional (mismo motivo que en
  // boletas.service.ts: la actualización de Empresa.correlativoOrdenServicioActual y el
  // create de la orden tienen que ir en la MISMA transacción atómica).
  constructor(
    private prisma: PrismaService,
    private tenantPrisma: TenantPrismaService,
  ) {}

  private get scoped(): ScopedPrismaClient {
    return this.tenantPrisma.client;
  }

  listar(filtros: { estado?: EstadoOrdenServicio; tecnicoId?: string }) {
    return this.scoped.ordenServicio.findMany({
      where: { estado: filtros.estado || undefined, tecnicoId: filtros.tecnicoId || undefined },
      include: INCLUDE,
      orderBy: { fechaServicio: "desc" },
    });
  }

  async obtener(id: string) {
    const orden = await this.scoped.ordenServicio.findUnique({ where: { id }, include: INCLUDE });
    if (!orden) {
      throw new NotFoundException("Orden de servicio no encontrada");
    }
    return orden;
  }

  private async validarContrato(contratoId: string | null | undefined) {
    if (!contratoId) return null;
    // Alcance de tenant: un contratoId de otra empresa ya llega como "no existe".
    const contrato = await this.scoped.contrato.findUnique({ where: { id: contratoId } });
    if (!contrato) {
      throw new BadRequestException("El contrato indicado no existe");
    }
    return contratoId;
  }

  private async validarTecnico(tecnicoId: string | null | undefined) {
    if (!tecnicoId) return null;
    const tecnico = await this.scoped.tecnico.findUnique({ where: { id: tecnicoId } });
    if (!tecnico || !tecnico.activo) {
      throw new BadRequestException("El técnico indicado no existe o está inactivo");
    }
    return tecnicoId;
  }

  private async validarPlan(planId: string | null | undefined) {
    if (!planId) return null;
    const plan = await this.scoped.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new BadRequestException("El plan indicado no existe");
    }
    return planId;
  }

  async crear(dto: CreateOrdenServicioDto, empresaId: string) {
    await this.validarContrato(dto.contratoId);
    await this.validarTecnico(dto.tecnicoId);
    await this.validarPlan(dto.planId);

    // El número ya no es autoincrement (ver el comentario en boletas.service.ts): se
    // incrementa transaccionalmente sobre Empresa.correlativoOrdenServicioActual.
    return this.prisma.$transaction(async (tx) => {
      const empresaActualizada = await tx.empresa.update({
        where: { id: empresaId },
        data: { correlativoOrdenServicioActual: { increment: 1 } },
      });
      const nServicio = `OS-${String(empresaActualizada.correlativoOrdenServicioActual).padStart(5, "0")}`;

      return tx.ordenServicio.create({
        data: {
          nServicio,
          tipoOrden: dto.tipoOrden,
          tipoServicio: dto.tipoServicio,
          contratoId: dto.contratoId || null,
          fechaServicio: new Date(dto.fechaServicio),
          abonado: dto.abonado.trim(),
          dni: dto.dni?.trim() || null,
          direccion: dto.direccion.trim(),
          referencia: dto.referencia?.trim() || null,
          sector: dto.sector?.trim() || null,
          celular: dto.celular?.trim() || null,
          observacion: dto.observacion?.trim() || null,
          tecnicoId: dto.tecnicoId || null,
          fechaAsignacion: dto.tecnicoId ? new Date() : null,
          estado: dto.tecnicoId ? "asignada" : "pendiente",
          mensualidad: dto.mensualidad ?? null,
          mbps: dto.mbps ?? null,
          planId: dto.planId || null,
          ipWan: dto.ipWan?.trim() || null,
          mascara: dto.mascara?.trim() || null,
          gateway: dto.gateway?.trim() || null,
          pppoeUsuario: dto.pppoeUsuario?.trim() || null,
          pppoePassword: dto.pppoePassword?.trim() || null,
          latitud: dto.latitud ?? null,
          longitud: dto.longitud ?? null,
          precinto: dto.precinto?.trim() || null,
          empresaId,
        },
        include: INCLUDE,
      });
    });
  }

  private async obtenerAbierta(id: string) {
    const orden = await this.obtener(id);
    if (ESTADOS_CERRADOS.includes(orden.estado)) {
      throw new BadRequestException("Esta orden ya está cerrada (completada o cancelada)");
    }
    return orden;
  }

  async actualizar(id: string, dto: UpdateOrdenServicioDto) {
    await this.obtenerAbierta(id);
    await this.validarPlan(dto.planId);

    return this.scoped.ordenServicio.update({
      where: { id },
      data: {
        tipoOrden: dto.tipoOrden,
        tipoServicio: dto.tipoServicio,
        fechaServicio: dto.fechaServicio ? new Date(dto.fechaServicio) : undefined,
        abonado: dto.abonado?.trim(),
        dni: dto.dni?.trim(),
        direccion: dto.direccion?.trim(),
        referencia: dto.referencia?.trim(),
        sector: dto.sector?.trim(),
        celular: dto.celular?.trim(),
        observacion: dto.observacion?.trim(),
        mensualidad: dto.mensualidad,
        mbps: dto.mbps,
        planId: dto.planId,
        ipWan: dto.ipWan?.trim(),
        mascara: dto.mascara?.trim(),
        gateway: dto.gateway?.trim(),
        pppoeUsuario: dto.pppoeUsuario?.trim(),
        pppoePassword: dto.pppoePassword?.trim(),
        latitud: dto.latitud,
        longitud: dto.longitud,
        precinto: dto.precinto?.trim(),
      },
      include: INCLUDE,
    });
  }

  async asignar(id: string, tecnicoId: string) {
    await this.obtenerAbierta(id);
    await this.validarTecnico(tecnicoId);
    return this.scoped.ordenServicio.update({
      where: { id },
      data: { tecnicoId, fechaAsignacion: new Date(), fechaAceptacion: null, estado: "asignada" },
      include: INCLUDE,
    });
  }

  async cancelar(id: string) {
    await this.obtenerAbierta(id);
    return this.scoped.ordenServicio.update({ where: { id }, data: { estado: "cancelada" }, include: INCLUDE });
  }
}
