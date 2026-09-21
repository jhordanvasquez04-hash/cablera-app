import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

const esProduccion = process.env.NODE_ENV === "production";

/** Variable de entorno del seed; una cadena vacía cuenta como no definida. */
function envSeed(nombre: string, porDefecto: string): string {
  return process.env[nombre]?.trim() || porDefecto;
}

/**
 * Contraseña de una cuenta inicial. En producción es obligatoria y nunca puede ser la de ejemplo:
 * sin esto, el seed dejaría cuentas (incluida la de super_admin) con la clave pública `cambiar123`.
 */
function passwordSeed(nombre: string): string {
  const valor = process.env[nombre]?.trim();
  if (esProduccion) {
    if (!valor) throw new Error(`Define ${nombre}: en producción el seed no usa contraseñas por defecto.`);
    if (valor === "cambiar123" || valor.length < 10) {
      throw new Error(`${nombre} es insegura: usa al menos 10 caracteres y no la contraseña de ejemplo.`);
    }
  }
  return valor || "cambiar123";
}

async function main() {
  // Empresa demo para bases de datos nuevas (dev/CI). En una base ya migrada a multi-tenant
  // (ej. producción con PARIAS) este upsert no hace nada nuevo si ya corriste la migración
  // de Fase 1, que crea su propia fila de empresa aparte.
  const slugEmpresa = envSeed("SEED_EMPRESA_SLUG", "demo");
  const empresa = await prisma.empresa.upsert({
    where: { slug: slugEmpresa },
    update: {},
    create: { nombre: envSeed("SEED_EMPRESA_NOMBRE", "Mi Cablera"), slug: slugEmpresa },
  });

  const email = envSeed("SEED_GESTOR_EMAIL", "gestor@cablera.local");
  const password = passwordSeed("SEED_GESTOR_PASSWORD");
  const nombre = envSeed("SEED_GESTOR_NOMBRE", "Administrador");

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: { nombre, email, passwordHash, rol: "gestor", empresaId: empresa.id },
  });

  const emailCobrador = envSeed("SEED_COBRADOR_EMAIL", "cobrador@cablera.local");
  const passwordCobrador = passwordSeed("SEED_COBRADOR_PASSWORD");
  const nombreCobrador = envSeed("SEED_COBRADOR_NOMBRE", "Cobrador Demo");
  const passwordHashCobrador = await bcrypt.hash(passwordCobrador, 10);

  await prisma.usuario.upsert({
    where: { email: emailCobrador },
    update: {},
    create: {
      nombre: nombreCobrador,
      email: emailCobrador,
      passwordHash: passwordHashCobrador,
      rol: "cobrador",
      empresaId: empresa.id,
    },
  });

  await prisma.configuracion.upsert({
    where: { empresaId: empresa.id },
    update: {},
    create: {
      nombreEmpresa: empresa.nombre,
      colorPrimario: "#1f3a63",
      colorSecundario: "#8f2c22",
      fechaFacturacionGlobal: 1,
      empresaId: empresa.id,
    },
  });

  await prisma.tipoServicio.upsert({
    where: { empresaId_nombre: { empresaId: empresa.id, nombre: "cable" } },
    update: {},
    create: { nombre: "cable", empresaId: empresa.id },
  });

  for (const nombreCategoria of ["Mantenimiento", "Sueldos", "Combustible", "Equipos"]) {
    await prisma.categoriaEgreso.upsert({
      where: { empresaId_nombre: { empresaId: empresa.id, nombre: nombreCategoria } },
      update: {},
      create: { nombre: nombreCategoria, empresaId: empresa.id },
    });
  }

  // Cuenta del panel proveedor externo: la API nunca crea cuentas super_admin (ver
  // create-usuario.dto.ts), el seed es el único camino de bootstrap.
  const emailSuperAdmin = envSeed("SEED_SUPERADMIN_EMAIL", "superadmin@cablera.local");
  const passwordSuperAdmin = passwordSeed("SEED_SUPERADMIN_PASSWORD");
  const passwordHashSuperAdmin = await bcrypt.hash(passwordSuperAdmin, 10);

  await prisma.usuario.upsert({
    where: { email: emailSuperAdmin },
    update: {},
    create: {
      nombre: "Super Admin",
      email: emailSuperAdmin,
      passwordHash: passwordHashSuperAdmin,
      rol: "super_admin",
    },
  });

  console.log(`Empresa lista: ${empresa.nombre} (${empresa.slug})`);
  console.log(`Usuario gestor listo: ${email}`);
  console.log(`Usuario cobrador listo: ${emailCobrador}`);
  console.log(`Usuario super_admin listo: ${emailSuperAdmin}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
