/**
 * Carga masiva de clientes desde línea de comandos: mismo motor que el endpoint del panel
 * proveedor (`POST /admin/empresas/:id/importar-clientes`, ver `src/admin/importar-clientes.ts`).
 * Útil cuando ya tienes una terminal del servidor a mano; si no, usa el endpoint HTTP.
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
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { importarClientes, type DatosImportacion } from "../src/admin/importar-clientes";

const prisma = new PrismaClient();

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
  const datos = JSON.parse(readFileSync(ruta, "utf-8")) as DatosImportacion;

  const empresa = await resolverEmpresaDestino();
  console.log(`Cuenta destino: ${empresa.nombre} (${empresa.slug})`);

  const resumen = await importarClientes(prisma, empresa.id, datos);

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
