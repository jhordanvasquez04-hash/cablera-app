/*
  Warnings:

  - You are about to drop the column `createdAt` on the `pagos` table. All the data in the column will be lost.
  - You are about to drop the column `fecha` on the `pagos` table. All the data in the column will be lost.
  - You are about to drop the column `metodoPago` on the `pagos` table. All the data in the column will be lost.
  - You are about to drop the column `montoPagado` on the `pagos` table. All the data in the column will be lost.
  - You are about to drop the column `notasImportacion` on the `pagos` table. All the data in the column will be lost.
  - You are about to drop the column `numeroBoleta` on the `pagos` table. All the data in the column will be lost.
  - Added the required column `boletaId` to the `pagos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `montoAplicado` to the `pagos` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EstadoBoleta" AS ENUM ('emitida', 'anulada');

-- CreateEnum
CREATE TYPE "TipoMovimientoCaja" AS ENUM ('egreso', 'ingreso');

-- CreateEnum
CREATE TYPE "EstadoGastoReportado" AS ENUM ('pendiente', 'aprobado', 'rechazado');

-- DropIndex
DROP INDEX "pagos_numeroBoleta_key";

-- AlterTable
ALTER TABLE "pagos" DROP COLUMN "createdAt",
DROP COLUMN "fecha",
DROP COLUMN "metodoPago",
DROP COLUMN "montoPagado",
DROP COLUMN "notasImportacion",
DROP COLUMN "numeroBoleta",
ADD COLUMN     "boletaId" TEXT NOT NULL,
ADD COLUMN     "montoAplicado" DOUBLE PRECISION NOT NULL;

-- CreateTable
CREATE TABLE "boletas" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "clienteId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodoPago" "MetodoPago" NOT NULL,
    "montoTotal" DOUBLE PRECISION NOT NULL,
    "estado" "EstadoBoleta" NOT NULL DEFAULT 'emitida',
    "reemplazaAId" TEXT,
    "registradoPorId" TEXT,
    "notasImportacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boletas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_egreso" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_egreso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_caja" (
    "id" TEXT NOT NULL,
    "tipo" "TipoMovimientoCaja" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "metodoPago" "MetodoPago" NOT NULL,
    "categoriaId" TEXT,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gastos_reportados" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monto" DOUBLE PRECISION NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado" "EstadoGastoReportado" NOT NULL DEFAULT 'pendiente',
    "movimientoCajaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gastos_reportados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "boletas_numero_key" ON "boletas"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "boletas_reemplazaAId_key" ON "boletas"("reemplazaAId");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_egreso_nombre_key" ON "categorias_egreso"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "gastos_reportados_movimientoCajaId_key" ON "gastos_reportados"("movimientoCajaId");

-- AddForeignKey
ALTER TABLE "boletas" ADD CONSTRAINT "boletas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletas" ADD CONSTRAINT "boletas_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_boletaId_fkey" FOREIGN KEY ("boletaId") REFERENCES "boletas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_egreso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos_reportados" ADD CONSTRAINT "gastos_reportados_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
