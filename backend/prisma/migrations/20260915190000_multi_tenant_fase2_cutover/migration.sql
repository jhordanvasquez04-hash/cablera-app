-- DropForeignKey
ALTER TABLE "boletas" DROP CONSTRAINT "boletas_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "cargos_mensuales" DROP CONSTRAINT "cargos_mensuales_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "categorias_egreso" DROP CONSTRAINT "categorias_egreso_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "clientes" DROP CONSTRAINT "clientes_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "configuracion" DROP CONSTRAINT "configuracion_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "descuentos" DROP CONSTRAINT "descuentos_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "gastos_reportados" DROP CONSTRAINT "gastos_reportados_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "movimientos_caja" DROP CONSTRAINT "movimientos_caja_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "pagos" DROP CONSTRAINT "pagos_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "servicios_tecnicos" DROP CONSTRAINT "servicios_tecnicos_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "tipos_servicio" DROP CONSTRAINT "tipos_servicio_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "tipos_servicio_tecnico" DROP CONSTRAINT "tipos_servicio_tecnico_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "zonas" DROP CONSTRAINT "zonas_empresaId_fkey";

-- DropIndex
DROP INDEX "boletas_empresaId_idx";

-- DropIndex
DROP INDEX "boletas_numero_key";

-- DropIndex
DROP INDEX "categorias_egreso_nombre_key";

-- DropIndex
DROP INDEX "clientes_numeroContrato_key";

-- DropIndex
DROP INDEX "servicios_tecnicos_empresaId_idx";

-- DropIndex
DROP INDEX "servicios_tecnicos_folio_key";

-- DropIndex
DROP INDEX "tipos_servicio_nombre_key";

-- DropIndex
DROP INDEX "tipos_servicio_tecnico_nombre_key";

-- DropIndex
DROP INDEX "zonas_codigo_key";

-- AlterTable
ALTER TABLE "boletas" ALTER COLUMN "numero" DROP DEFAULT,
ALTER COLUMN "empresaId" SET NOT NULL;
DROP SEQUENCE "boletas_numero_seq";

-- AlterTable
ALTER TABLE "cargos_mensuales" ALTER COLUMN "empresaId" SET NOT NULL;

-- AlterTable
ALTER TABLE "categorias_egreso" ALTER COLUMN "empresaId" SET NOT NULL;

-- AlterTable
ALTER TABLE "clientes" ALTER COLUMN "empresaId" SET NOT NULL;

-- AlterTable
ALTER TABLE "configuracion" ALTER COLUMN "empresaId" SET NOT NULL;

-- AlterTable
ALTER TABLE "descuentos" ALTER COLUMN "empresaId" SET NOT NULL;

-- AlterTable
ALTER TABLE "gastos_reportados" ALTER COLUMN "empresaId" SET NOT NULL;

-- AlterTable
ALTER TABLE "movimientos_caja" ALTER COLUMN "empresaId" SET NOT NULL;

-- AlterTable
ALTER TABLE "pagos" ALTER COLUMN "empresaId" SET NOT NULL;

-- AlterTable
ALTER TABLE "servicios_tecnicos" ALTER COLUMN "folio" DROP DEFAULT,
ALTER COLUMN "empresaId" SET NOT NULL;
DROP SEQUENCE "servicios_tecnicos_folio_seq";

-- AlterTable
ALTER TABLE "tipos_servicio" ALTER COLUMN "empresaId" SET NOT NULL;

-- AlterTable
ALTER TABLE "tipos_servicio_tecnico" ALTER COLUMN "empresaId" SET NOT NULL;

-- AlterTable
ALTER TABLE "zonas" ALTER COLUMN "empresaId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "boletas_empresaId_numero_key" ON "boletas"("empresaId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "servicios_tecnicos_empresaId_folio_key" ON "servicios_tecnicos"("empresaId", "folio");

-- AddForeignKey
ALTER TABLE "configuracion" ADD CONSTRAINT "configuracion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zonas" ADD CONSTRAINT "zonas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_servicio" ADD CONSTRAINT "tipos_servicio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "descuentos" ADD CONSTRAINT "descuentos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargos_mensuales" ADD CONSTRAINT "cargos_mensuales_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletas" ADD CONSTRAINT "boletas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias_egreso" ADD CONSTRAINT "categorias_egreso_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos_reportados" ADD CONSTRAINT "gastos_reportados_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_servicio_tecnico" ADD CONSTRAINT "tipos_servicio_tecnico_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicios_tecnicos" ADD CONSTRAINT "servicios_tecnicos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CheckConstraint: empresaId es NULL si y solo si el usuario es super_admin (cuenta del
-- panel proveedor externo, fuera de cualquier tenant). No se modela en schema.prisma
-- porque Prisma no tiene una forma nativa de declarar un CHECK constraint compuesto.
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresaid_super_admin_check"
  CHECK (
    ("rol" = 'super_admin' AND "empresaId" IS NULL)
    OR
    ("rol" <> 'super_admin' AND "empresaId" IS NOT NULL)
  );
