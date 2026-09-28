-- CreateEnum
CREATE TYPE "TipoPuntoRed" AS ENUM ('nap', 'cto');

-- CreateEnum
CREATE TYPE "EstadoPuntoRed" AS ENUM ('activa', 'saturada', 'mantenimiento');

-- CreateEnum
CREATE TYPE "EstadoOnu" AS ENUM ('autorizada', 'fallida');

-- CreateEnum
CREATE TYPE "TipoServicioRed" AS ENUM ('internet', 'cable', 'duo');

-- CreateEnum
CREATE TYPE "EstadoContrato" AS ENUM ('activo', 'suspendido', 'cortado', 'baja');

-- CreateEnum
CREATE TYPE "EstadoOrdenServicio" AS ENUM ('pendiente', 'asignada', 'en_proceso', 'completada', 'cancelada');

-- CreateEnum
CREATE TYPE "TipoOrdenServicio" AS ENUM ('instalacion', 'alta_servicio', 'averia', 'cambio_domicilio', 'cambio_equipo', 'cambio_plan', 'cambio_titular', 'corte_solicitud', 'corte_deuda', 'reconexion', 'retiro_equipo', 'traslado', 'otro');

-- CreateEnum
CREATE TYPE "TipoMovimientoStock" AS ENUM ('entrada', 'salida');

-- CreateEnum
CREATE TYPE "EstadoCajaTurno" AS ENUM ('abierta', 'cerrada');

-- CreateEnum
CREATE TYPE "TipoMetodoPagoEmpresa" AS ENUM ('yape', 'plin', 'cuenta_bancaria');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EstadoCargo" ADD VALUE 'anulado';
ALTER TYPE "EstadoCargo" ADD VALUE 'exonerado';

-- AlterEnum
ALTER TYPE "MetodoPago" ADD VALUE 'tarjeta';

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "email" TEXT,
ADD COLUMN     "latitud" DOUBLE PRECISION,
ADD COLUMN     "longitud" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "servicios_contratados" ADD COLUMN     "planId" TEXT;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "bloqueadoHasta" TIMESTAMP(3),
ADD COLUMN     "intentosFallidos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totpHabilitado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totpSecret" TEXT,
ADD COLUMN     "totpSecretPendiente" TEXT;

-- CreateTable
CREATE TABLE "codigos_recuperacion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codigos_recuperacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_reseteo_password" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_reseteo_password_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_sesion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "dispositivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tokens_sesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tecnicos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "zona" TEXT,
    "vehiculo" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "empresaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tecnicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secretarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "empresaId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secretarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puntos_red" (
    "id" TEXT NOT NULL,
    "tipo" "TipoPuntoRed" NOT NULL,
    "codigo" TEXT NOT NULL,
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "capacidad" INTEGER,
    "ocupados" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoPuntoRed" NOT NULL DEFAULT 'activa',
    "direccion" TEXT,
    "notas" TEXT,
    "empresaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "napId" TEXT,

    CONSTRAINT "puntos_red_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "olts" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "puerto" INTEGER NOT NULL DEFAULT 22,
    "puertoTelnet" INTEGER NOT NULL DEFAULT 23,
    "puertoSnmp" INTEGER NOT NULL DEFAULT 161,
    "comunidadSnmp" TEXT NOT NULL DEFAULT 'public',
    "fabricante" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "passwordCifrado" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "notas" TEXT,
    "empresaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "olts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onus" (
    "id" TEXT NOT NULL,
    "numeroSerie" TEXT NOT NULL,
    "onuId" INTEGER NOT NULL,
    "puerto" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "vlan" TEXT NOT NULL,
    "perfilServicio" TEXT NOT NULL,
    "onuType" TEXT NOT NULL,
    "estado" "EstadoOnu" NOT NULL,
    "mensajeError" TEXT,
    "oltId" TEXT NOT NULL,
    "contratoId" TEXT,
    "ordenServicioId" TEXT,
    "autorizadoPorUsuarioId" TEXT,
    "autorizadoPorTecnicoId" TEXT,
    "empresaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipoServicio" "TipoServicioRed" NOT NULL,
    "mbps" INTEGER,
    "precio" DOUBLE PRECISION NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "empresaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos" (
    "id" TEXT NOT NULL,
    "servicioContratadoId" TEXT NOT NULL,
    "direccion" TEXT,
    "referencia" TEXT,
    "sector" TEXT,
    "ipWan" TEXT,
    "mascara" TEXT,
    "gateway" TEXT,
    "pppoeUsuario" TEXT,
    "pppoePassword" TEXT,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "precinto" TEXT,
    "puntoRedId" TEXT,
    "equipoProductoId" TEXT,
    "equipoSerie" TEXT,
    "tecnicoInstaladorId" TEXT,
    "fechaInstalacion" TIMESTAMP(3),
    "estado" "EstadoContrato" NOT NULL DEFAULT 'activo',
    "motivoBaja" TEXT,
    "fechaBaja" TIMESTAMP(3),
    "fechaCorte" TIMESTAMP(3),
    "empresaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes_servicio" (
    "id" TEXT NOT NULL,
    "nServicio" TEXT NOT NULL,
    "contratoId" TEXT,
    "tipoOrden" "TipoOrdenServicio" NOT NULL,
    "tipoServicio" "TipoServicioRed" NOT NULL,
    "estado" "EstadoOrdenServicio" NOT NULL DEFAULT 'pendiente',
    "fechaServicio" TIMESTAMP(3) NOT NULL,
    "abonado" TEXT NOT NULL,
    "dni" TEXT,
    "direccion" TEXT NOT NULL,
    "referencia" TEXT,
    "sector" TEXT,
    "celular" TEXT,
    "observacion" TEXT,
    "tecnicoId" TEXT,
    "fechaAsignacion" TIMESTAMP(3),
    "fechaAceptacion" TIMESTAMP(3),
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "tiempoInstalacionMin" INTEGER,
    "ipWan" TEXT,
    "mascara" TEXT,
    "gateway" TEXT,
    "pppoeUsuario" TEXT,
    "pppoePassword" TEXT,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "precinto" TEXT,
    "mensualidad" DOUBLE PRECISION,
    "mbps" INTEGER,
    "planId" TEXT,
    "empresaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordenes_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT,
    "categoria" TEXT,
    "unidad" TEXT,
    "descripcion" TEXT,
    "esMedible" BOOLEAN NOT NULL DEFAULT false,
    "metrosPorUnidad" DOUBLE PRECISION,
    "metrosDisponibles" DOUBLE PRECISION,
    "tieneVariantes" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "stockTotal" INTEGER NOT NULL DEFAULT 0,
    "stockMinimo" INTEGER NOT NULL DEFAULT 0,
    "empresaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_stock" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "tipo" "TipoMovimientoStock" NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "proveedor" TEXT,
    "motivo" TEXT,
    "empresaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto_variantes" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "genero" TEXT,
    "talla" TEXT,
    "codigo" TEXT,
    "empresaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "producto_variantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_consumos" (
    "id" TEXT NOT NULL,
    "ordenId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "empresaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orden_consumos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caja_turnos" (
    "id" TEXT NOT NULL,
    "usuarioAperturaId" TEXT NOT NULL,
    "fechaApertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montoInicial" DOUBLE PRECISION NOT NULL,
    "usuarioCierreId" TEXT,
    "fechaCierre" TIMESTAMP(3),
    "montoEsperado" DOUBLE PRECISION,
    "montoContado" DOUBLE PRECISION,
    "diferencia" DOUBLE PRECISION,
    "observacion" TEXT,
    "estado" "EstadoCajaTurno" NOT NULL DEFAULT 'abierta',
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "caja_turnos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metodos_pago_empresa" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipo" "TipoMetodoPagoEmpresa" NOT NULL,
    "numero" TEXT NOT NULL,
    "banco" TEXT,
    "titular" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metodos_pago_empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actividad_log" (
    "id" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "detalle" TEXT,
    "ip" TEXT,
    "empresaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actividad_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_suscripcion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "periodo" TEXT NOT NULL,
    "notas" TEXT,
    "fechaPago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_suscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "codigos_recuperacion_usuarioId_idx" ON "codigos_recuperacion"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_reseteo_password_token_key" ON "tokens_reseteo_password"("token");

-- CreateIndex
CREATE INDEX "tokens_reseteo_password_usuarioId_idx" ON "tokens_reseteo_password"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_sesion_token_key" ON "tokens_sesion"("token");

-- CreateIndex
CREATE UNIQUE INDEX "tecnicos_email_key" ON "tecnicos"("email");

-- CreateIndex
CREATE INDEX "tecnicos_empresaId_idx" ON "tecnicos"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "tecnicos_empresaId_dni_key" ON "tecnicos"("empresaId", "dni");

-- CreateIndex
CREATE UNIQUE INDEX "secretarios_usuarioId_key" ON "secretarios"("usuarioId");

-- CreateIndex
CREATE INDEX "secretarios_empresaId_idx" ON "secretarios"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "secretarios_empresaId_dni_key" ON "secretarios"("empresaId", "dni");

-- CreateIndex
CREATE UNIQUE INDEX "secretarios_empresaId_email_key" ON "secretarios"("empresaId", "email");

-- CreateIndex
CREATE INDEX "puntos_red_empresaId_idx" ON "puntos_red"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "puntos_red_empresaId_codigo_key" ON "puntos_red"("empresaId", "codigo");

-- CreateIndex
CREATE INDEX "olts_empresaId_idx" ON "olts"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "olts_empresaId_ip_key" ON "olts"("empresaId", "ip");

-- CreateIndex
CREATE INDEX "onus_oltId_idx" ON "onus"("oltId");

-- CreateIndex
CREATE INDEX "onus_contratoId_idx" ON "onus"("contratoId");

-- CreateIndex
CREATE INDEX "onus_ordenServicioId_idx" ON "onus"("ordenServicioId");

-- CreateIndex
CREATE INDEX "onus_empresaId_idx" ON "onus"("empresaId");

-- CreateIndex
CREATE INDEX "planes_empresaId_idx" ON "planes"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_servicioContratadoId_key" ON "contratos"("servicioContratadoId");

-- CreateIndex
CREATE INDEX "contratos_puntoRedId_idx" ON "contratos"("puntoRedId");

-- CreateIndex
CREATE INDEX "contratos_empresaId_idx" ON "contratos"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_empresaId_ipWan_key" ON "contratos"("empresaId", "ipWan");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_empresaId_pppoeUsuario_key" ON "contratos"("empresaId", "pppoeUsuario");

-- CreateIndex
CREATE INDEX "ordenes_servicio_contratoId_idx" ON "ordenes_servicio"("contratoId");

-- CreateIndex
CREATE INDEX "ordenes_servicio_empresaId_idx" ON "ordenes_servicio"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_servicio_empresaId_nServicio_key" ON "ordenes_servicio"("empresaId", "nServicio");

-- CreateIndex
CREATE INDEX "productos_empresaId_idx" ON "productos"("empresaId");

-- CreateIndex
CREATE INDEX "movimientos_stock_empresaId_idx" ON "movimientos_stock"("empresaId");

-- CreateIndex
CREATE INDEX "producto_variantes_empresaId_idx" ON "producto_variantes"("empresaId");

-- CreateIndex
CREATE INDEX "orden_consumos_ordenId_idx" ON "orden_consumos"("ordenId");

-- CreateIndex
CREATE INDEX "orden_consumos_empresaId_idx" ON "orden_consumos"("empresaId");

-- CreateIndex
CREATE INDEX "caja_turnos_estado_idx" ON "caja_turnos"("estado");

-- CreateIndex
CREATE INDEX "caja_turnos_empresaId_idx" ON "caja_turnos"("empresaId");

-- CreateIndex
CREATE INDEX "metodos_pago_empresa_empresaId_idx" ON "metodos_pago_empresa"("empresaId");

-- CreateIndex
CREATE INDEX "actividad_log_empresaId_idx" ON "actividad_log"("empresaId");

-- CreateIndex
CREATE INDEX "actividad_log_createdAt_idx" ON "actividad_log"("createdAt");

-- CreateIndex
CREATE INDEX "pagos_suscripcion_empresaId_idx" ON "pagos_suscripcion"("empresaId");

-- CreateIndex
CREATE INDEX "pagos_suscripcion_periodo_idx" ON "pagos_suscripcion"("periodo");

-- AddForeignKey
ALTER TABLE "codigos_recuperacion" ADD CONSTRAINT "codigos_recuperacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens_reseteo_password" ADD CONSTRAINT "tokens_reseteo_password_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens_sesion" ADD CONSTRAINT "tokens_sesion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicios_contratados" ADD CONSTRAINT "servicios_contratados_planId_fkey" FOREIGN KEY ("planId") REFERENCES "planes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tecnicos" ADD CONSTRAINT "tecnicos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secretarios" ADD CONSTRAINT "secretarios_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secretarios" ADD CONSTRAINT "secretarios_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puntos_red" ADD CONSTRAINT "puntos_red_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puntos_red" ADD CONSTRAINT "puntos_red_napId_fkey" FOREIGN KEY ("napId") REFERENCES "puntos_red"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "olts" ADD CONSTRAINT "olts_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onus" ADD CONSTRAINT "onus_oltId_fkey" FOREIGN KEY ("oltId") REFERENCES "olts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onus" ADD CONSTRAINT "onus_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onus" ADD CONSTRAINT "onus_ordenServicioId_fkey" FOREIGN KEY ("ordenServicioId") REFERENCES "ordenes_servicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onus" ADD CONSTRAINT "onus_autorizadoPorUsuarioId_fkey" FOREIGN KEY ("autorizadoPorUsuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onus" ADD CONSTRAINT "onus_autorizadoPorTecnicoId_fkey" FOREIGN KEY ("autorizadoPorTecnicoId") REFERENCES "tecnicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onus" ADD CONSTRAINT "onus_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes" ADD CONSTRAINT "planes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_servicioContratadoId_fkey" FOREIGN KEY ("servicioContratadoId") REFERENCES "servicios_contratados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_puntoRedId_fkey" FOREIGN KEY ("puntoRedId") REFERENCES "puntos_red"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_equipoProductoId_fkey" FOREIGN KEY ("equipoProductoId") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_tecnicoInstaladorId_fkey" FOREIGN KEY ("tecnicoInstaladorId") REFERENCES "tecnicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_servicio" ADD CONSTRAINT "ordenes_servicio_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_servicio" ADD CONSTRAINT "ordenes_servicio_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "tecnicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_servicio" ADD CONSTRAINT "ordenes_servicio_planId_fkey" FOREIGN KEY ("planId") REFERENCES "planes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_servicio" ADD CONSTRAINT "ordenes_servicio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_variantes" ADD CONSTRAINT "producto_variantes_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_variantes" ADD CONSTRAINT "producto_variantes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_consumos" ADD CONSTRAINT "orden_consumos_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes_servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_consumos" ADD CONSTRAINT "orden_consumos_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_consumos" ADD CONSTRAINT "orden_consumos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caja_turnos" ADD CONSTRAINT "caja_turnos_usuarioAperturaId_fkey" FOREIGN KEY ("usuarioAperturaId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caja_turnos" ADD CONSTRAINT "caja_turnos_usuarioCierreId_fkey" FOREIGN KEY ("usuarioCierreId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caja_turnos" ADD CONSTRAINT "caja_turnos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metodos_pago_empresa" ADD CONSTRAINT "metodos_pago_empresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividad_log" ADD CONSTRAINT "actividad_log_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_suscripcion" ADD CONSTRAINT "pagos_suscripcion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
