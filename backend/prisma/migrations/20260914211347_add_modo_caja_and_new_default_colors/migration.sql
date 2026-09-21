-- CreateEnum
CREATE TYPE "ModoCaja" AS ENUM ('resumen', 'apertura_cierre');

-- AlterTable
ALTER TABLE "configuracion" ADD COLUMN     "modoCaja" "ModoCaja" NOT NULL DEFAULT 'resumen',
ALTER COLUMN "colorPrimario" SET DEFAULT '#1f3a63',
ALTER COLUMN "colorSecundario" SET DEFAULT '#16191d';
