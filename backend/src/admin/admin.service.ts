import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateEmpresaDto } from "./dto/create-empresa.dto";
import type { UpdateEmpresaDto } from "./dto/update-empresa.dto";
import type { RegistrarPagoSuscripcionDto } from "./dto/registrar-pago-suscripcion.dto";
import { importarClientes, type DatosImportacion, type OpcionesImportacion } from "./importar-clientes";

function periodoActual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Único módulo (junto a los cron) con permiso explícito para usar el PrismaService crudo:
// el panel proveedor opera A PROPÓSITO cruzando empresas (listarlas, crearlas, suspenderlas).
@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  /** Bitácora de acciones del super_admin — fusión con Keysls. Solo lo ve el super_admin (no
   * es un dato de negocio de un tenant, por eso ActividadLog NO está en TENANT_SCOPED_MODELS). */
  private registrarActividad(accion: string, detalle?: string, ip?: string, empresaId?: string) {
    return this.prisma.actividadLog.create({ data: { accion, detalle: detalle || null, ip: ip || null, empresaId: empresaId || null } });
  }

  listarActividad(limite = 100) {
    return this.prisma.actividadLog.findMany({
      include: { empresa: { select: { nombre: true } } },
      orderBy: { createdAt: "desc" },
      take: Math.min(limite, 500),
    });
  }

  /** KPIs del dashboard del panel proveedor — fusión con Keysls (superadmin.resumen). */
  async resumen() {
    const periodo = periodoActual();
    const [totalEmpresas, empresasActivas, empresasParaVencidas, pagosDelMes, pagosHistoricos] = await Promise.all([
      this.prisma.empresa.count(),
      this.prisma.empresa.count({ where: { estado: "activa" } }),
      this.prisma.empresa.findMany({ where: { estado: "activa" }, select: { id: true, nombre: true, montoMensual: true } }),
      this.prisma.pagoSuscripcion.findMany({ where: { periodo } }),
      this.prisma.pagoSuscripcion.aggregate({ _sum: { monto: true } }),
    ]);

    const idsAlDia = new Set(pagosDelMes.map((p) => p.empresaId));
    const empresasVencidas = empresasParaVencidas.filter((e) => !idsAlDia.has(e.id));
    const ingresoDelMes = pagosDelMes.reduce((suma, p) => suma + p.monto, 0);

    return {
      totalEmpresas,
      empresasActivas,
      ingresoDelMes,
      ingresoHistorico: pagosHistoricos._sum.monto ?? 0,
      empresasVencidas: empresasVencidas.map((e) => ({ id: e.id, nombre: e.nombre, montoMensual: e.montoMensual })),
      periodo,
    };
  }

  async listarEmpresas() {
    const periodo = periodoActual();
    const [empresas, pagosDelMes] = await Promise.all([
      this.prisma.empresa.findMany({
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { clientes: true, usuarios: true, contratos: true } } },
      }),
      this.prisma.pagoSuscripcion.findMany({ where: { periodo }, select: { empresaId: true } }),
    ]);
    const idsAlDia = new Set(pagosDelMes.map((p) => p.empresaId));

    return empresas.map((empresa) => ({
      id: empresa.id,
      nombre: empresa.nombre,
      slug: empresa.slug,
      estado: empresa.estado,
      ruc: empresa.ruc,
      telefono: empresa.telefono,
      montoMensual: empresa.montoMensual,
      alDia: idsAlDia.has(empresa.id),
      clientesCount: empresa._count.clientes,
      usuariosCount: empresa._count.usuarios,
      contratosCount: empresa._count.contratos,
      createdAt: empresa.createdAt,
    }));
  }

  /** Ficha de una empresa para el panel proveedor: sus usuarios (para poder resetearles la
   * clave) y su historial reciente de pagos de suscripción — fusión con Keysls (obtenerTenant). */
  async obtenerEmpresaDetalle(id: string) {
    const [empresa, alDia] = await Promise.all([
      this.prisma.empresa.findUnique({
        where: { id },
        include: {
          usuarios: { select: { id: true, nombre: true, email: true, rol: true, activo: true, createdAt: true } },
          pagosSuscripcion: { orderBy: { fechaPago: "desc" }, take: 5 },
          _count: { select: { clientes: true, contratos: true } },
        },
      }),
      this.prisma.pagoSuscripcion.findFirst({ where: { empresaId: id, periodo: periodoActual() } }),
    ]);
    if (!empresa) {
      throw new NotFoundException("Empresa no encontrada");
    }
    return { ...empresa, alDia: Boolean(alDia) };
  }

  async crearEmpresa(dto: CreateEmpresaDto, ip?: string) {
    const slugExistente = await this.prisma.empresa.findUnique({ where: { slug: dto.slug } });
    if (slugExistente) {
      throw new ConflictException(`Ya existe una empresa con el slug "${dto.slug}"`);
    }

    const emailExistente = await this.prisma.usuario.findUnique({ where: { email: dto.gestorEmail } });
    if (emailExistente) {
      throw new ConflictException("Ya existe un usuario con ese correo");
    }

    const passwordHash = await bcrypt.hash(dto.gestorPassword, 10);

    const resultado = await this.prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({
        data: { nombre: dto.nombre.trim(), slug: dto.slug.trim().toLowerCase() },
      });

      await tx.configuracion.create({
        data: { nombreEmpresa: empresa.nombre, empresaId: empresa.id },
      });

      const gestor = await tx.usuario.create({
        data: {
          nombre: dto.gestorNombre.trim(),
          email: dto.gestorEmail.trim().toLowerCase(),
          passwordHash,
          rol: "gestor",
          empresaId: empresa.id,
        },
      });

      return {
        empresa: { id: empresa.id, nombre: empresa.nombre, slug: empresa.slug, estado: empresa.estado },
        gestor: { id: gestor.id, nombre: gestor.nombre, email: gestor.email },
      };
    });

    await this.registrarActividad("empresa.crear", `${resultado.empresa.nombre} (${resultado.empresa.slug})`, ip, resultado.empresa.id);
    return resultado;
  }

  private async obtenerEmpresa(id: string) {
    const empresa = await this.prisma.empresa.findUnique({ where: { id } });
    if (!empresa) {
      throw new NotFoundException("Empresa no encontrada");
    }
    return empresa;
  }

  async actualizarEmpresa(id: string, dto: UpdateEmpresaDto, ip?: string) {
    await this.obtenerEmpresa(id);
    const actualizada = await this.prisma.empresa.update({
      where: { id },
      data: {
        nombre: dto.nombre?.trim(),
        ruc: dto.ruc?.trim(),
        direccion: dto.direccion?.trim(),
        telefono: dto.telefono?.trim(),
        agencia: dto.agencia?.trim(),
        montoMensual: dto.montoMensual,
      },
    });
    await this.registrarActividad("empresa.actualizar", actualizada.nombre, ip, id);
    return actualizada;
  }

  /** Reemplaza activar()/suspender() por un solo endpoint de 3 estados (fusión con Keysls:
   * agrega "morosa"). Bloquea el acceso de inmediato — ver el comentario en auth.service.ts. */
  async actualizarEstado(id: string, estado: "activa" | "suspendida" | "morosa", ip?: string) {
    const empresa = await this.obtenerEmpresa(id);
    const actualizada = await this.prisma.empresa.update({ where: { id }, data: { estado } });
    await this.registrarActividad("empresa.estado", `${empresa.nombre}: ${estado}`, ip, id);
    return actualizada;
  }

  /** El super_admin resetea la clave de CUALQUIER usuario de CUALQUIER empresa (soporte al
   * cliente que perdió su clave) — fusión con Keysls. Además de cambiarla, cierra toda sesión
   * abierta de esa cuenta: si el motivo del reseteo es "no confío en este acceso", dejar el
   * token viejo funcionando hasta su vencimiento natural sería contradictorio. */
  async resetearPasswordUsuario(usuarioId: string, password: string, ip?: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) {
      throw new NotFoundException("Usuario no encontrado");
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.$transaction([
      this.prisma.usuario.update({ where: { id: usuarioId }, data: { passwordHash } }),
      this.prisma.tokenSesion.deleteMany({ where: { usuarioId } }),
    ]);
    await this.registrarActividad("usuario.resetear_password", usuario.email, ip, usuario.empresaId ?? undefined);
    return { ok: true };
  }

  async importarClientes(id: string, datos: DatosImportacion, opciones?: OpcionesImportacion) {
    await this.obtenerEmpresa(id);
    return importarClientes(this.prisma, id, datos, opciones);
  }

  // El SaaS cobrándose a sí mismo (fusión con Keysls): historial de cobros de la suscripción de
  // cada empresa cliente de la plataforma. No confundir con Pago (lo que un cliente FINAL le
  // paga a SU cablera) — esto es lo que la empresa le paga a Cablera/Keysls por usar el sistema.
  async registrarPagoSuscripcion(empresaId: string, dto: RegistrarPagoSuscripcionDto, ip?: string) {
    const empresa = await this.obtenerEmpresa(empresaId);
    const pago = await this.prisma.pagoSuscripcion.create({
      data: { empresaId, monto: dto.monto, periodo: dto.periodo.trim(), notas: dto.notas?.trim() || null },
    });
    await this.registrarActividad("suscripcion.pago", `${empresa.nombre}: S/ ${dto.monto} (${dto.periodo})`, ip, empresaId);
    return pago;
  }

  listarPagosSuscripcion(empresaId: string) {
    return this.prisma.pagoSuscripcion.findMany({ where: { empresaId }, orderBy: { fechaPago: "desc" } });
  }

  /** Historial de TODAS las empresas junto (para /admin/pagos) — a diferencia de
   * listarPagosSuscripcion(empresaId), que es el de una sola. */
  listarTodosLosPagos() {
    return this.prisma.pagoSuscripcion.findMany({
      include: { empresa: { select: { nombre: true } } },
      orderBy: { fechaPago: "desc" },
    });
  }

  async eliminarPagoSuscripcion(id: string, ip?: string) {
    const pago = await this.prisma.pagoSuscripcion.findUnique({ where: { id }, include: { empresa: { select: { nombre: true } } } });
    if (!pago) {
      throw new NotFoundException("Pago no encontrado");
    }
    await this.prisma.pagoSuscripcion.delete({ where: { id } });
    await this.registrarActividad("suscripcion.pago_eliminado", `${pago.empresa.nombre}: S/ ${pago.monto} (${pago.periodo})`, ip, pago.empresaId);
    return { ok: true };
  }
}
