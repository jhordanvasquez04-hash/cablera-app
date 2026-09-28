-- Fusión con Keysls: descuento puntual por cargo (distinto del descuento por servicio, que ya
-- existe en la tabla Descuento). `montoOriginal` guarda el monto sin descuento para poder
-- revertirlo; si es null, el cargo nunca tuvo descuento aplicado.
ALTER TABLE "cargos_mensuales" ADD COLUMN "montoOriginal" DOUBLE PRECISION;
ALTER TABLE "cargos_mensuales" ADD COLUMN "notaDescuento" TEXT;
