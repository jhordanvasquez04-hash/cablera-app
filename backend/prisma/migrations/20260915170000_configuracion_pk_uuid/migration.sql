-- DropIndex
DROP INDEX "configuracion_empresaId_idx";

-- AlterTable
ALTER TABLE "configuracion" DROP CONSTRAINT "configuracion_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "configuracion_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_empresaId_key" ON "configuracion"("empresaId");

