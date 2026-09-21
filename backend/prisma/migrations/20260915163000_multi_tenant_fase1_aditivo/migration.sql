-- Fase 1 del retrofit multi-tenant: puramente aditivo. Agrega la tabla `empresas` y una
-- columna `empresaId` (nullable) en cada tabla de negocio, más los índices/uniques
-- compuestos que Fase 2 necesitará (agregados junto a los `@unique` globales existentes,
-- sin reemplazarlos todavía). Ningún servicio de la app usa `empresaId` todavía: el
-- comportamiento de la aplicación no cambia con esta migración.

-- CreateEnum
CREATE TYPE "EstadoEmpresa" AS ENUM ('activa', 'suspendida');

-- AlterTable
ALTER TABLE "boletas" ADD COLUMN     "empresaId" TEXT;

-- AlterTable
ALTER TABLE "cargos_mensuales" ADD COLUMN     "empresaId" TEXT;

-- AlterTable
ALTER TABLE "categorias_egreso" ADD COLUMN     "empresaId" TEXT;

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "empresaId" TEXT;

-- AlterTable
ALTER TABLE "configuracion" ADD COLUMN     "empresaId" TEXT;

-- AlterTable
ALTER TABLE "descuentos" ADD COLUMN     "empresaId" TEXT;

-- AlterTable
ALTER TABLE "gastos_reportados" ADD COLUMN     "empresaId" TEXT;

-- AlterTable
ALTER TABLE "movimientos_caja" ADD COLUMN     "empresaId" TEXT;

-- AlterTable
ALTER TABLE "pagos" ADD COLUMN     "empresaId" TEXT;

-- AlterTable
ALTER TABLE "servicios_tecnicos" ADD COLUMN     "empresaId" TEXT;

-- AlterTable
ALTER TABLE "tipos_servicio" ADD COLUMN     "empresaId" TEXT;

-- AlterTable
ALTER TABLE "tipos_servicio_tecnico" ADD COLUMN     "empresaId" TEXT;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "empresaId" TEXT;

-- AlterTable
ALTER TABLE "zonas" ADD COLUMN     "empresaId" TEXT;

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "estado" "EstadoEmpresa" NOT NULL DEFAULT 'activa',
    "correlativoBoletaActual" INTEGER NOT NULL DEFAULT 0,
    "correlativoServicioTecnicoActual" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_slug_key" ON "empresas"("slug");

-- CreateIndex
CREATE INDEX "boletas_empresaId_idx" ON "boletas"("empresaId");

-- CreateIndex
CREATE INDEX "cargos_mensuales_empresaId_idx" ON "cargos_mensuales"("empresaId");

-- CreateIndex
CREATE INDEX "categorias_egreso_empresaId_idx" ON "categorias_egreso"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_egreso_empresaId_nombre_key" ON "categorias_egreso"("empresaId", "nombre");

-- CreateIndex
CREATE INDEX "clientes_empresaId_idx" ON "clientes"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_empresaId_numeroContrato_key" ON "clientes"("empresaId", "numeroContrato");

-- CreateIndex
CREATE INDEX "configuracion_empresaId_idx" ON "configuracion"("empresaId");

-- CreateIndex
CREATE INDEX "descuentos_empresaId_idx" ON "descuentos"("empresaId");

-- CreateIndex
CREATE INDEX "gastos_reportados_empresaId_idx" ON "gastos_reportados"("empresaId");

-- CreateIndex
CREATE INDEX "movimientos_caja_empresaId_idx" ON "movimientos_caja"("empresaId");

-- CreateIndex
CREATE INDEX "pagos_empresaId_idx" ON "pagos"("empresaId");

-- CreateIndex
CREATE INDEX "servicios_tecnicos_empresaId_idx" ON "servicios_tecnicos"("empresaId");

-- CreateIndex
CREATE INDEX "tipos_servicio_empresaId_idx" ON "tipos_servicio"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_servicio_empresaId_nombre_key" ON "tipos_servicio"("empresaId", "nombre");

-- CreateIndex
CREATE INDEX "tipos_servicio_tecnico_empresaId_idx" ON "tipos_servicio_tecnico"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_servicio_tecnico_empresaId_nombre_key" ON "tipos_servicio_tecnico"("empresaId", "nombre");

-- CreateIndex
CREATE INDEX "usuarios_empresaId_idx" ON "usuarios"("empresaId");

-- CreateIndex
CREATE INDEX "zonas_empresaId_idx" ON "zonas"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "zonas_empresaId_codigo_key" ON "zonas"("empresaId", "codigo");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion" ADD CONSTRAINT "configuracion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zonas" ADD CONSTRAINT "zonas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_servicio" ADD CONSTRAINT "tipos_servicio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "descuentos" ADD CONSTRAINT "descuentos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargos_mensuales" ADD CONSTRAINT "cargos_mensuales_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletas" ADD CONSTRAINT "boletas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias_egreso" ADD CONSTRAINT "categorias_egreso_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos_reportados" ADD CONSTRAINT "gastos_reportados_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_servicio_tecnico" ADD CONSTRAINT "tipos_servicio_tecnico_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicios_tecnicos" ADD CONSTRAINT "servicios_tecnicos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DataMigration: crea la empresa PARIAS (tenant #1) y backfillea empresaId en cada tabla
-- con los datos ya existentes. Los contadores de folio se siembran desde el máximo actual
-- para que Fase 2 no reutilice números ya emitidos al tomar el control de la numeración.
DO $$
DECLARE
  v_empresa_id TEXT := gen_random_uuid()::text;
  v_max_boleta INTEGER;
  v_max_folio INTEGER;
BEGIN
  SELECT COALESCE(MAX(numero), 0) INTO v_max_boleta FROM "boletas";
  SELECT COALESCE(MAX(folio), 0) INTO v_max_folio FROM "servicios_tecnicos";

  INSERT INTO "empresas"
    ("id", "nombre", "slug", "estado", "correlativoBoletaActual", "correlativoServicioTecnicoActual", "createdAt", "updatedAt")
  VALUES
    (v_empresa_id, 'PARIAS', 'parias', 'activa', v_max_boleta, v_max_folio, now(), now());

  UPDATE "usuarios" SET "empresaId" = v_empresa_id WHERE "rol" <> 'super_admin';
  UPDATE "configuracion" SET "empresaId" = v_empresa_id;
  UPDATE "zonas" SET "empresaId" = v_empresa_id;
  UPDATE "tipos_servicio" SET "empresaId" = v_empresa_id;
  UPDATE "clientes" SET "empresaId" = v_empresa_id;
  UPDATE "descuentos" SET "empresaId" = v_empresa_id;
  UPDATE "cargos_mensuales" SET "empresaId" = v_empresa_id;
  UPDATE "boletas" SET "empresaId" = v_empresa_id;
  UPDATE "pagos" SET "empresaId" = v_empresa_id;
  UPDATE "categorias_egreso" SET "empresaId" = v_empresa_id;
  UPDATE "movimientos_caja" SET "empresaId" = v_empresa_id;
  UPDATE "gastos_reportados" SET "empresaId" = v_empresa_id;
  UPDATE "tipos_servicio_tecnico" SET "empresaId" = v_empresa_id;
  UPDATE "servicios_tecnicos" SET "empresaId" = v_empresa_id;
END $$;
