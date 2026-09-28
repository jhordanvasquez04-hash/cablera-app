import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { EstadoServicio, Prisma } from "@prisma/client";
import { TenantPrismaService, type ScopedPrismaClient } from "../prisma/tenant-prisma.service";
import { ZonasService } from "../zonas/zonas.service";
import { DescuentosService } from "../descuentos/descuentos.service";
import type { CreateClienteDto } from "./dto/create-cliente.dto";
import type { UpdateClienteDto } from "./dto/update-cliente.dto";
import type { CreateServicioContratadoDto } from "./dto/create-servicio-contratado.dto";
import type { UpdateServicioContratadoDto } from "./dto/update-servicio-contratado.dto";

type Cliente = ScopedPrismaClient | Prisma.TransactionClient;

export interface FiltrosClientes {
  zonaId?: string;
  estado?: EstadoServicio;
  busqueda?: string;
  /** Paginación opcional: si se omiten, `listar` devuelve todos los resultados (compatibilidad
   * con la app Android y el buscador de Registrar pago, que esperan el arreglo completo). */
  pagina?: number;
  porPagina?: number;
}

export interface DatosNuevoCliente {
  dni?: string | null;
  nombreCompleto: string;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  zonaId: string;
  servicios: CreateServicioContratadoDto[];
  fechaAlta?: Date;
}

const INCLUDE_SERVICIOS = {
  zona: true,
  serviciosContratados: {
    include: {
      tipoServicio: true,
      plan: true,
      cargos: { include: { pagos: { include: { boleta: true } } } },
    },
  },
} satisfies Prisma.ClienteInclude;

type ClienteConServicios = Prisma.ClienteGetPayload<{ include: typeof INCLUDE_SERVICIOS }>;

@Injectable()
export class ClientesService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private zonasService: ZonasService,
    private descuentosService: DescuentosService,
  ) {}

  private get prisma(): ScopedPrismaClient {
    return this.tenantPrisma.client;
  }

  async listar(filtros: FiltrosClientes) {
    const where: Prisma.ClienteWhereInput = {
      zonaId: filtros.zonaId || undefined,
      estadoServicio: filtros.estado || undefined,
      ...(filtros.busqueda
        ? {
            OR: [
              { nombreCompleto: { contains: filtros.busqueda, mode: "insensitive" } },
              { dni: { contains: filtros.busqueda, mode: "insensitive" } },
              { numeroContrato: { contains: filtros.busqueda, mode: "insensitive" } },
              { telefono: { contains: filtros.busqueda, mode: "insensitive" } },
              { zona: { nombre: { contains: filtros.busqueda, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const paginado = Boolean(filtros.pagina && filtros.porPagina);
    const total = paginado ? await this.prisma.cliente.count({ where }) : undefined;

    const clientes = await this.prisma.cliente.findMany({
      where,
      include: INCLUDE_SERVICIOS,
      orderBy: { nombreCompleto: "asc" },
      ...(paginado ? { skip: (filtros.pagina! - 1) * filtros.porPagina!, take: filtros.porPagina } : {}),
    });

    const servicioIds = clientes.flatMap((c) => c.serviciosContratados.map((s) => s.id));
    const descuentosVigentes = await this.descuentosService.obtenerVigentesPorServicios(servicioIds);

    const datos = clientes.map((cliente) => this.formatearCliente(cliente, descuentosVigentes));

    return { datos, total };
  }

  /** Única función que arma la respuesta "cliente + resumen financiero por servicio + total".
   * La usan `listar`, `obtener` y (a través de `obtenerConDescuentos`) el resto de las vistas
   * que antes recalculaban esto cada una por su cuenta (ficha, resumen de cobranza). */
  private formatearCliente(cliente: ClienteConServicios, descuentosVigentes: Map<string, { porcentaje: number }>) {
    const { serviciosContratados, ...resto } = cliente;

    let deudaTotal = 0;
    let montoEfectivo = 0;
    const servicios = serviciosContratados.map(({ cargos, ...servicio }) => {
      const deudaServicio = this.calcularDeudaTotal(cargos);
      const descuentoVigente = descuentosVigentes.get(servicio.id) ?? null;
      const montoEfectivoServicio = this.descuentosService.calcularMontoEfectivo(servicio.montoBase, descuentoVigente);
      deudaTotal += deudaServicio;
      if (servicio.estado === "activo") montoEfectivo += montoEfectivoServicio;
      return { ...servicio, montoEfectivo: montoEfectivoServicio, descuentoVigente, deudaTotal: deudaServicio };
    });

    return {
      ...resto,
      serviciosContratados: servicios,
      deudaTotal: Number(deudaTotal.toFixed(2)),
      montoEfectivo: Number(montoEfectivo.toFixed(2)),
      montoBase: Number(servicios.reduce((s, servicio) => s + (servicio.estado === "activo" ? servicio.montoBase : 0), 0).toFixed(2)),
    };
  }

  private calcularDeudaTotal(cargos: Array<{ montoCorrespondiente: number; pagos: Array<{ montoAplicado: number; boleta: { estado: string } }> }>) {
    const deuda = cargos.reduce((suma, cargo) => {
      const pagado = cargo.pagos
        .filter((pago) => pago.boleta.estado === "emitida")
        .reduce((s, pago) => s + pago.montoAplicado, 0);
      return suma + (cargo.montoCorrespondiente - pagado);
    }, 0);
    return Number(deuda.toFixed(2));
  }

  async estadisticas() {
    const conteos = await this.prisma.cliente.groupBy({ by: ["estadoServicio"], _count: true });
    const resultado = { activo: 0, suspendido: 0, retirado: 0 };
    for (const fila of conteos) {
      resultado[fila.estadoServicio] = fila._count;
    }
    return resultado;
  }

  async obtener(id: string) {
    const cliente = await this.prisma.cliente.findUnique({ where: { id }, include: INCLUDE_SERVICIOS });
    if (!cliente) {
      throw new NotFoundException("Cliente no encontrado");
    }
    const descuentosVigentes = await this.descuentosService.obtenerVigentesPorServicios(cliente.serviciosContratados.map((s) => s.id));
    return this.formatearCliente(cliente, descuentosVigentes);
  }

  /** Genera el numeroContrato de forma atómica y crea el cliente + sus servicios contratados. Reutilizado por el CRUD manual y por la importación desde Excel. */
  async crearCliente(datos: DatosNuevoCliente, empresaId: string, clientePrisma: Cliente = this.prisma) {
    // Ver el comentario en zonas.service.ts: con el esquema ya grande, TypeScript deja de poder
    // unificar los overloads de la unión ScopedPrismaClient | Prisma.TransactionClient en cada
    // llamada — se convierte una vez y se usa `tx` en vez del parámetro directamente.
    const tx = clientePrisma as Prisma.TransactionClient;
    const zona = await tx.zona.findUnique({ where: { id: datos.zonaId } });
    if (!zona) {
      throw new BadRequestException("La zona indicada no existe");
    }
    // Fusión con Keysls: un cliente ya NO necesita nacer con un servicio — "un cliente
    // únicamente son sus datos", el servicio real vive en el Contrato, que se crea aparte (ver
    // ContratosService / "Nuevo contrato"). Se mantiene la posibilidad de crear ambos de un tiro
    // (servicios no vacío) para no romper la importación desde Excel, que sí trae servicios ya.

    const correlativo = await this.zonasService.incrementarCorrelativo(zona.id, clientePrisma);
    const numeroContrato = `${zona.codigo}-${String(correlativo).padStart(4, "0")}`;

    const cliente = await tx.cliente.create({
      data: {
        numeroContrato,
        dni: datos.dni || null,
        nombreCompleto: datos.nombreCompleto.trim(),
        telefono: datos.telefono || null,
        email: datos.email || null,
        direccion: datos.direccion || null,
        latitud: datos.latitud ?? null,
        longitud: datos.longitud ?? null,
        zonaId: datos.zonaId,
        fechaAlta: datos.fechaAlta ?? new Date(),
        empresaId,
      },
    });

    // create() individual en vez de createMany: createMany no devuelve las filas creadas, y
    // los llamadores (importación desde Excel) necesitan el id de cada servicio recién creado
    // para poder generar sus cargos mensuales iniciales.
    // Nota: usa `tx`, no `this.validarPlan` (que usa `this.prisma` fuera de la transacción) —
    // mismo motivo que `tx.zona.findUnique` arriba, ver el comentario al inicio del método.
    for (const servicio of datos.servicios) {
      if (!servicio.planId) continue;
      const plan = await tx.plan.findUnique({ where: { id: servicio.planId } });
      if (!plan) {
        throw new BadRequestException("El plan indicado no existe");
      }
    }

    const servicios = await Promise.all(
      datos.servicios.map((servicio, indice) =>
        tx.servicioContratado.create({
          data: {
            clienteId: cliente.id,
            // El cliente es recién creado (0 servicios previos), así que el índice dentro de
            // este mismo arreglo ya es el correlativo correcto — no hay condición de carrera.
            numero: indice + 1,
            tipoServicioId: servicio.tipoServicioId,
            montoBase: servicio.montoBase,
            fechaFacturacionOverride: servicio.fechaFacturacionOverride ?? null,
            planId: servicio.planId ?? null,
            empresaId,
          },
        }),
      ),
    );

    return { ...cliente, servicios };
  }

  // Las mutaciones devuelven el cliente vía obtener() (zona/servicios incluidos +
  // deudaTotal/montoEfectivo calculados) en vez del row crudo de Prisma: la app Android
  // deserializa la respuesta como el mismo ClienteDto que usan las demás vistas.
  async crear(dto: CreateClienteDto, empresaId: string) {
    // Transacción explícita: crear el cliente y sus N servicios contratados (si trae) debe ser
    // todo-o-nada. `servicios` es opcional en el DTO (ver el comentario ahí) — se normaliza a
    // arreglo vacío acá para no propagar el `?` por el resto del método.
    // El tipo del `tx` que produce el $transaction del cliente extendido de Prisma no unifica
    // estructuralmente con el alias `Cliente` (ScopedPrismaClient | Prisma.TransactionClient)
    // que espera crearCliente — en runtime es compatible, el cast es solo para TS.
    const datos = { ...dto, servicios: dto.servicios ?? [] };
    const cliente = await this.prisma.$transaction((tx) => this.crearCliente(datos, empresaId, tx as unknown as Prisma.TransactionClient));
    return this.obtener(cliente.id);
  }

  async actualizar(id: string, dto: UpdateClienteDto) {
    await this.obtener(id);
    await this.prisma.cliente.update({ where: { id }, data: dto });
    return this.obtener(id);
  }

  async darDeBaja(id: string, motivo: string) {
    await this.obtener(id);
    await this.prisma.cliente.update({
      where: { id },
      data: { estadoServicio: "retirado", fechaBaja: new Date(), motivoBaja: motivo },
    });
    return this.obtener(id);
  }

  async suspender(id: string) {
    await this.obtener(id);
    await this.prisma.cliente.update({ where: { id }, data: { estadoServicio: "suspendido" } });
    return this.obtener(id);
  }

  async activar(id: string) {
    await this.obtener(id);
    await this.prisma.cliente.update({ where: { id }, data: { estadoServicio: "activo" } });
    return this.obtener(id);
  }

  private async obtenerServicio(clienteId: string, servicioId: string) {
    const servicio = await this.prisma.servicioContratado.findUnique({ where: { id: servicioId } });
    if (!servicio || servicio.clienteId !== clienteId) {
      throw new NotFoundException("Servicio contratado no encontrado");
    }
    return servicio;
  }

  // Cross-tenant: this.prisma ya está scoped a la empresa actual (ver TenantPrismaService), así
  // que un planId de otra empresa simplemente no aparece — findUnique devuelve null igual que en
  // el resto de validarX de este proyecto.
  private async validarPlan(planId: string | undefined) {
    if (!planId) return;
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new BadRequestException("El plan indicado no existe");
    }
  }

  async agregarServicio(clienteId: string, dto: CreateServicioContratadoDto, empresaId: string) {
    await this.obtener(clienteId);
    await this.validarPlan(dto.planId);
    // Correlativo por cliente (ver el comentario en schema.prisma sobre ServicioContratado.numero)
    // — cuenta cuántos servicios ya tiene, el nuevo es el siguiente.
    const yaTiene = await this.prisma.servicioContratado.count({ where: { clienteId } });
    await this.prisma.servicioContratado.create({
      data: {
        clienteId,
        numero: yaTiene + 1,
        tipoServicioId: dto.tipoServicioId,
        montoBase: dto.montoBase,
        fechaFacturacionOverride: dto.fechaFacturacionOverride ?? null,
        planId: dto.planId ?? null,
        empresaId,
      },
    });
    return this.obtener(clienteId);
  }

  async actualizarServicio(clienteId: string, servicioId: string, dto: UpdateServicioContratadoDto) {
    await this.obtenerServicio(clienteId, servicioId);
    await this.validarPlan(dto.planId);
    await this.prisma.servicioContratado.update({ where: { id: servicioId }, data: dto });
    return this.obtener(clienteId);
  }

  async suspenderServicio(clienteId: string, servicioId: string) {
    await this.obtenerServicio(clienteId, servicioId);
    await this.prisma.servicioContratado.update({ where: { id: servicioId }, data: { estado: "suspendido" } });
    return this.obtener(clienteId);
  }

  async activarServicio(clienteId: string, servicioId: string) {
    await this.obtenerServicio(clienteId, servicioId);
    await this.prisma.servicioContratado.update({ where: { id: servicioId }, data: { estado: "activo" } });
    return this.obtener(clienteId);
  }

  async darDeBajaServicio(clienteId: string, servicioId: string, motivo: string) {
    await this.obtenerServicio(clienteId, servicioId);
    await this.prisma.servicioContratado.update({
      where: { id: servicioId },
      data: { estado: "retirado", fechaBaja: new Date(), motivoBaja: motivo },
    });
    return this.obtener(clienteId);
  }
}
