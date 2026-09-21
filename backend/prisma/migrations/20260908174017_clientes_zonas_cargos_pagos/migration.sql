-- CreateEnum
CREATE TYPE "EstadoServicio" AS ENUM ('activo', 'suspendido', 'retirado');

-- CreateEnum
CREATE TYPE "EstadoCargo" AS ENUM ('pendiente', 'parcial', 'pagado');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('efectivo', 'yape', 'plin', 'transferencia');

-- CreateTable
CREATE TABLE "zonas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "correlativoActual" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zonas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_servicio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipos_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "numeroContrato" TEXT NOT NULL,
    "dni" TEXT,
    "nombreCompleto" TEXT NOT NULL,
    "telefono" TEXT,
    "direccion" TEXT,
    "zonaId" TEXT NOT NULL,
    "tipoServicioId" TEXT NOT NULL,
    "estadoServicio" "EstadoServicio" NOT NULL DEFAULT 'activo',
    "montoBase" DOUBLE PRECISION NOT NULL,
    "fechaFacturacionOverride" INTEGER,
    "fechaAlta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaBaja" TIMESTAMP(3),
    "motivoBaja" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargos_mensuales" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "montoCorrespondiente" DOUBLE PRECISION NOT NULL,
    "estado" "EstadoCargo" NOT NULL DEFAULT 'pendiente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cargos_mensuales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" TEXT NOT NULL,
    "cargoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "montoPagado" DOUBLE PRECISION NOT NULL,
    "metodoPago" "MetodoPago" NOT NULL,
    "numeroBoleta" SERIAL NOT NULL,
    "notasImportacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "zonas_codigo_key" ON "zonas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_servicio_nombre_key" ON "tipos_servicio"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_numeroContrato_key" ON "clientes"("numeroContrato");

-- CreateIndex
CREATE UNIQUE INDEX "cargos_mensuales_clienteId_anio_mes_key" ON "cargos_mensuales"("clienteId", "anio", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_numeroBoleta_key" ON "pagos"("numeroBoleta");

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "zonas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_tipoServicioId_fkey" FOREIGN KEY ("tipoServicioId") REFERENCES "tipos_servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargos_mensuales" ADD CONSTRAINT "cargos_mensuales_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "cargos_mensuales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
