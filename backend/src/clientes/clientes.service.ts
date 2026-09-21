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
  direccion?: string | null;
  zonaId: string;
  servicios: CreateServicioContratadoDto[];
  fechaAlta?: Date;
}

const INCLUDE_SERVICIOS = {
  zona: true,
  serviciosContratados: {
    include: {
      tipoServicio: true,
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
    const zona = await clientePrisma.zona.findUnique({ where: { id: datos.zonaId } });
    if (!zona) {
      throw new BadRequestException("La zona indicada no existe");
    }
    if (datos.servicios.length === 0) {
      throw new BadRequestException("El cliente debe tener al menos un servicio contratado");
    }

    const correlativo = await this.zonasService.incrementarCorrelativo(zona.id, clientePrisma);
    const numeroContrato = `${zona.codigo}-${String(correlativo).padStart(4, "0")}`;

    const cliente = await clientePrisma.cliente.create({
      data: {
        numeroContrato,
        dni: datos.dni || null,
        nombreCompleto: datos.nombreCompleto.trim(),
        telefono: datos.telefono || null,
        direccion: datos.direccion || null,
        zonaId: datos.zonaId,
        fechaAlta: datos.fechaAlta ?? new Date(),
        empresaId,
      },
    });

    // create() individual en vez de createMany: createMany no devuelve las filas creadas, y
    // los llamadores (importación desde Excel) necesitan el id de cada servicio recién creado
    // para poder generar sus cargos mensuales iniciales.
    const servicios = await Promise.all(
      datos.servicios.map((servicio) =>
        clientePrisma.servicioContratado.create({
          data: {
            clienteId: cliente.id,
            tipoServicioId: servicio.tipoServicioId,
            montoBase: servicio.montoBase,
            fechaFacturacionOverride: servicio.fechaFacturacionOverride ?? null,
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
    // Transacción explícita: crear el cliente y sus N servicios contratados debe ser
    // todo-o-nada (un cliente sin ningún servicio es un estado inválido).
    // El tipo del `tx` que produce el $transaction del cliente extendido de Prisma no unifica
    // estructuralmente con el alias `Cliente` (ScopedPrismaClient | Prisma.TransactionClient)
    // que espera crearCliente — en runtime es compatible, el cast es solo para TS.
    const cliente = await this.prisma.$transaction((tx) => this.crearCliente(dto, empresaId, tx as unknown as Prisma.TransactionClient));
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

  async agregarServicio(clienteId: string, dto: CreateServicioContratadoDto, empresaId: string) {
    await this.obtener(clienteId);
    await this.prisma.servicioContratado.create({
      data: {
        clienteId,
        tipoServicioId: dto.tipoServicioId,
        montoBase: dto.montoBase,
        fechaFacturacionOverride: dto.fechaFacturacionOverride ?? null,
        empresaId,
      },
    });
    return this.obtener(clienteId);
  }

  async actualizarServicio(clienteId: string, servicioId: string, dto: UpdateServicioContratadoDto) {
    await this.obtenerServicio(clienteId, servicioId);
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
