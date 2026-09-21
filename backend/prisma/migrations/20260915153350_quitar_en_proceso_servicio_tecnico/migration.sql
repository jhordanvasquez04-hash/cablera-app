-- AlterEnum
-- Quita "en_proceso" de EstadoServicioTecnico: el flujo de servicios técnicos solo maneja
-- pendiente/liquidado. No había ninguna fila usando "en_proceso" al momento de esta migración.
BEGIN;
CREATE TYPE "EstadoServicioTecnico_new" AS ENUM ('pendiente', 'liquidado');
ALTER TABLE "servicios_tecnicos" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "servicios_tecnicos" ALTER COLUMN "estado" TYPE "EstadoServicioTecnico_new" USING ("estado"::text::"EstadoServicioTecnico_new");
ALTER TYPE "EstadoServicioTecnico" RENAME TO "EstadoServicioTecnico_old";
ALTER TYPE "EstadoServicioTecnico_new" RENAME TO "EstadoServicioTecnico";
DROP TYPE "EstadoServicioTecnico_old";
ALTER TABLE "servicios_tecnicos" ALTER COLUMN "estado" SET DEFAULT 'pendiente';
COMMIT;
