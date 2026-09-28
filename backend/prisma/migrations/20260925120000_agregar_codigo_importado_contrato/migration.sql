-- Fusión con Keysls: código de contrato del sistema anterior, para deduplicar filas al
-- importar el mismo Excel más de una vez (ver ContratosService.importarLote).
ALTER TABLE "contratos" ADD COLUMN "codigoImportado" TEXT;
CREATE UNIQUE INDEX "contratos_empresaId_codigoImportado_key" ON "contratos"("empresaId", "codigoImportado");
