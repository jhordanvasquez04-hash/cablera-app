import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TenantPrismaService, type ScopedPrismaClient } from "../prisma/tenant-prisma.service";
import { ZonasService } from "../zonas/zonas.service";
import { TiposServicioService } from "../tipos-servicio/tipos-servicio.service";
import { ClientesService } from "../clientes/clientes.service";
import type { CreateContratoDto } from "./dto/create-contrato.dto";
import type { UpdateContratoDto } from "./dto/update-contrato.dto";
import type { ImportarContratoFilaDto } from "./dto/importar-contratos.dto";

// Fusión con Keysls: sinónimos de tipo de servicio que trae la plantilla de Excel, resueltos
// al nombre lowercase del catálogo real de cablera (ver Plan.tipoServicio / TipoServicioRed).
const SINONIMOS_SERVICIO: Record<string, "internet" | "cable" | "duo"> = {
  TV: "cable",
  CATV: "cable",
  CABLE: "cable",
  INTERNET: "internet",
  NET: "internet",
  DUO: "duo",
  DUAL: "duo",
};

interface FilaImportada {
  fila: number;
  numero: string;
}
interface FilaOmitida {
  fila: number;
  motivo: string;
}
export interface ResumenImportacionContratos {
  totalFilas: number;
  creados: number;
  omitidos: FilaOmitida[];
  errores: FilaOmitida[];
}

const INCLUDE = {
  // Fusión con Keysls: faltaba `plan` acá — /clientes ya lo traía (ver INCLUDE_SERVICIOS en
  // clientes.service.ts) pero /contratos no, así que el plan del servicio nunca se veía desde
  // la ficha técnica (ej. en el frontend-keysls, que muestra plan/mbps en el detalle del contrato).
  servicioContratado: { include: { cliente: true, tipoServicio: true, plan: true } },
  puntoRed: true,
  tecnicoInstalador: { select: { id: true, nombre: true, apellido: true } },
  equipoProducto: { select: { id: true, nombre: true, codigo: true } },
} as const;

@Injectable()
export class ContratosService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private zonasService: ZonasService,
    private tiposServicioService: TiposServicioService,
    private clientesService: ClientesService,
  ) {}

  private get prisma(): ScopedPrismaClient {
    return this.tenantPrisma.client;
  }

  listar() {
    return this.prisma.contrato.findMany({ include: INCLUDE, orderBy: { createdAt: "desc" } });
  }

  async obtener(id: string) {
    const contrato = await this.prisma.contrato.findUnique({ where: { id }, include: INCLUDE });
    if (!contrato) {
      throw new NotFoundException("Contrato no encontrado");
    }
    return contrato;
  }

  private async validarPuntoRed(puntoRedId: string | null | undefined) {
    if (!puntoRedId) return;
    // El cliente con alcance de tenant filtra automáticamente cualquier id de otra empresa
    // como "no existe" — así se evita enlazar el contrato a un punto de red ajeno.
    const punto = await this.prisma.puntoRed.findUnique({ where: { id: puntoRedId } });
    if (!punto) {
      throw new BadRequestException("El punto de red indicado no existe");
    }
  }

  private async validarTecnico(tecnicoInstaladorId: string | null | undefined) {
    if (!tecnicoInstaladorId) return;
    // Mismo motivo que validarPuntoRed: el cliente con alcance de tenant ya filtra un técnico
    // de otra empresa como "no existe".
    const tecnico = await this.prisma.tecnico.findUnique({ where: { id: tecnicoInstaladorId } });
    if (!tecnico || !tecnico.activo) {
      throw new BadRequestException("El técnico indicado no existe o está inactivo");
    }
  }

  private async validarEquipo(equipoProductoId: string | null | undefined) {
    if (!equipoProductoId) return;
    // Mismo motivo: el cliente con alcance de tenant ya filtra un producto de otra empresa
    // como "no existe". No descuenta stock acá (esto es solo "qué equipo quedó instalado",
    // no un consumo — el consumo de materiales pasa por completar una OrdenServicio).
    const producto = await this.prisma.producto.findUnique({ where: { id: equipoProductoId } });
    if (!producto || !producto.activo) {
      throw new BadRequestException("El equipo indicado no existe o está inactivo");
    }
  }

  async crear(dto: CreateContratoDto, empresaId: string) {
    // Mismo motivo: si servicioContratadoId es de otra empresa, esta consulta (con alcance de
    // tenant) no lo encuentra — no hace falta comparar empresaId a mano.
    const servicio = await this.prisma.servicioContratado.findUnique({ where: { id: dto.servicioContratadoId } });
    if (!servicio) {
      throw new BadRequestException("El servicio contratado indicado no existe");
    }
    await this.validarPuntoRed(dto.puntoRedId);
    await this.validarTecnico(dto.tecnicoInstaladorId);
    await this.validarEquipo(dto.equipoProductoId);

    const contrato = await this.prisma.contrato.create({
      data: {
        servicioContratadoId: dto.servicioContratadoId,
        direccion: dto.direccion?.trim() || null,
        referencia: dto.referencia?.trim() || null,
        sector: dto.sector?.trim() || null,
        ipWan: dto.ipWan?.trim() || null,
        mascara: dto.mascara?.trim() || null,
        gateway: dto.gateway?.trim() || null,
        pppoeUsuario: dto.pppoeUsuario?.trim() || null,
        pppoePassword: dto.pppoePassword?.trim() || null,
        latitud: dto.latitud ?? null,
        longitud: dto.longitud ?? null,
        precinto: dto.precinto?.trim() || null,
        puntoRedId: dto.puntoRedId || null,
        equipoSerie: dto.equipoSerie?.trim() || null,
        equipoProductoId: dto.equipoProductoId || null,
        fechaInstalacion: dto.fechaInstalacion ? new Date(dto.fechaInstalacion) : null,
        tecnicoInstaladorId: dto.tecnicoInstaladorId || null,
        empresaId,
      },
      include: INCLUDE,
    });
    return contrato;
  }

  async actualizar(id: string, dto: UpdateContratoDto) {
    if (dto.puntoRedId !== undefined) await this.validarPuntoRed(dto.puntoRedId);
    if (dto.tecnicoInstaladorId !== undefined) await this.validarTecnico(dto.tecnicoInstaladorId);
    if (dto.equipoProductoId !== undefined) await this.validarEquipo(dto.equipoProductoId);

    return this.prisma.contrato.update({
      where: { id },
      data: {
        direccion: dto.direccion?.trim(),
        referencia: dto.referencia?.trim(),
        sector: dto.sector?.trim(),
        ipWan: dto.ipWan?.trim(),
        mascara: dto.mascara?.trim(),
        gateway: dto.gateway?.trim(),
        pppoeUsuario: dto.pppoeUsuario?.trim(),
        pppoePassword: dto.pppoePassword?.trim(),
        latitud: dto.latitud,
        longitud: dto.longitud,
        precinto: dto.precinto?.trim(),
        puntoRedId: dto.puntoRedId,
        equipoSerie: dto.equipoSerie?.trim(),
        equipoProductoId: dto.equipoProductoId,
        fechaInstalacion: dto.fechaInstalacion ? new Date(dto.fechaInstalacion) : undefined,
        tecnicoInstaladorId: dto.tecnicoInstaladorId,
      },
      include: INCLUDE,
    });
  }

  suspender(id: string) {
    return this.prisma.contrato.update({ where: { id }, data: { estado: "suspendido" }, include: INCLUDE });
  }

  activar(id: string) {
    return this.prisma.contrato.update({ where: { id }, data: { estado: "activo", fechaCorte: null }, include: INCLUDE });
  }

  cortar(id: string) {
    return this.prisma.contrato.update({ where: { id }, data: { estado: "cortado", fechaCorte: new Date() }, include: INCLUDE });
  }

  darDeBaja(id: string, motivo: string) {
    return this.prisma.contrato.update({
      where: { id },
      data: { estado: "baja", motivoBaja: motivo, fechaBaja: new Date() },
      include: INCLUDE,
    });
  }

  // ───────────────────────────────────────────────────────────────────────
  // Fusión con Keysls: importación masiva desde la plantilla de Excel — mismo criterio y
  // mismos mensajes que contratos.controller.js#importarLote, adaptado a que en cablera un
  // "contrato" importado son en realidad 3 pasos (cliente, servicio contratado, ficha técnica)
  // en vez de uno. No transaccional a propósito, igual que Keysls: cada fila es independiente,
  // así que una fila mala no aborta las demás.
  // ───────────────────────────────────────────────────────────────────────
  async importarLote(filas: ImportarContratoFilaDto[], empresaId: string): Promise<ResumenImportacionContratos> {
    const creados: FilaImportada[] = [];
    const omitidos: FilaOmitida[] = [];
    const errores: FilaOmitida[] = [];

    // Cablera exige zonaId en Cliente (Keysls no) — se reutiliza siempre la misma zona de
    // reserva para los clientes que llegan por Excel, en vez de crear una por fila.
    const { zona: zonaImportados } = await this.zonasService.obtenerOCrearPorNombre("Importados", empresaId);

    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i];
      const numeroFila = i + 2; // +2: fila 1 es el encabezado en el Excel

      try {
        const codigoImportado = String(fila.contrato || "").trim();
        if (!codigoImportado) {
          omitidos.push({ fila: numeroFila, motivo: "Sin número de contrato" });
          continue;
        }

        const yaExiste = await this.prisma.contrato.findFirst({ where: { codigoImportado } });
        if (yaExiste) {
          omitidos.push({ fila: numeroFila, motivo: `El contrato ${codigoImportado} ya existe` });
          continue;
        }

        const tipoNombre = SINONIMOS_SERVICIO[String(fila.tipoServicio || "").trim().toUpperCase()];
        if (!tipoNombre) {
          errores.push({ fila: numeroFila, motivo: `Tipo de servicio inválido: "${fila.tipoServicio ?? ""}"` });
          continue;
        }

        const sector = String(fila.sector || "").trim();
        const direccion = String(fila.direccion || "").trim() || sector || "Sin dirección registrada";

        const abonado = String(fila.abonado || "").trim();
        if (!abonado) {
          errores.push({ fila: numeroFila, motivo: "Falta el nombre del abonado" });
          continue;
        }

        const dni = String(fila.docIdentidad || "").trim() || null;
        const telefono = String(fila.telefono || "").trim() || null;

        const tipoServicio = await this.tiposServicioService.obtenerOCrearPorNombre(tipoNombre, empresaId);

        let plan: { id: string; precio: number } | null = null;
        const nombrePlan = String(fila.nombrePlan || "").trim();
        if (nombrePlan) {
          plan = await this.prisma.plan.findFirst({
            where: { nombre: { equals: nombrePlan, mode: "insensitive" }, tipoServicio: tipoNombre, empresaId },
          });
        }
        // Sin plan que calce, el servicio queda con tarifa 0 y se puede corregir después desde
        // la ficha del cliente — igual que Keysls, que deja costoMensual en null si no hay plan.
        const montoBase = plan?.precio ?? 0;

        let puntoRed: { id: string } | null = null;
        const codigoPunto = String(fila.puntoRed || "").trim();
        if (codigoPunto) {
          puntoRed = await this.prisma.puntoRed.findFirst({ where: { codigo: { equals: codigoPunto, mode: "insensitive" }, empresaId } });
        }

        const diaCorteCrudo = Number(fila.diaCorte);
        const diaCorte = Number.isInteger(diaCorteCrudo) && diaCorteCrudo >= 1 && diaCorteCrudo <= 28 ? diaCorteCrudo : undefined;

        // findFirst (no findUnique): dni no es único a nivel de esquema — mismo motivo que
        // Keysls con dniRuc, solo que ahí sí es una constraint real. Reutilizar el cliente si ya
        // existe permite que un mismo abonado termine con varios contratos, igual que el resto
        // de la app (ver ServicioContratado.numero).
        const clienteExistente = dni ? await this.prisma.cliente.findFirst({ where: { dni } }) : null;

        let servicioContratadoId: string;
        if (clienteExistente) {
          await this.clientesService.agregarServicio(
            clienteExistente.id,
            { tipoServicioId: tipoServicio.id, montoBase, planId: plan?.id, fechaFacturacionOverride: diaCorte },
            empresaId,
          );
          const nuevoServicio = await this.prisma.servicioContratado.findFirst({
            where: { clienteId: clienteExistente.id },
            orderBy: { numero: "desc" },
          });
          servicioContratadoId = nuevoServicio!.id;
        } else {
          const nuevoCliente = await this.clientesService.crearCliente(
            {
              dni,
              nombreCompleto: abonado,
              telefono,
              direccion,
              zonaId: zonaImportados.id,
              servicios: [{ tipoServicioId: tipoServicio.id, montoBase, planId: plan?.id, fechaFacturacionOverride: diaCorte }],
            },
            empresaId,
          );
          servicioContratadoId = nuevoCliente.servicios[0].id;
        }

        const contrato = await this.crear(
          {
            servicioContratadoId,
            direccion,
            referencia: String(fila.referencia || "").trim() || undefined,
            sector: sector || undefined,
            ipWan: String(fila.ipWan || "").trim() || undefined,
            mascara: String(fila.mascara || "").trim() || undefined,
            gateway: String(fila.gateway || "").trim() || undefined,
            pppoeUsuario: String(fila.pppoeUsuario || "").trim() || undefined,
            pppoePassword: String(fila.pppoePassword || "").trim() || undefined,
            precinto: String(fila.cintillo || "").trim() || undefined,
            puntoRedId: puntoRed?.id,
            // Un contrato importado es un cliente que YA estaba instalado en la realidad (no una
            // instalación pendiente) — se marca instalado desde ya, igual que Keysls, para que
            // "Generar cargos del mes" pueda facturarlo con normalidad.
            fechaInstalacion: new Date().toISOString(),
          },
          empresaId,
        );

        await this.prisma.contrato.update({ where: { id: contrato.id }, data: { codigoImportado } });

        creados.push({ fila: numeroFila, numero: codigoImportado });
      } catch (err) {
        const duplicado = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
        const motivo = duplicado
          ? "Ya existe otro contrato con ese código, IP WAN o usuario PPPoE"
          : err instanceof Error
            ? err.message
            : "Error desconocido";
        errores.push({ fila: numeroFila, motivo });
      }
    }

    return { totalFilas: filas.length, creados: creados.length, omitidos, errores };
  }
}
