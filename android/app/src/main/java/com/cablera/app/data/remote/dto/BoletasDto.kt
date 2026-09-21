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

@Serializable
data class BoletaClienteDto(
    val id: String,
    val nombreCompleto: String,
    val zona: String,
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
)

@Serializable
data class RegistrarPagoRequest(
    val clienteId: String,
    val cargoIds: List<String>,
    val montoPagado: Double,
    val metodoPago: String,
)

/** La API responde con la fila cruda de `boleta` recién creada; solo necesitamos el id para navegar al detalle. */
@Serializable
data class BoletaCreadaDto(
    val id: String,
)
