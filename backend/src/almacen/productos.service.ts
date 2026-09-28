import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { TenantPrismaService, type ScopedPrismaClient } from "../prisma/tenant-prisma.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateProductoDto } from "./dto/create-producto.dto";
import type { UpdateProductoDto } from "./dto/update-producto.dto";
import type { RegistrarMovimientoDto } from "./dto/registrar-movimiento.dto";
import type { CreateVarianteDto } from "./dto/create-variante.dto";

@Injectable()
export class ProductosService {
  // `prisma` crudo solo para el movimiento de stock: la actualización de Producto.stockTotal/
  // metrosDisponibles y el create de MovimientoStock tienen que ir en la MISMA transacción
  // atómica (mismo motivo que el correlativo de Boleta/OrdenServicio).
  constructor(
    private prisma: PrismaService,
    private tenantPrisma: TenantPrismaService,
  ) {}

  private get scoped(): ScopedPrismaClient {
    return this.tenantPrisma.client;
  }

  listar(filtros: { categoria?: string; soloActivos?: boolean }) {
    return this.scoped.producto.findMany({
      where: { categoria: filtros.categoria || undefined, activo: filtros.soloActivos ? true : undefined },
      include: { variantes: true },
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    });
  }

  async obtener(id: string) {
    const producto = await this.scoped.producto.findUnique({ where: { id }, include: { variantes: true } });
    if (!producto) {
      throw new NotFoundException("Producto no encontrado");
    }
    return producto;
  }

  async crear(dto: CreateProductoDto, empresaId: string) {
    if (dto.esMedible && !dto.metrosPorUnidad) {
      throw new BadRequestException("Un producto medible necesita indicar metrosPorUnidad");
    }
    return this.scoped.producto.create({
      data: {
        nombre: dto.nombre.trim(),
        codigo: dto.codigo?.trim() || null,
        categoria: dto.categoria?.trim() || null,
        unidad: dto.unidad?.trim() || null,
        descripcion: dto.descripcion?.trim() || null,
        esMedible: dto.esMedible ?? false,
        metrosPorUnidad: dto.esMedible ? dto.metrosPorUnidad : null,
        metrosDisponibles: dto.esMedible ? 0 : null,
        tieneVariantes: dto.tieneVariantes ?? false,
        stockMinimo: dto.stockMinimo ?? 0,
        empresaId,
      },
    });
  }

  async actualizar(id: string, dto: UpdateProductoDto) {
    await this.obtener(id);
    return this.scoped.producto.update({
      where: { id },
      data: {
        nombre: dto.nombre?.trim(),
        codigo: dto.codigo?.trim(),
        categoria: dto.categoria?.trim(),
        unidad: dto.unidad?.trim(),
        descripcion: dto.descripcion?.trim(),
        stockMinimo: dto.stockMinimo,
        activo: dto.activo,
      },
    });
  }

  listarMovimientos(productoId: string) {
    return this.scoped.movimientoStock.findMany({ where: { productoId }, orderBy: { createdAt: "desc" } });
  }

  async registrarMovimiento(productoId: string, dto: RegistrarMovimientoDto, empresaId: string) {
    const producto = await this.obtener(productoId);

    const stockActual = producto.esMedible ? (producto.metrosDisponibles ?? 0) : producto.stockTotal;
    if (dto.tipo === "salida" && dto.cantidad > stockActual) {
      throw new BadRequestException(`Stock insuficiente: disponible ${stockActual}, se pidió ${dto.cantidad}`);
    }

    const delta = dto.tipo === "entrada" ? dto.cantidad : -dto.cantidad;

    return this.prisma.$transaction(async (tx) => {
      const productoActualizado = await tx.producto.update({
        where: { id: productoId },
        data: producto.esMedible
          ? { metrosDisponibles: { increment: delta } }
          : { stockTotal: { increment: Math.round(delta) } },
      });
      const movimiento = await tx.movimientoStock.create({
        data: {
          productoId,
          tipo: dto.tipo,
          cantidad: dto.cantidad,
          proveedor: dto.proveedor?.trim() || null,
          motivo: dto.motivo?.trim() || null,
          empresaId,
        },
      });
      return { movimiento, producto: productoActualizado };
    });
  }

  listarVariantes(productoId: string) {
    return this.scoped.productoVariante.findMany({ where: { productoId }, orderBy: { createdAt: "asc" } });
  }

  async crearVariante(productoId: string, dto: CreateVarianteDto, empresaId: string) {
    const producto = await this.obtener(productoId);
    if (!producto.tieneVariantes) {
      throw new BadRequestException("Este producto no maneja variantes (tieneVariantes=false)");
    }
    if (!dto.genero?.trim() && !dto.talla?.trim()) {
      throw new BadRequestException("Indica al menos género o talla");
    }
    return this.scoped.productoVariante.create({
      data: {
        productoId,
        genero: dto.genero?.trim() || null,
        talla: dto.talla?.trim() || null,
        codigo: dto.codigo?.trim() || null,
        empresaId,
      },
    });
  }

  eliminarVariante(id: string) {
    return this.scoped.productoVariante.delete({ where: { id } });
  }
}
