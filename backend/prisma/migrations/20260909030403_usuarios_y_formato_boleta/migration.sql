-- CreateEnum
CREATE TYPE "FormatoBoleta" AS ENUM ('a4', 'ticket');

-- AlterTable
ALTER TABLE "configuracion" ADD COLUMN     "formatoBoletaDefault" "FormatoBoleta" NOT NULL DEFAULT 'a4';
