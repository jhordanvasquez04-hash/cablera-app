import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { TenantPrismaService, type ScopedPrismaClient } from "../prisma/tenant-prisma.service";
import { generarCodigoZona } from "./zona-codigo.util";
import type { CreateZonaDto } from "./dto/create-zona.dto";
import type { UpdateZonaDto } from "./dto/update-zona.dto";

// Permite que los métodos usados por la importación participen de la misma
// transacción interactiva del cliente que los invoque, en vez de abrir la suya propia.
type Cliente = ScopedPrismaClient | Prisma.TransactionClient;

@Injectable()
export class ZonasService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  private get prisma(): ScopedPrismaClient {
    return this.tenantPrisma.client;
  }

  listar() {
    return this.prisma.zona.findMany({ orderBy: { nombre: "asc" } });
  }

  async obtener(id: string) {
    const zona = await this.prisma.zona.findUnique({ where: { id } });
    if (!zona) {
      throw new NotFoundException("Zona no encontrada");
    }
    return zona;
  }

  async sugerirCodigo(nombre: string) {
    const codigosExistentes = (await this.prisma.zona.findMany({ select: { codigo: true } })).map(
      (zona) => zona.codigo,
    );
    return { codigo: generarCodigoZona(nombre, codigosExistentes) };
  }

  async crear(dto: CreateZonaDto, empresaId: string, cliente: Cliente = this.prisma) {
    const codigosExistentes = (await cliente.zona.findMany({ select: { codigo: true } })).map(
      (zona) => zona.codigo,
    );
    const codigo = (
      dto.codigo?.trim().toUpperCase() || generarCodigoZona(dto.nombre, codigosExistentes)
    ).toUpperCase();

    if (codigosExistentes.map((c) => c.toUpperCase()).includes(codigo)) {
      throw new ConflictException(`Ya existe una zona con el código "${codigo}"`);
    }

    return cliente.zona.create({ data: { nombre: dto.nombre.trim(), codigo, empresaId } });
  }

  async actualizar(id: string, dto: UpdateZonaDto) {
    await this.obtener(id);

    if (dto.codigo) {
      const codigo = dto.codigo.trim().toUpperCase();
      const existente = await this.prisma.zona.findFirst({ where: { codigo } });
      if (existente && existente.id !== id) {
        throw new ConflictException(`Ya existe una zona con el código "${codigo}"`);
      }
    }

    return this.prisma.zona.update({
      where: { id },
      data: {
        nombre: dto.nombre?.trim(),
        codigo: dto.codigo?.trim().toUpperCase(),
      },
    });
  }

  async eliminar(id: string) {
    const zona = await this.prisma.zona.findUnique({
      where: { id },
      include: { _count: { select: { clientes: true } } },
    });
    if (!zona) {
      throw new NotFoundException("Zona no encontrada");
    }
    if (zona._count.clientes > 0) {
      throw new BadRequestException("No se puede eliminar una zona que tiene clientes asociados");
    }
    await this.prisma.zona.delete({ where: { id } });
  }

  /** Usado por la importación: reutiliza la zona si ya existe una con el mismo nombre. */
  async obtenerOCrearPorNombre(nombre: string, empresaId: string, cliente: Cliente = this.prisma) {
    const nombreLimpio = nombre.trim();
    const existente = await cliente.zona.findFirst({ where: { nombre: nombreLimpio, empresaId } });
    if (existente) {
      return { zona: existente, creada: false };
    }
    return { zona: await this.crear({ nombre: nombreLimpio }, empresaId, cliente), creada: true };
  }

  /** Incrementa de forma atómica el correlativo de la zona y devuelve el nuevo valor. */
  async incrementarCorrelativo(zonaId: string, cliente: Cliente = this.prisma): Promise<number> {
    const zona = await cliente.zona.update({
      where: { id: zonaId },
      data: { correlativoActual: { increment: 1 } },
    });
    return zona.correlativoActual;
  }
}
