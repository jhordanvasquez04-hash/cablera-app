import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { TenantPrismaService, type ScopedPrismaClient } from "../prisma/tenant-prisma.service";
import type { ReportarGastoDto } from "./dto/reportar-gasto.dto";

type Tx = Prisma.TransactionClient;

@Injectable()
export class GastosReportadosService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  private get prisma(): ScopedPrismaClient {
    return this.tenantPrisma.client;
  }

  reportar(dto: ReportarGastoDto, usuarioId: string, empresaId: string) {
    return this.prisma.gastoReportado.create({
      data: { usuarioId, monto: dto.monto, descripcion: dto.descripcion, empresaId },
      include: { usuario: { select: { id: true, nombre: true } } },
    });
  }

  listar(estado?: "pendiente" | "aprobado" | "rechazado") {
    return this.prisma.gastoReportado.findMany({
      where: { estado: estado || undefined },
      include: { usuario: { select: { id: true, nombre: true } } },
      orderBy: { fecha: "desc" },
    });
  }

  async aprobar(id: string, metodoPago: "efectivo" | "yape" | "plin" | "transferencia", empresaId: string) {
    // Ver el comentario equivalente en boletas.service.ts sobre el cast de $transaction().
    return this.prisma.$transaction(async (txExt) => {
      const tx = txExt as unknown as Tx;
      const gasto = await tx.gastoReportado.findFirst({ where: { id, empresaId } });
      if (!gasto) throw new NotFoundException("Gasto reportado no encontrado");
      if (gasto.estado !== "pendiente") throw new BadRequestException("Este gasto ya fue procesado");

      const movimiento = await tx.movimientoCaja.create({
        data: {
          tipo: "egreso",
          fecha: gasto.fecha,
          monto: gasto.monto,
          metodoPago,
          descripcion: gasto.descripcion,
          empresaId,
        },
      });

      return tx.gastoReportado.update({
        where: { id },
        data: { estado: "aprobado", movimientoCajaId: movimiento.id },
        include: { usuario: { select: { id: true, nombre: true } } },
      });
    });
  }

  async rechazar(id: string) {
    const gasto = await this.prisma.gastoReportado.findUnique({ where: { id } });
    if (!gasto) throw new NotFoundException("Gasto reportado no encontrado");
    if (gasto.estado !== "pendiente") throw new BadRequestException("Este gasto ya fue procesado");

    return this.prisma.gastoReportado.update({
      where: { id },
      data: { estado: "rechazado" },
      include: { usuario: { select: { id: true, nombre: true } } },
    });
  }
}
