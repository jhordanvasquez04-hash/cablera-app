package com.cablera.app.data.remote.dto

import kotlinx.serialization.KSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive

/**
 * Respuestas CRUDAS de la API de Keysls (Express + Prisma). Los nombres y formas son los del
 * backend tal cual; las pantallas de la app no las usan directo: `data/mapper/KeyslsMappers.kt`
 * las traduce a los modelos de UI (ClienteDto, ContratoDto, OrdenServicioDto, ...).
 *
 * Prisma serializa los `Decimal` como texto ("35"), por eso los montos usan [FlexDouble].
 */
object FlexDouble : KSerializer<Double> {
    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("FlexDouble", PrimitiveKind.DOUBLE)

    override fun deserialize(decoder: Decoder): Double {
        val elemento = (decoder as JsonDecoder).decodeJsonElement()
        return (elemento as? JsonPrimitive)?.content?.toDoubleOrNull() ?: 0.0
    }

    override fun serialize(encoder: Encoder, value: Double) = encoder.encodeDouble(value)
}

object FlexDoubleNullable : KSerializer<Double?> {
    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("FlexDoubleNullable", PrimitiveKind.DOUBLE)

    override fun deserialize(decoder: Decoder): Double? {
        val elemento = (decoder as JsonDecoder).decodeJsonElement()
        if (elemento is JsonNull) return null
        return (elemento as? JsonPrimitive)?.content?.toDoubleOrNull()
    }

    override fun serialize(encoder: Encoder, value: Double?) {
        if (value == null) encoder.encodeNull() else encoder.encodeDouble(value)
    }
}

@Serializable
data class KUsuario(
    val id: String,
    val nombre: String,
    val apellido: String? = null,
    val email: String,
    val rol: String,
)

@Serializable
data class KLoginResponse(val token: String, val usuario: KUsuario)

@Serializable
data class KTecnico(
    val id: String,
    val nombre: String,
    val apellido: String,
    val email: String = "",
    val telefono: String? = null,
    val zona: String? = null,
    val vehiculo: String? = null,
    val activo: Boolean = true,
)

@Serializable
data class KTecnicoLoginResponse(val token: String, val tecnico: KTecnico)

@Serializable
data class KTecnicoMe(val tecnico: KTecnico)

@Serializable
data class KCliente(
    val id: String,
    val dniRuc: String? = null,
    val nombres: String,
    val apellidos: String? = null,
    val telefono: String? = null,
    val email: String? = null,
    val direccion: String? = null,
    val latitud: Double? = null,
    val longitud: Double? = null,
    val activo: Boolean = true,
    val createdAt: String? = null,
)

@Serializable
data class KPlan(
    val id: String,
    val nombre: String,
    val tipoServicio: String,
    val mbps: Int? = null,
    @Serializable(with = FlexDouble::class) val precio: Double = 0.0,
    val activo: Boolean = true,
)

@Serializable
data class KPuntoRed(
    val id: String,
    val tipo: String,
    val codigo: String,
)

@Serializable
data class KProductoResumen(
    val id: Int,
    val nombre: String,
    val codigo: String? = null,
)

@Serializable
data class KTecnicoResumen(val id: String, val nombre: String, val apellido: String)

@Serializable
data class KContrato(
    val id: String,
    val numero: String,
    val clienteId: String,
    val direccion: String? = null,
    val referencia: String? = null,
    val sector: String? = null,
    val tipoServicio: String,
    val ipWan: String? = null,
    val mascara: String? = null,
    val gateway: String? = null,
    val pppoeUsuario: String? = null,
    val pppoePassword: String? = null,
    val latitud: Double? = null,
    val longitud: Double? = null,
    val precinto: String? = null,
    val planId: String? = null,
    val mbps: Int? = null,
    @Serializable(with = FlexDoubleNullable::class) val costoMensual: Double? = null,
    val diaCorte: Int? = null,
    val puntoRedId: String? = null,
    val equipoProductoId: Int? = null,
    val equipoSerie: String? = null,
    val tecnicoInstaladorId: String? = null,
    val fechaInstalacion: String? = null,
    val estado: String,
    val motivoBaja: String? = null,
    val fechaBaja: String? = null,
    val fechaCorte: String? = null,
    val createdAt: String? = null,
    val cliente: KCliente? = null,
    val plan: KPlan? = null,
    val puntoRed: KPuntoRed? = null,
    val equipoProducto: KProductoResumen? = null,
    val tecnicoInstalador: KTecnicoResumen? = null,
    // Solo vienen en el listado (GET /contratos): resumen de deuda calculado por el backend.
    @Serializable(with = FlexDouble::class) val deudaPendiente: Double = 0.0,
    val mesesPendientes: Int = 0,
    val deudaVencida: Boolean = false,
)

@Serializable
data class KCargo(
    val id: String,
    val contratoId: String,
    val periodo: String,
    @Serializable(with = FlexDouble::class) val monto: Double,
    val estado: String,
    val vencimiento: String? = null,
    @Serializable(with = FlexDouble::class) val saldo: Double = 0.0,
    val vencido: Boolean = false,
)

@Serializable
data class KUsuarioMin(val nombre: String, val apellido: String? = null)

@Serializable
data class KPagoClienteMin(
    val nombres: String,
    val apellidos: String? = null,
    val dniRuc: String? = null,
    val telefono: String? = null,
)

@Serializable
data class KPagoContratoMin(
    val id: String,
    val numero: String,
    val tipoServicio: String,
    val direccion: String? = null,
    val cliente: KPagoClienteMin,
)

@Serializable
data class KPagoCargoInfo(
    val id: String,
    val periodo: String,
    @Serializable(with = FlexDouble::class) val monto: Double = 0.0,
    val contrato: KPagoContratoMin,
)

@Serializable
data class KPagoCargo(
    @Serializable(with = FlexDouble::class) val monto: Double,
    // Al anular el pago, `monto` queda en 0 y el importe original pasa a `montoAnulado`.
    @Serializable(with = FlexDoubleNullable::class) val montoAnulado: Double? = null,
    val cargo: KPagoCargoInfo,
)

@Serializable
data class KPago(
    val id: String,
    /** Comprobante correlativo de la empresa (001-00001); lo manda el servidor. */
    val folio: String? = null,
    val usuarioId: String? = null,
    val fecha: String,
    @Serializable(with = FlexDouble::class) val monto: Double,
    val metodoPago: String,
    val observacion: String? = null,
    val usuario: KUsuarioMin? = null,
    val cargos: List<KPagoCargo> = emptyList(),
    val anulado: Boolean = false,
    val motivoAnulacion: String? = null,
    val fechaAnulacion: String? = null,
)

@Serializable
data class KAnularPagoRequest(val motivo: String)

@Serializable
data class KRegistrarPagoRequest(
    val contratoId: String,
    val fecha: String,
    val metodoPago: String,
    val cargoIds: List<String>,
    val monto: Double,
    val observacion: String? = null,
)

@Serializable
data class KCajaTurno(
    val id: String,
    val fechaApertura: String,
    @Serializable(with = FlexDouble::class) val montoInicial: Double = 0.0,
    val fechaCierre: String? = null,
    @Serializable(with = FlexDoubleNullable::class) val montoEsperado: Double? = null,
    @Serializable(with = FlexDoubleNullable::class) val montoContado: Double? = null,
    @Serializable(with = FlexDoubleNullable::class) val diferencia: Double? = null,
    val observacion: String? = null,
    val estado: String,
    val usuarioApertura: KUsuarioMin? = null,
    val usuarioCierre: KUsuarioMin? = null,
    // Solo en GET /caja/actual: lo cobrado y gastado en efectivo durante el turno abierto.
    @Serializable(with = FlexDouble::class) val efectivoCobrado: Double = 0.0,
    @Serializable(with = FlexDouble::class) val egresosEfectivo: Double = 0.0,
    @Serializable(with = FlexDouble::class) val ingresosExternosEfectivo: Double = 0.0,
    @Serializable(with = FlexDouble::class) val montoEsperadoActual: Double = 0.0,
)

@Serializable
data class KAbrirCajaRequest(val montoInicial: Double)

@Serializable
data class KCerrarCajaRequest(val montoContado: Double, val observacion: String? = null)

@Serializable
data class KEgreso(
    val id: String,
    val concepto: String,
    val categoria: String? = null,
    @Serializable(with = FlexDouble::class) val monto: Double,
    val metodoPago: String,
    val fecha: String,
    val observacion: String? = null,
)

/**
 * Movimiento de la lista unificada de caja (GET /caja/movimientos): un cobro a cliente (INGRESO/PAGO),
 * un ingreso externo (INGRESO/EXTERNO) o un gasto (EGRESO).
 */
@Serializable
data class KMovimientoCaja(
    val id: String,
    val tipo: String,
    val origen: String,
    val fecha: String,
    val monto: Double,
    val metodoPago: String,
    val categoria: String? = null,
    val concepto: String,
    val observacion: String? = null,
    val usuario: KUsuarioMin? = null,
)

@Serializable
data class KEgresoRequest(
    val concepto: String,
    val categoria: String,
    val monto: Double,
    val metodoPago: String,
    val fecha: String,
    val observacion: String? = null,
)

@Serializable
data class KOrdenContratoResumen(
    val id: String,
    val numero: String,
    val tipoServicio: String,
    val estado: String? = null,
    val direccion: String? = null,
)

@Serializable
data class KOrden(
    val id: String,
    val nServicio: String,
    val contratoId: String? = null,
    val tipoOrden: String,
    val estado: String,
    val fechaServicio: String,
    val abonado: String,
    val dni: String? = null,
    val direccion: String,
    val referencia: String? = null,
    val sector: String? = null,
    val celular: String? = null,
    val observacion: String? = null,
    val tecnicoId: String? = null,
    val fechaAsignacion: String? = null,
    val fechaAceptacion: String? = null,
    val fechaInicio: String? = null,
    val fechaFin: String? = null,
    val tiempoInstalacion: Int? = null,
    val ipWan: String? = null,
    val mascara: String? = null,
    val gateway: String? = null,
    val pppoeUsuario: String? = null,
    val pppoePassword: String? = null,
    val latitud: Double? = null,
    val longitud: Double? = null,
    val precinto: String? = null,
    @Serializable(with = FlexDoubleNullable::class) val mensualidad: Double? = null,
    val mbps: Int? = null,
    val planId: String? = null,
    val contrato: KOrdenContratoResumen? = null,
    val tecnico: KTecnicoResumen? = null,
    val plan: KPlan? = null,
)

/** Cuerpo de POST /ordenes-servicio (el tipo lleva el sufijo de servicio: "AVERIA_I"). */
@Serializable
data class KOrdenRequest(
    val contratoId: String,
    val tipoOrden: String,
    val fechaServicio: String,
    val abonado: String,
    val dni: String? = null,
    val direccion: String,
    val referencia: String? = null,
    val sector: String? = null,
    val celular: String? = null,
    val observacion: String? = null,
    // Plan (instalación, cambio de plan, reconexión): al completar la orden pasan al contrato.
    val planId: String? = null,
    val mbps: Int? = null,
    val mensualidad: Double? = null,
    // Datos de red (servicios con Internet).
    val ipWan: String? = null,
    val mascara: String? = null,
    val gateway: String? = null,
    val pppoeUsuario: String? = null,
    val pppoePassword: String? = null,
)

@Serializable
data class KCambiarEstadoOrdenRequest(
    val estado: String,
    val tecnicoId: String? = null,
    // Solo al completar desde el panel: instalación (punto de red, equipo) y cambio de titular (nuevo titular).
    val puntoRedId: String? = null,
    val equipoSerie: String? = null,
    val fechaInstalacion: String? = null,
    val nuevoClienteId: String? = null,
    val celular: String? = null,
)

@Serializable
data class KConsumoRequest(val productoId: Int, val cantidad: Double)

@Serializable
data class KCompletarOrdenRequest(
    val comentario: String? = null,
    val latitud: Double? = null,
    val longitud: Double? = null,
    val puntoRedId: String? = null,
    val equipoProductoId: Int? = null,
    val equipoSerie: String? = null,
    val precinto: String? = null,
    val consumos: List<KConsumoRequest>? = null,
)

@Serializable
data class KProducto(
    val id: Int,
    val nombre: String,
    val unidad: String? = null,
    val esMedible: Boolean = false,
    val stockTotal: Int = 0,
    val metrosDisponibles: Double? = null,
)

@Serializable
data class KPaginado<T>(val data: List<T> = emptyList())

/** GET /dashboard/kpis (viene envuelto en {"data": {...}}). */
@Serializable
data class KKpis(
    val clientesConDeuda: Int = 0,
    @Serializable(with = FlexDouble::class) val deudaTotal: Double = 0.0,
    @Serializable(with = FlexDouble::class) val recaudadoMes: Double = 0.0,
    val contratosActivos: Int = 0,
    @Serializable(with = FlexDouble::class) val deudaContratosActivos: Double = 0.0,
    val contratosActivosConDeuda: Int = 0,
    /** Contratos con cargos pendientes en cualquier estado; null si el backend aún no lo envía. */
    val contratosConDeuda: Int? = null,
)

@Serializable
data class KKpisResponse(val data: KKpis)

/** GET /pagos/reporte: totales del rango (sin traer todos los pagos). */
@Serializable
data class KReportePagos(
    val porMetodo: Map<String, Double> = emptyMap(),
    val totalIngresos: Double = 0.0,
    val totalEgresos: Double = 0.0,
    val saldoNeto: Double = 0.0,
    val cantidadPagos: Int = 0,
    val cantidadEgresos: Int = 0,
    // Ingresos que no son pagos de clientes (aportes, venta de equipos, ...)
    val ingresosExternos: Double = 0.0,
    val porMetodoExternos: Map<String, Double> = emptyMap(),
    val cantidadIngresosExternos: Int = 0,
)

@Serializable
data class KEmpresa(
    val id: String,
    val ruc: String? = null,
    val nombre: String,
    val direccion: String? = null,
    val telefono: String? = null,
    val agencia: String? = null,
    val logo: String? = null,
)

@Serializable
data class KEmpresaRequest(
    val nombre: String,
    val ruc: String? = null,
    val direccion: String? = null,
    val telefono: String? = null,
    val agencia: String? = null,
)

/** Cuerpo de POST/PUT /clientes. */
@Serializable
data class KClienteRequest(
    val dniRuc: String,
    val nombres: String,
    val apellidos: String? = null,
    val telefono: String? = null,
    val email: String? = null,
    val direccion: String? = null,
    val latitud: Double? = null,
    val longitud: Double? = null,
    val activo: Boolean? = null,
)

/** Cuerpo de POST/PUT /contratos (la API exige el objeto completo también al editar). */
@Serializable
data class KContratoRequest(
    val clienteId: String,
    val direccion: String,
    val tipoServicio: String,
    val diaCorte: Int,
    val referencia: String? = null,
    val sector: String? = null,
    val ipWan: String? = null,
    val mascara: String? = null,
    val gateway: String? = null,
    val pppoeUsuario: String? = null,
    val pppoePassword: String? = null,
    val latitud: Double? = null,
    val longitud: Double? = null,
    val precinto: String? = null,
    val planId: String? = null,
    val mbps: Int? = null,
    val costoMensual: Double? = null,
    val puntoRedId: String? = null,
    val equipoProductoId: Int? = null,
    val equipoSerie: String? = null,
    val tecnicoInstaladorId: String? = null,
    val fechaInstalacion: String? = null,
    val estado: String? = null,
    val motivoBaja: String? = null,
    val fechaBaja: String? = null,
)
