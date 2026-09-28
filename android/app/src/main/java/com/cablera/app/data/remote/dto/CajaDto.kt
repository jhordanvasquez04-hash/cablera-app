package com.cablera.app.data.remote.dto

import kotlinx.serialization.Serializable

object TiposMovimientoCaja {
    const val INGRESO = "ingreso"
    const val EGRESO = "egreso"
}

/** De dónde viene un ingreso: el cobro a un cliente o un ingreso externo (aporte, venta de equipo, ...). */
object OrigenesMovimiento {
    const val PAGO = "pago"
    const val EXTERNO = "externo"
    const val EGRESO = "egreso"
}

/** En Keysls la categoría de un egreso es texto libre: `id` y `nombre` son lo mismo. */
@Serializable
data class CategoriaEgresoDto(val id: String, val nombre: String)

@Serializable
data class MovimientoCajaDto(
    val id: String,
    val tipo: String = TiposMovimientoCaja.EGRESO,
    val fecha: String,
    val monto: Double,
    val metodoPago: String,
    val categoria: String? = null,
    val descripcion: String? = null,
    val origen: String = OrigenesMovimiento.EGRESO,
)

data class CreateMovimientoRequest(
    val tipo: String,
    val fecha: String,
    val monto: Double,
    val metodoPago: String,
    val categoria: String,
    val descripcion: String,
)

@Serializable
data class MontoPorMetodoDto(val metodo: String, val monto: Double)

@Serializable
data class ResumenCajaDto(
    val desde: String,
    val hasta: String,
    val porMetodo: List<MontoPorMetodoDto>,
    val ingresosTotal: Double,
    val egresosTotal: Double,
    val neto: Double,
)
