// Prueba de aislamiento multi-tenant: crea 2 empresas de prueba con datos propios y
// verifica que el cliente Prisma con alcance de tenant (TenantPrismaService/scopedClient)
// jamás deje ver ni tocar los datos de la otra empresa. Se corre a mano, UNA VEZ, antes de
// retrofitear cualquier servicio real (así lo pide el plan de Fase 2) — no es parte del
// build ni de ningún flujo de la app. Limpia sus propios datos de prueba al terminar.
//
// Uso: npx ts-node prisma/verificar-aislamiento.ts

import { PrismaClient } from "@prisma/client";
import { scopedClient } from "../src/prisma/tenant-prisma.service";

const prisma = new PrismaClient();

let fallas = 0;
function check(nombre: string, condicion: boolean) {
  if (condicion) {
    console.log(`  OK   ${nombre}`);
  } else {
    fallas++;
    console.log(`  FAIL ${nombre}`);
  }
}

async function main() {
  console.log("Creando datos de prueba (2 empresas aisladas)...");

  const empresaA = await prisma.empresa.create({
    data: { nombre: "QA Tenant A", slug: `qa-tenant-a-${Date.now()}` },
  });
  const empresaB = await prisma.empresa.create({
    data: { nombre: "QA Tenant B", slug: `qa-tenant-b-${Date.now()}` },
  });

  const zonaA = await prisma.zona.create({
    data: { nombre: "Zona QA A", codigo: `QAA-${Date.now()}`, empresaId: empresaA.id },
  });
  const zonaB = await prisma.zona.create({
    data: { nombre: "Zona QA B", codigo: `QAB-${Date.now()}`, empresaId: empresaB.id },
  });

  const tipoA = await prisma.tipoServicio.create({
    data: { nombre: `qa-tipo-a-${Date.now()}`, empresaId: empresaA.id },
  });
  const tipoB = await prisma.tipoServicio.create({
    data: { nombre: `qa-tipo-b-${Date.now()}`, empresaId: empresaB.id },
  });

  const clienteA = await prisma.cliente.create({
    data: {
      numeroContrato: `QAA-${Date.now()}`,
      nombreCompleto: "Cliente QA A",
      zonaId: zonaA.id,
      empresaId: empresaA.id,
      serviciosContratados: { create: { tipoServicioId: tipoA.id, montoBase: 10, empresaId: empresaA.id } },
    },
  });
  const clienteB = await prisma.cliente.create({
    data: {
      numeroContrato: `QAB-${Date.now()}`,
      nombreCompleto: "Cliente QA B",
      zonaId: zonaB.id,
      empresaId: empresaB.id,
      serviciosContratados: { create: { tipoServicioId: tipoB.id, montoBase: 20, empresaId: empresaB.id } },
    },
  });

  const clientA = scopedClient(prisma as any, empresaA.id);
  const clientB = scopedClient(prisma as any, empresaB.id);

  console.log("\nVerificando aislamiento...");

  const vistoDesdeA = await clientA.cliente.findUnique({ where: { id: clienteB.id } });
  check("A no puede leer por id un cliente de B (findUnique)", vistoDesdeA === null);

  const listaDesdeA = await clientA.cliente.findMany({});
  check(
    "findMany de A solo trae clientes de A",
    listaDesdeA.length === 1 && listaDesdeA[0]?.id === clienteA.id,
  );

  const listaDesdeB = await clientB.cliente.findMany({});
  check(
    "findMany de B solo trae clientes de B",
    listaDesdeB.length === 1 && listaDesdeB[0]?.id === clienteB.id,
  );

  const clienteCreadoPorA = await clientA.cliente.create({
    data: {
      numeroContrato: `QAA-CREATE-${Date.now()}`,
      nombreCompleto: "Cliente QA A (creado por scoped client)",
      zonaId: zonaA.id,
      serviciosContratados: { create: { tipoServicioId: tipoA.id, montoBase: 5 } },
    } as any, // empresaId lo agrega la extensión — el cast es solo para esta prueba
  });
  check(
    "create() sin empresaId explícito queda igual etiquetado con la empresa del cliente",
    clienteCreadoPorA.empresaId === empresaA.id,
  );

  const actualizacionCruzada = await clientA.cliente.updateMany({
    where: { id: clienteB.id },
    data: { nombreCompleto: "HACKEADO" },
  });
  check("updateMany de A no afecta ninguna fila del cliente de B", actualizacionCruzada.count === 0);

  const clienteBTrasIntento = await prisma.cliente.findUnique({ where: { id: clienteB.id } });
  check(
    "el cliente de B sigue intacto tras el intento de update cruzado",
    clienteBTrasIntento?.nombreCompleto === "Cliente QA B",
  );

  // Crítico: la lógica más sensible de la app (registrar pago, crear cliente con
  // correlativo) corre dentro de $transaction. Si la extensión no se propaga al `tx` de
  // una transacción interactiva, todo ese código quedaría SIN aislar aunque el resto sí.
  const resultadoTx = await clientA.$transaction(async (tx) => {
    const vistoEnTx = await tx.cliente.findUnique({ where: { id: clienteB.id } });
    const creadoEnTx = await tx.cliente.create({
      data: {
        numeroContrato: `QAA-TX-${Date.now()}`,
        nombreCompleto: "Cliente QA A (creado dentro de $transaction)",
        zonaId: zonaA.id,
        serviciosContratados: { create: { tipoServicioId: tipoA.id, montoBase: 7 } },
      } as any,
    });
    return { vistoEnTx, creadoEnTx };
  });
  check(
    "dentro de $transaction, A tampoco puede leer un cliente de B",
    resultadoTx.vistoEnTx === null,
  );
  check(
    "dentro de $transaction, create() también queda etiquetado con la empresa correcta",
    resultadoTx.creadoEnTx.empresaId === empresaA.id,
  );

  console.log("\nLimpiando datos de prueba...");
  await prisma.servicioContratado.deleteMany({ where: { empresaId: { in: [empresaA.id, empresaB.id] } } });
  await prisma.cliente.deleteMany({ where: { empresaId: { in: [empresaA.id, empresaB.id] } } });
  await prisma.tipoServicio.deleteMany({ where: { empresaId: { in: [empresaA.id, empresaB.id] } } });
  await prisma.zona.deleteMany({ where: { empresaId: { in: [empresaA.id, empresaB.id] } } });
  await prisma.empresa.deleteMany({ where: { id: { in: [empresaA.id, empresaB.id] } } });

  console.log(`\n${fallas === 0 ? "TODO PASÓ" : `${fallas} PRUEBA(S) FALLARON`}`);
  if (fallas > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
