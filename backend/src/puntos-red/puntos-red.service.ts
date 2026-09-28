import { BadRequestException, Injectable } from "@nestjs/common";
import { TenantPrismaService, type ScopedPrismaClient } from "../prisma/tenant-prisma.service";
import type { CreatePuntoRedDto } from "./dto/create-punto-red.dto";
import type { UpdatePuntoRedDto } from "./dto/update-punto-red.dto";

@Injectable()
export class PuntosRedService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  private get prisma(): ScopedPrismaClient {
    return this.tenantPrisma.client;
  }

  listar() {
    return this.prisma.puntoRed.findMany({ orderBy: { createdAt: "desc" } });
  }

  /** Valida que, si viene un napId, apunte a una NAP real de ESTA empresa (el cliente con
   * alcance de tenant filtra automáticamente cualquier id de otra empresa como "no existe") y
   * que no sea el propio punto (una CTO no puede colgar de sí misma). */
  private async validarNap(tipo: string, napId: string | null | undefined, idPropio: string | null) {
    if (tipo !== "cto" || !napId) return null;
    if (napId === idPropio) throw new BadRequestException("Una CTO no puede conectarse a sí misma");
    const nap = await this.prisma.puntoRed.findUnique({ where: { id: napId } });
    if (!nap) throw new BadRequestException("La NAP indicada no existe");
    if (nap.tipo !== "nap") throw new BadRequestException("El punto indicado no es una NAP");
    return napId;
  }

  async crear(dto: CreatePuntoRedDto, empresaId: string) {
    const napId = await this.validarNap(dto.tipo, dto.napId, null);
    return this.prisma.puntoRed.create({
      data: {
        tipo: dto.tipo,
        codigo: dto.codigo.trim().toUpperCase(),
        latitud: dto.latitud,
        longitud: dto.longitud,
        capacidad: dto.capacidad ?? null,
        ocupados: dto.ocupados ?? 0,
        estado: dto.estado ?? "activa",
        direccion: dto.direccion?.trim() || null,
        notas: dto.notas?.trim() || null,
        // Una NAP nunca cuelga de otra: si tipo = "nap", napId se ignora aunque venga en el body.
        napId: dto.tipo === "cto" ? napId : null,
        empresaId,
      },
    });
  }

  async actualizar(id: string, dto: UpdatePuntoRedDto) {
    const tipoFinal = dto.tipo ?? (await this.prisma.puntoRed.findUniqueOrThrow({ where: { id } })).tipo;
    const napId = dto.napId !== undefined ? await this.validarNap(tipoFinal, dto.napId, id) : undefined;

    return this.prisma.puntoRed.update({
      where: { id },
      data: {
        tipo: dto.tipo,
        codigo: dto.codigo?.trim().toUpperCase(),
        latitud: dto.latitud,
        longitud: dto.longitud,
        capacidad: dto.capacidad,
        ocupados: dto.ocupados,
        estado: dto.estado,
        direccion: dto.direccion?.trim(),
        notas: dto.notas?.trim(),
        napId: tipoFinal === "cto" ? napId : dto.tipo === "nap" ? null : undefined,
      },
    });
  }

  // A diferencia de Cliente/Usuario, sí se borra de verdad: nada financiero ni auditable
  // depende de un punto de red, y las CTOs/Contratos que colgaban de él simplemente quedan
  // sin esa referencia (onDelete: SetNull en el esquema), no se rompe nada.
  eliminar(id: string) {
    return this.prisma.puntoRed.delete({ where: { id } });
  }
}
