-- AlterEnum
ALTER TYPE "EstadoEmpresa" ADD VALUE 'morosa';

-- AlterTable
ALTER TABLE "empresas" ADD COLUMN     "agencia" TEXT,
ADD COLUMN     "direccion" TEXT,
ADD COLUMN     "montoMensual" DOUBLE PRECISION,
ADD COLUMN     "ruc" TEXT,
ADD COLUMN     "telefono" TEXT;
