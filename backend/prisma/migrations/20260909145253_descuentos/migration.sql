-- CreateTable
CREATE TABLE "descuentos" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "porcentaje" INTEGER NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cantidadMeses" INTEGER,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "descuentos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "descuentos" ADD CONSTRAINT "descuentos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
