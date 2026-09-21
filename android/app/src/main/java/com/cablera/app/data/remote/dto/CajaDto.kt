package com.cablera.app.data.remote.dto

import kotlinx.serialization.Serializable

object TiposMovimientoCaja {
    const val EGRESO = "egreso"
    const val INGRESO = "ingreso"
}

object EstadosGastoReportado {
    const val PENDIENTE = "pendiente"
    const val APROBADO = "aprobado"
    const val RECHAZADO = "rechazado"
}

@Serializable
data class CategoriaEgresoDto(val id: String, val nombre: String)

@Serializable
data class CreateCategoriaEgresoRequest(val nombre: String)

@Serializable
data class MovimientoCajaDto(
    val id: String,
    // El resumen de caja (`egresos` dentro de ResumenCajaDto) no incluye este campo porque ya
    // filtra solo egresos; el default cubre esa forma sin romper la deserialización.
    val tipo: String = TiposMovimientoCaja.EGRESO,
    val fecha: String,
    val monto: Double,
    val metodoPago: String,
    val categoria: String? = null,
    val descripcion: String? = null,
)

@Serializable
data class CreateMovimientoRequest(
    val tipo: String,
    val fecha: String,
    val monto: Double,
    val metodoPago: String,
    val categoriaId: String? = null,
    val descripcion: String? = null,
)

@Serializable
data class MontoPorMetodoDto(val metodo: String, val monto: Double, val cantidadCobros: Int)

@Serializable
data class ResumenCajaDto(
    val desde: String,
    val hasta: String,
    val porMetodo: List<MontoPorMetodoDto>,
    val ingresosTotal: Double,
    val egresosTotal: Double,
    val neto: Double,
    val egresos: List<MovimientoCajaDto>,
)

@Serializable
data class AprobarGastoRequest(val metodoPago: String)
