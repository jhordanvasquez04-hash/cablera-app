import type { EstadoServicio, PrismaClient } from "@prisma/client";
import { diaEnLima } from "../common/fecha-lima.util";

export interface ServicioImportado {
  tipoServicio: string;
  montoBase: number;
  fechaFacturacionOverride: number | null;
  estado: EstadoServicio;
  fechaAlta: string;
  fechaBaja: string | null;
  motivoBaja: string | null;
}

export interface ClienteImportado {
  numeroContrato: string;
  dni: string | null;
  nombreCompleto: string;
  telefono: string | null;
  direccion: string | null;
  zonaCodigo: string;
  estadoServicio: EstadoServicio;
  fechaAlta: string;
  fechaBaja: string | null;
  motivoBaja: string | null;
  servicios: ServicioImportado[];
}

export interface DatosImportacion {
  zonas: { nombre: string; codigo: string; correlativoActual: number }[];
  clientes: ClienteImportado[];
}

export interface ResumenImportacionClientes {
  zonasCreadas: number;
  tiposCreados: number;
  clientesCreados: number;
  clientesOmitidos: number;
  cargosCreados: number;
}

export interface OpcionesImportacion {
  /**
   * Además de crear al cliente, le genera de una vez el cargo del mes actual por cada servicio
   * ACTIVO (el mismo cargo que el cron diario crearía en su día de facturación) — para que el
   * cliente aparezca con deuda pendiente desde el primer momento, en vez de con S/ 0 hasta que le
   * toque su próximo ciclo de facturación. Solo aplica a clientes nuevos en esta corrida: uno ya
   * existente (se omite) no recibe un cargo adicional.
   */
  generarCargoInicial?: boolean;
}

// El archivo (respaldo de otro sistema) guarda las fechas en UTC pero sin sufijo de zona horaria.
const aFecha = (valor: string | null): Date | null => {
  if (!valor) return null;
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(valor) ? valor : `${valor}Z`);
};

/**
 * Carga masiva de zonas, tipos de servicio, clientes y servicios contratados para una empresa, a
 * partir de un histórico exportado de otro sistema (ver el formato en `ClienteImportado`).
 *
 * Es idempotente: un cliente cuyo `numeroContrato` ya existe en la empresa se omite (nunca se
 * sobrescribe lo que ya se editó a mano). No genera cargos, boletas ni pagos: los cargos se crean
 * hacia adelante con el cron diario de facturación. La usan tanto el endpoint del panel proveedor
 * (`POST /admin/empresas/:id/importar-clientes`) como el script de línea de comandos
 * `prisma/seed-clientes-parias.ts`, para no mantener la lógica duplicada en dos sitios.
 */
export async function importarClientes(
  prisma: PrismaClient,
  empresaId: string,
  datos: DatosImportacion,
  opciones: OpcionesImportacion = {},
): Promise<ResumenImportacionClientes> {
  const resumen: ResumenImportacionClientes = {
    zonasCreadas: 0,
    tiposCreados: 0,
    clientesCreados: 0,
    clientesOmitidos: 0,
    cargosCreados: 0,
  };
  // Mismo mes para todos los cargos iniciales de esta corrida, calculado una sola vez.
  const { anio: anioActual, mes: mesActual } = diaEnLima(new Date());

  await prisma.$transaction(
    async (tx) => {
      const zonaIdPorCodigo = new Map<string, string>();
      for (const z of datos.zonas) {
        const existente = await tx.zona.findUnique({ where: { empresaId_codigo: { empresaId, codigo: z.codigo } } });
        if (existente) {
          // Nunca se retrocede el correlativo: evitaría contratos duplicados en clientes nuevos.
          if (existente.correlativoActual < z.correlativoActual) {
            await tx.zona.update({ where: { id: existente.id }, data: { correlativoActual: z.correlativoActual } });
          }
          zonaIdPorCodigo.set(z.codigo, existente.id);
        } else {
          const creada = await tx.zona.create({
            data: { nombre: z.nombre, codigo: z.codigo, correlativoActual: z.correlativoActual, empresaId },
          });
          zonaIdPorCodigo.set(z.codigo, creada.id);
          resumen.zonasCreadas++;
        }
      }

      const tipoIdPorNombre = new Map<string, string>();
      const nombresTipo = new Set(datos.clientes.flatMap((c) => c.servicios.map((s) => s.tipoServicio)));
      for (const nombre of nombresTipo) {
        const existente = await tx.tipoServicio.findUnique({ where: { empresaId_nombre: { empresaId, nombre } } });
        if (existente) {
          tipoIdPorNombre.set(nombre, existente.id);
        } else {
          const creado = await tx.tipoServicio.create({ data: { nombre, empresaId } });
          tipoIdPorNombre.set(nombre, creado.id);
          resumen.tiposCreados++;
        }
      }

      for (const c of datos.clientes) {
        const existente = await tx.cliente.findUnique({ where: { empresaId_numeroContrato: { empresaId, numeroContrato: c.numeroContrato } } });
        if (existente) {
          resumen.clientesOmitidos++;
          continue;
        }

        const zonaId = zonaIdPorCodigo.get(c.zonaCodigo);
        if (!zonaId) throw new Error(`Cliente ${c.numeroContrato}: la zona "${c.zonaCodigo}" no está en el archivo de datos.`);

        const clienteCreado = await tx.cliente.create({
          data: {
            numeroContrato: c.numeroContrato,
            dni: c.dni,
            nombreCompleto: c.nombreCompleto,
            telefono: c.telefono,
            direccion: c.direccion,
            zonaId,
            estadoServicio: c.estadoServicio,
            fechaAlta: aFecha(c.fechaAlta) ?? undefined,
            fechaBaja: aFecha(c.fechaBaja),
            motivoBaja: c.motivoBaja,
            empresaId,
            serviciosContratados: {
              create: c.servicios.map((s) => ({
                tipoServicioId: tipoIdPorNombre.get(s.tipoServicio)!,
                montoBase: s.montoBase,
                fechaFacturacionOverride: s.fechaFacturacionOverride,
                estado: s.estado,
                fechaAlta: aFecha(s.fechaAlta) ?? undefined,
                fechaBaja: aFecha(s.fechaBaja),
                motivoBaja: s.motivoBaja,
                empresaId,
              })),
            },
          },
          include: { serviciosContratados: true },
        });
        resumen.clientesCreados++;

        if (opciones.generarCargoInicial) {
          // Un servicio ya suspendido o dado de baja al momento de importar no debería empezar
          // a deberle nada a nadie: solo los que llegan activos.
          for (const servicio of clienteCreado.serviciosContratados.filter((s) => s.estado === "activo")) {
            await tx.cargoMensual.create({
              data: {
                clienteId: clienteCreado.id,
                servicioContratadoId: servicio.id,
                anio: anioActual,
                mes: mesActual,
                montoCorrespondiente: servicio.montoBase,
                estado: "pendiente",
                empresaId,
              },
            });
            resumen.cargosCreados++;
          }
        }
      }
    },
    { timeout: 120_000 },
  );

  return resumen;
}
