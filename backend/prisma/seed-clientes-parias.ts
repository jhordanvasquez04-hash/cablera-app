/**
 * Semilla de clientes de PARIAS: carga zonas, tipos de servicio, clientes y servicios contratados
 * desde `prisma/seed-data/parias-clientes.json` en la cuenta principal.
 *
 * Uso en un servidor con la base en cero:
 *   1) pnpm prisma:migrate      (o `prisma migrate deploy` en producción)
 *   2) pnpm prisma:seed         (crea empresa, usuarios y catálogos base)
 *   3) pnpm prisma:seed:clientes
 *
 * Cuenta destino (en este orden):
 *   - `SEED_CLIENTES_EMPRESA_SLUG`, si está definida; o
 *   - la empresa del gestor `SEED_GESTOR_EMAIL` (por defecto gestor@cablera.local), es decir, la
 *     cuenta principal que crea `prisma/seed.ts`.
 *
 * Archivo de datos: `prisma/seed-data/parias-clientes.json`, o el que indique `SEED_CLIENTES_ARCHIVO`.
 *
 * Es idempotente: se puede correr varias veces. Un cliente cuyo `numeroContrato` ya existe en la
 * cuenta se omite (nunca se sobrescribe lo que ya se editó a mano). No genera cargos, boletas ni
 * pagos: los cargos se crean hacia adelante con el cron diario de facturación.
 */
import { PrismaClient, type EstadoServicio } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

interface ServicioSeed {
  tipoServicio: string;
  montoBase: number;
  fechaFacturacionOverride: number | null;
  estado: EstadoServicio;
  fechaAlta: string;
  fechaBaja: string | null;
  motivoBaja: string | null;
}

interface ClienteSeed {
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
  servicios: ServicioSeed[];
}

interface DatosSeed {
  zonas: { nombre: string; codigo: string; correlativoActual: number }[];
  clientes: ClienteSeed[];
}

// El respaldo guarda las fechas en UTC pero sin sufijo de zona horaria.
const aFecha = (valor: string | null): Date | null => {
  if (!valor) return null;
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(valor) ? valor : `${valor}Z`);
};

async function resolverEmpresaDestino() {
  const slug = process.env.SEED_CLIENTES_EMPRESA_SLUG;
  if (slug) {
    const empresa = await prisma.empresa.findUnique({ where: { slug } });
    if (!empresa) throw new Error(`No existe la empresa con slug "${slug}" (SEED_CLIENTES_EMPRESA_SLUG).`);
    return empresa;
  }

  const emailGestor = process.env.SEED_GESTOR_EMAIL?.trim() || "gestor@cablera.local";
  const gestor = await prisma.usuario.findUnique({ where: { email: emailGestor }, include: { empresa: true } });
  if (!gestor?.empresa) {
    throw new Error(
      `No se encontró la cuenta principal (gestor ${emailGestor}). Corre primero \`pnpm prisma:seed\`, ` +
        "o define SEED_CLIENTES_EMPRESA_SLUG.",
    );
  }
  return gestor.empresa;
}

async function main() {
  // Por defecto el archivo vive junto a la semilla; en el servidor (imagen sin datos personales) se
  // indica su ubicación con SEED_CLIENTES_ARCHIVO, por ejemplo una copia en el volumen `backups`.
  const ruta = process.env.SEED_CLIENTES_ARCHIVO?.trim() || join(__dirname, "seed-data", "parias-clientes.json");
  const datos = JSON.parse(readFileSync(ruta, "utf-8")) as DatosSeed;

  const empresa = await resolverEmpresaDestino();
  console.log(`Cuenta destino: ${empresa.nombre} (${empresa.slug})`);

  const resumen = { zonasCreadas: 0, tiposCreados: 0, clientesCreados: 0, clientesOmitidos: 0 };

  await prisma.$transaction(
    async (tx) => {
      const zonaIdPorCodigo = new Map<string, string>();
      for (const z of datos.zonas) {
        const existente = await tx.zona.findUnique({
          where: { empresaId_codigo: { empresaId: empresa.id, codigo: z.codigo } },
        });
        if (existente) {
          // Nunca se retrocede el correlativo: evitaría contratos duplicados en clientes nuevos.
          if (existente.correlativoActual < z.correlativoActual) {
            await tx.zona.update({ where: { id: existente.id }, data: { correlativoActual: z.correlativoActual } });
          }
          zonaIdPorCodigo.set(z.codigo, existente.id);
        } else {
          const creada = await tx.zona.create({
            data: { nombre: z.nombre, codigo: z.codigo, correlativoActual: z.correlativoActual, empresaId: empresa.id },
          });
          zonaIdPorCodigo.set(z.codigo, creada.id);
          resumen.zonasCreadas++;
        }
      }

      const tipoIdPorNombre = new Map<string, string>();
      const nombresTipo = new Set(datos.clientes.flatMap((c) => c.servicios.map((s) => s.tipoServicio)));
      for (const nombre of nombresTipo) {
        const existente = await tx.tipoServicio.findUnique({
          where: { empresaId_nombre: { empresaId: empresa.id, nombre } },
        });
        if (existente) {
          tipoIdPorNombre.set(nombre, existente.id);
        } else {
          const creado = await tx.tipoServicio.create({ data: { nombre, empresaId: empresa.id } });
          tipoIdPorNombre.set(nombre, creado.id);
          resumen.tiposCreados++;
        }
      }

      for (const c of datos.clientes) {
        const existente = await tx.cliente.findUnique({
          where: { empresaId_numeroContrato: { empresaId: empresa.id, numeroContrato: c.numeroContrato } },
        });
        if (existente) {
          resumen.clientesOmitidos++;
          continue;
        }

        const zonaId = zonaIdPorCodigo.get(c.zonaCodigo);
        if (!zonaId) throw new Error(`Cliente ${c.numeroContrato}: la zona "${c.zonaCodigo}" no está en el archivo de datos.`);

        await tx.cliente.create({
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
            empresaId: empresa.id,
            serviciosContratados: {
              create: c.servicios.map((s) => ({
                tipoServicioId: tipoIdPorNombre.get(s.tipoServicio)!,
                montoBase: s.montoBase,
                fechaFacturacionOverride: s.fechaFacturacionOverride,
                estado: s.estado,
                fechaAlta: aFecha(s.fechaAlta) ?? undefined,
                fechaBaja: aFecha(s.fechaBaja),
                motivoBaja: s.motivoBaja,
                empresaId: empresa.id,
              })),
            },
          },
        });
        resumen.clientesCreados++;
      }
    },
    { timeout: 120_000 },
  );

  console.log(
    `Listo: ${resumen.clientesCreados} cliente(s) creados, ${resumen.clientesOmitidos} ya existían, ` +
      `${resumen.zonasCreadas} zona(s) y ${resumen.tiposCreados} tipo(s) de servicio nuevos.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
