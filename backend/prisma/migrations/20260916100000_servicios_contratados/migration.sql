-- Un cliente puede tener varios servicios contratados (ej. cable + internet), cada uno
-- facturado de forma independiente. Esta migración crea "servicios_contratados", mueve
-- tipoServicioId/montoBase/fechaFacturacionOverride/estadoServicio de "clientes" hacia ahí,
-- y hace que cargos_mensuales/descuentos apunten al servicio (no solo al cliente).
--
-- Orden: 1) crear la tabla nueva, 2) agregar las columnas de enlace como NULLABLE,
-- 3) backfill (un servicio por cada cliente existente, cargos/descuentos existentes
-- apuntando a ese servicio), 4) recién ahí exigir NOT NULL y borrar las columnas viejas.

-- ========== 1) Tabla nueva ==========
CREATE TABLE "servicios_contratados" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tipoServicioId" TEXT NOT NULL,
    "montoBase" DOUBLE PRECISION NOT NULL,
    "fechaFacturacionOverride" INTEGER,
    "estado" "EstadoServicio" NOT NULL DEFAULT 'activo',
    "fechaAlta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaBaja" TIMESTAMP(3),
    "motivoBaja" TEXT,
    "empresaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicios_contratados_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "servicios_contratados" ADD CONSTRAINT "servicios_contratados_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "servicios_contratados" ADD CONSTRAINT "servicios_contratados_tipoServicioId_fkey" FOREIGN KEY ("tipoServicioId") REFERENCES "tipos_servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "servicios_contratados" ADD CONSTRAINT "servicios_contratados_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ========== 2) Columnas de enlace, nullable por ahora ==========
ALTER TABLE "cargos_mensuales" ADD COLUMN "servicioContratadoId" TEXT;
ALTER TABLE "descuentos" ADD COLUMN "servicioContratadoId" TEXT;

-- ========== 3) Backfill ==========
-- Un ServicioContratado por cada cliente existente, con lo que hoy vive en "clientes".
INSERT INTO "servicios_contratados"
  ("id", "clienteId", "tipoServicioId", "montoBase", "fechaFacturacionOverride", "estado", "fechaAlta", "fechaBaja", "motivoBaja", "empresaId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text, "id", "tipoServicioId", "montoBase", "fechaFacturacionOverride", "estadoServicio", "fechaAlta", "fechaBaja", "motivoBaja", "empresaId", now(), now()
FROM "clientes";

-- Cada cargo/descuento existente apunta al servicio recién creado de su mismo cliente
-- (hoy solo hay uno por cliente, así que el join es 1:1 y no hay ambigüedad).
UPDATE "cargos_mensuales" cm
SET "servicioContratadoId" = sc."id"
FROM "servicios_contratados" sc
WHERE sc."clienteId" = cm."clienteId";

UPDATE "descuentos" d
SET "servicioContratadoId" = sc."id"
FROM "servicios_contratados" sc
WHERE sc."clienteId" = d."clienteId";

-- ========== 4) Cutover: NOT NULL + índices/constraints definitivos + limpieza ==========
ALTER TABLE "cargos_mensuales" ALTER COLUMN "servicioContratadoId" SET NOT NULL;
ALTER TABLE "descuentos" ALTER COLUMN "servicioContratadoId" SET NOT NULL;

ALTER TABLE "clientes" DROP CONSTRAINT "clientes_tipoServicioId_fkey";
DROP INDEX "cargos_mensuales_clienteId_anio_mes_key";

ALTER TABLE "clientes" DROP COLUMN "fechaFacturacionOverride",
DROP COLUMN "montoBase",
DROP COLUMN "tipoServicioId";

CREATE INDEX "servicios_contratados_empresaId_idx" ON "servicios_contratados"("empresaId");
CREATE INDEX "servicios_contratados_clienteId_idx" ON "servicios_contratados"("clienteId");
CREATE INDEX "cargos_mensuales_clienteId_idx" ON "cargos_mensuales"("clienteId");
CREATE UNIQUE INDEX "cargos_mensuales_servicioContratadoId_anio_mes_key" ON "cargos_mensuales"("servicioContratadoId", "anio", "mes");
CREATE INDEX "descuentos_servicioContratadoId_idx" ON "descuentos"("servicioContratadoId");

ALTER TABLE "descuentos" ADD CONSTRAINT "descuentos_servicioContratadoId_fkey" FOREIGN KEY ("servicioContratadoId") REFERENCES "servicios_contratados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cargos_mensuales" ADD CONSTRAINT "cargos_mensuales_servicioContratadoId_fkey" FOREIGN KEY ("servicioContratadoId") REFERENCES "servicios_contratados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
