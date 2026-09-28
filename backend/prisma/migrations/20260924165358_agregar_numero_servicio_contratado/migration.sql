-- AlterTable
ALTER TABLE "servicios_contratados" ADD COLUMN     "numero" INTEGER;

-- Backfill: numera los servicios que ya existían, 1-based por cliente, en el orden en que se
-- dieron de alta (fechaAlta) — los que se creen de ahora en más ya nacen con su número (ver
-- clientes.service.ts), esto es solo para no dejar en null los que ya estaban en producción.
UPDATE "servicios_contratados" AS s
SET "numero" = t.fila
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "clienteId" ORDER BY "fechaAlta", "id") AS fila
  FROM "servicios_contratados"
) AS t
WHERE s."id" = t."id";
