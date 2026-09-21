-- AlterEnum
ALTER TYPE "Rol" ADD VALUE 'cobrador';

-- AlterTable
ALTER TABLE "configuracion" ADD COLUMN     "ruc" TEXT;
