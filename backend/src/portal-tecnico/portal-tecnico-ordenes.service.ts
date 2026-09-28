import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { EstadoOrdenServicio } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedTecnico } from "../auth/decorators/current-tecnico.decorator";
import type { CompletarOrdenDto } from "./dto/completar-orden.dto";

const INCLUDE = {
  contrato: { select: { id: true, servicioContratado: { select: { cliente: { select: { nombreCompleto: true } } } } } },
  plan: { select: { id: true, nombre: true } },
} as const;

/**
 * Órdenes vistas desde el portal de campo. Usa PrismaService CRUDO a propósito — igual que
 * AdminModule/cron (ver el comentario en tenant-prisma.service.ts) — porque un técnico
 * autenticado no tiene `request.user` (tiene `request.tecnico`, poblado por TecnicoAuthGuard,
 * no por JwtAuthGuard), así que TenantPrismaService no puede resolver su empresaId. Cada
 * consulta acá filtra a mano por empresaId Y tecnicoId — un técnico solo ve/toca SUS órdenes.
 */
@Injectable()
export class PortalTecnicoOrdenesService {
  constructor(private prisma: PrismaService) {}

  listarMisOrdenes(tecnico: AuthenticatedTecnico, estado?: EstadoOrdenServicio) {
    return this.prisma.ordenServicio.findMany({
      where: { empresaId: tecnico.empresaId, tecnicoId: tecnico.tecnicoId, estado: estado || undefined },
      include: INCLUDE,
      orderBy: { fechaServicio: "asc" },
    });
  }

  private async obtenerPropia(id: string, tecnico: AuthenticatedTecnico) {
    const orden = await this.prisma.ordenServicio.findUnique({ where: { id }, include: INCLUDE });
    if (!orden || orden.empresaId !== tecnico.empresaId) {
      throw new NotFoundException("Orden de servicio no encontrada");
    }
    if (orden.tecnicoId !== tecnico.tecnicoId) {
      throw new ForbiddenException("Esta orden no está asignada a tu cuenta");
    }
    return orden;
  }

  async obtener(id: string, tecnico: AuthenticatedTecnico) {
    return this.obtenerPropia(id, tecnico);
  }

  async aceptar(id: string, tecnico: AuthenticatedTecnico) {
    const orden = await this.obtenerPropia(id, tecnico);
    if (orden.estado !== "asignada") {
      throw new BadRequestException("Solo se puede aceptar una orden recién asignada");
    }
    return this.prisma.ordenServicio.update({ where: { id }, data: { fechaAceptacion: new Date() }, include: INCLUDE });
  }

  async iniciar(id: string, tecnico: AuthenticatedTecnico) {
    const orden = await this.obtenerPropia(id, tecnico);
    if (orden.estado !== "asignada") {
      throw new BadRequestException("Solo se puede iniciar una orden asignada");
    }
    return this.prisma.ordenServicio.update({
      where: { id },
      data: { estado: "en_proceso", fechaInicio: new Date() },
      include: INCLUDE,
    });
  }

  async completar(id: string, tecnico: AuthenticatedTecnico, dto: CompletarOrdenDto) {
    const orden = await this.obtenerPropia(id, tecnico);
    if (orden.estado !== "en_proceso") {
      throw new BadRequestException("Solo se puede completar una orden en proceso");
    }

    // Valida ANTES de tocar la base: todos los productos existen (y son de la MISMA empresa —
    // un producto ajeno acá llega como "no existe", igual que en los demás validarX del
    // proyecto) y hay stock suficiente para cada uno.
    const consumos = dto.consumos ?? [];
    const productosPorId = new Map<string, Awaited<ReturnType<typeof this.prisma.producto.findUnique>>>();
    for (const item of consumos) {
      const producto = await this.prisma.producto.findUnique({ where: { id: item.productoId } });
      if (!producto || producto.empresaId !== tecnico.empresaId || !producto.activo) {
        throw new BadRequestException(`El producto ${item.productoId} no existe o no está disponible`);
      }
      const stockActual = producto.esMedible ? (producto.metrosDisponibles ?? 0) : producto.stockTotal;
      if (item.cantidad > stockActual) {
        throw new BadRequestException(`Stock insuficiente de "${producto.nombre}": disponible ${stockActual}, se pidió ${item.cantidad}`);
      }
      productosPorId.set(item.productoId, producto);
    }

    const fechaFin = new Date();
    const tiempoInstalacionMin = orden.fechaInicio
      ? Math.max(0, Math.round((fechaFin.getTime() - orden.fechaInicio.getTime()) / 60_000))
      : null;

    return this.prisma.$transaction(async (tx) => {
      for (const item of consumos) {
        const producto = productosPorId.get(item.productoId)!;
        await tx.producto.update({
          where: { id: item.productoId },
          data: producto.esMedible ? { metrosDisponibles: { decrement: item.cantidad } } : { stockTotal: { decrement: Math.round(item.cantidad) } },
        });
        await tx.ordenConsumo.create({
          data: { ordenId: id, productoId: item.productoId, cantidad: item.cantidad, empresaId: tecnico.empresaId },
        });
      }

      return tx.ordenServicio.update({
        where: { id },
        data: {
          estado: "completada",
          fechaFin,
          tiempoInstalacionMin,
          observacion: dto.observacionFinal ? [orden.observacion, dto.observacionFinal].filter(Boolean).join(" | ") : undefined,
          ipWan: dto.ipWan?.trim() || undefined,
          mascara: dto.mascara?.trim() || undefined,
          gateway: dto.gateway?.trim() || undefined,
          pppoeUsuario: dto.pppoeUsuario?.trim() || undefined,
          pppoePassword: dto.pppoePassword?.trim() || undefined,
          latitud: dto.latitud ?? undefined,
          longitud: dto.longitud ?? undefined,
          precinto: dto.precinto?.trim() || undefined,
        },
        include: INCLUDE,
      });
    });
  }
}
