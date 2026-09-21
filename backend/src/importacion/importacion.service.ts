import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ZonasService } from "../zonas/zonas.service";
import { TiposServicioService } from "../tipos-servicio/tipos-servicio.service";
import { ClientesService } from "../clientes/clientes.service";
import { parsearExcelClientes } from "./excel-clientes.parser";
import { parsearExcelClientesSimple } from "./excel-clientes-simple.parser";

export interface ResumenImportacion {
  zonasCreadas: number;
  clientesCreados: number;
  cargosCreados: number;
  pagosCreados: number;
  avisos: string[];
}

export interface ResumenImportacionSimple {
  zonasCreadas: number;
  clientesCreados: number;
  avisos: string[];
}

@Injectable()
export class ImportacionService {
  constructor(
    private prisma: PrismaService,
    private zonasService: ZonasService,
    private tiposServicioService: TiposServicioService,
    private clientesService: ClientesService,
  ) {}

  async importarClientesDesdeExcel(buffer: Buffer, anio: number, empresaId: string): Promise<ResumenImportacion> {
    const grupos = await parsearExcelClientes(buffer);

    const anioActual = new Date().getFullYear();
    const mesLimite = anio === anioActual ? new Date().getMonth() + 1 : 12;

    const avisos: string[] = [];
    const dniAContratos = new Map<string, string[]>();

    const resumen: ResumenImportacion = {
      zonasCreadas: 0,
      clientesCreados: 0,
      cargosCreados: 0,
      pagosCreados: 0,
      avisos,
    };

    await this.prisma.$transaction(
      async (tx) => {
        const tipoServicioCable = await this.tiposServicioService.obtenerOCrearPorNombre("cable", empresaId, tx);

        for (const grupo of grupos) {
          const { zona, creada } = await this.zonasService.obtenerOCrearPorNombre(grupo.nombreZona, empresaId, tx);
          if (creada) {
            resumen.zonasCreadas++;
          }

          for (const filaCliente of grupo.clientes) {
            const cliente = await this.clientesService.crearCliente(
              {
                dni: filaCliente.dni,
                nombreCompleto: filaCliente.nombreCompleto,
                telefono: filaCliente.telefono,
                zonaId: zona.id,
                servicios: [{ tipoServicioId: tipoServicioCable.id, montoBase: filaCliente.montoBase }],
                fechaAlta: new Date(Date.UTC(anio, 0, 1)),
              },
              empresaId,
              tx,
            );
            const servicioContratadoId = cliente.servicios[0].id;
            resumen.clientesCreados++;

            if (filaCliente.montoBase === 0) {
              avisos.push(`Cliente importado sin tarifa asignada: ${filaCliente.nombreCompleto} (${cliente.numeroContrato})`);
            }

            if (filaCliente.dni) {
              const contratos = dniAContratos.get(filaCliente.dni) ?? [];
              contratos.push(cliente.numeroContrato);
              dniAContratos.set(filaCliente.dni, contratos);
            }

            for (let mes = 1; mes <= mesLimite; mes++) {
              const codigoHistorico = filaCliente.pagosPorMes[mes - 1];
              const pagado = Boolean(codigoHistorico);

              const cargo = await tx.cargoMensual.create({
                data: {
                  clienteId: cliente.id,
                  servicioContratadoId,
                  anio,
                  mes,
                  montoCorrespondiente: filaCliente.montoBase,
                  estado: pagado ? "pagado" : "pendiente",
                  empresaId,
                },
              });
              resumen.cargosCreados++;

              if (pagado) {
                // Ver el comentario equivalente en boletas.service.ts sobre el número transaccional.
                const empresaActualizada = await tx.empresa.update({
                  where: { id: empresaId },
                  data: { correlativoBoletaActual: { increment: 1 } },
                });
                await tx.boleta.create({
                  data: {
                    numero: empresaActualizada.correlativoBoletaActual,
                    clienteId: cliente.id,
                    fecha: new Date(Date.UTC(anio, mes - 1, 1)),
                    metodoPago: "efectivo",
                    montoTotal: filaCliente.montoBase,
                    notasImportacion: codigoHistorico,
                    empresaId,
                    pagos: {
                      create: [{ cargoId: cargo.id, montoAplicado: filaCliente.montoBase, empresaId }],
                    },
                  },
                });
                resumen.pagosCreados++;
              }
            }
          }
        }
      },
      { timeout: 120_000 },
    );

    for (const [dni, contratos] of dniAContratos) {
      if (contratos.length > 1) {
        avisos.push(`DNI duplicado en el Excel (${dni}): contratos ${contratos.join(", ")}`);
      }
    }

    return resumen;
  }

  /**
   * Alta masiva de clientes para una empresa nueva (o para acelerar el llenado en cualquier
   * momento): a diferencia de `importarClientesDesdeExcel`, no espera el formato histórico
   * de PARIAS (zonas por encabezado "CASERIO X", 12 columnas de pagos por mes) — usa una
   * plantilla genérica por encabezados de columna (ver excel-clientes-simple.parser.ts) y
   * solo crea zonas/tipos de servicio/clientes, sin cargos ni boletas: un cliente recién
   * dado de alta no tiene historial de cobranza que migrar, ese se genera hacia adelante
   * con el cron normal de facturación.
   */
  async importarListaClientesDesdeExcel(buffer: Buffer, empresaId: string): Promise<ResumenImportacionSimple> {
    const filas = await parsearExcelClientesSimple(buffer);

    const avisos: string[] = [];
    let zonasCreadas = 0;
    let clientesCreados = 0;

    await this.prisma.$transaction(
      async (tx) => {
        for (const fila of filas) {
          if (!fila.nombreCompleto || !fila.zona || !fila.tipoServicio || fila.montoBase === null) {
            avisos.push(`Fila ${fila.numeroFila}: faltan datos obligatorios (nombre, zona, tipo de servicio o monto), se omitió`);
            continue;
          }

          const { zona, creada: zonaCreada } = await this.zonasService.obtenerOCrearPorNombre(fila.zona, empresaId, tx);
          if (zonaCreada) zonasCreadas++;

          const tipoServicio = await this.tiposServicioService.obtenerOCrearPorNombre(fila.tipoServicio, empresaId, tx);

          await this.clientesService.crearCliente(
            {
              dni: fila.dni,
              nombreCompleto: fila.nombreCompleto,
              telefono: fila.telefono,
              direccion: fila.direccion,
              zonaId: zona.id,
              servicios: [{ tipoServicioId: tipoServicio.id, montoBase: fila.montoBase }],
              fechaAlta: fila.fechaAlta ?? undefined,
            },
            empresaId,
            tx,
          );
          clientesCreados++;
        }
      },
      { timeout: 120_000 },
    );

    return { zonasCreadas, clientesCreados, avisos };
  }
}
