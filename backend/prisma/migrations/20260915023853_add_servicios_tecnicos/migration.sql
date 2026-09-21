-- CreateEnum
CREATE TYPE "EstadoServicioTecnico" AS ENUM ('pendiente', 'en_proceso', 'liquidado');

-- CreateTable
CREATE TABLE "tipos_servicio_tecnico" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "camposDefinicion" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipos_servicio_tecnico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicios_tecnicos" (
    "id" TEXT NOT NULL,
    "folio" SERIAL NOT NULL,
    "tipoServicioTecnicoId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tecnico" TEXT,
    "estado" "EstadoServicioTecnico" NOT NULL DEFAULT 'pendiente',
    "datosPropios" JSONB NOT NULL DEFAULT '{}',
    "comentario" TEXT,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaProgramada" TIMESTAMP(3),
    "fechaLiquidacion" TIMESTAMP(3),
    "registradoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "servicios_tecnicos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipos_servicio_tecnico_nombre_key" ON "tipos_servicio_tecnico"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "servicios_tecnicos_folio_key" ON "servicios_tecnicos"("folio");

-- AddForeignKey
ALTER TABLE "servicios_tecnicos" ADD CONSTRAINT "servicios_tecnicos_tipoServicioTecnicoId_fkey" FOREIGN KEY ("tipoServicioTecnicoId") REFERENCES "tipos_servicio_tecnico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicios_tecnicos" ADD CONSTRAINT "servicios_tecnicos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicios_tecnicos" ADD CONSTRAINT "servicios_tecnicos_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
