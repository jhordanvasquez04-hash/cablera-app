package com.cablera.app.data.remote.dto

import kotlinx.serialization.Serializable

// Fusión con Keysls: catálogo de planes (precio/velocidad sugeridos) por tipo de servicio de
// red. `tipoServicio` acá es el enum fijo de Keysls (internet/cable/duo) — un concepto aparte y
// deliberadamente NO ligado 1:1 al catálogo `TipoServicio` (el de ServicioContratado.tipoServicioId),
// que sigue siendo el que se factura de verdad. Un Plan es solo una plantilla de precio: se puede
// elegir uno al crear/editar un servicio contratado (ver ServicioContratadoInput.planId) y el monto
// se autocompleta, pero siempre queda editable.
object TiposServicioRed {
    const val INTERNET = "internet"
    const val CABLE = "cable"
    const val DUO = "duo"

    val OPCIONES = listOf(INTERNET to "Internet", CABLE to "Cable", DUO to "Dúo")
}

@Serializable
data class PlanDto(
    val id: String,
    val nombre: String,
    val tipoServicio: String,
    val mbps: Int? = null,
    val precio: Double,
    val activo: Boolean = true,
)
