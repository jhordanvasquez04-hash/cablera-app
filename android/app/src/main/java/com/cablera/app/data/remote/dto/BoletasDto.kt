package com.cablera.app.data.remote.dto

import kotlinx.serialization.Serializable

object MetodosPago {
    const val EFECTIVO = "efectivo"
    const val YAPE = "yape"
    const val PLIN = "plin"
    const val TRANSFERENCIA = "transferencia"

    val OPCIONES = listOf(
        EFECTIVO to "Efectivo",
        YAPE to "Yape",
        PLIN to "Plin",
        TRANSFERENCIA to "Transferencia",
    )
}

object EstadosBoleta {
    const val EMITIDA = "emitida"
    const val ANULADA = "anulada"
}

// En Keysls lo que se entrega al cliente es el comprobante de un PAGO; la app lo sigue mostrando
// como "boleta" (ver KeyslsMappers). Un pago no se anula desde el celular.
@Serializable
data class BoletaClienteDto(
    val nombreCompleto: String,
    val dni: String? = null,
    val telefono: String? = null,
)

@Serializable
data class BoletaResumenDto(
    val id: String,
    val folio: String,
    val fecha: String,
    val cliente: BoletaClienteDto,
    val concepto: String,
    val metodoPago: String,
    val montoTotal: Double,
    val estado: String,
)

@Serializable
data class BoletaLineaDto(
    val periodo: String,
    val servicio: String,
    val montoAplicado: Double,
    val esSaldo: Boolean,
)

@Serializable
data class BoletaDetalleDto(
    val id: String,
    val folio: String,
    val fecha: String,
    val cliente: BoletaClienteDto,
    val concepto: String,
    val metodoPago: String,
    val montoTotal: Double,
    val estado: String,
    val dni: String? = null,
    val registradoPor: String? = null,
    val lineas: List<BoletaLineaDto>,
    val motivoAnulacion: String? = null,
    val fechaAnulacion: String? = null,
)
