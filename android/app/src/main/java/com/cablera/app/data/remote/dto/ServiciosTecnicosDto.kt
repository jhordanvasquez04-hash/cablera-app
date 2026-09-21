package com.cablera.app.data.remote.dto

import kotlinx.serialization.Serializable

object EstadosServicioTecnico {
    const val PENDIENTE = "pendiente"
    const val LIQUIDADO = "liquidado"

    val OPCIONES = listOf(
        PENDIENTE to "Pendiente",
        LIQUIDADO to "Liquidado",
    )
}

@Serializable
data class TipoServicioTecnicoDto(
    val id: String,
    val nombre: String,
    val camposDefinicion: List<String> = emptyList(),
)

@Serializable
data class CreateTipoServicioTecnicoRequest(
    val nombre: String,
    val camposDefinicion: List<String> = emptyList(),
)

@Serializable
data class ClienteResumenServicioDto(
    val id: String,
    val nombreCompleto: String,
)

@Serializable
data class ServicioTecnicoDto(
    val id: String,
    val folio: String,
    val tipo: String,
    val tipoServicioTecnicoId: String,
    val cliente: ClienteResumenServicioDto,
    val tecnico: String? = null,
    val estado: String,
    val datosPropios: Map<String, String> = emptyMap(),
    val comentario: String? = null,
    val comentarioFinal: String? = null,
    val fechaCreacion: String,
    val fechaProgramada: String? = null,
    val fechaLiquidacion: String? = null,
    val registradoPor: String? = null,
)

@Serializable
data class CreateServicioTecnicoRequest(
    val tipoServicioTecnicoId: String,
    val clienteId: String,
    val tecnico: String? = null,
    val fechaProgramada: String? = null,
    val comentario: String? = null,
    val datosPropios: Map<String, String> = emptyMap(),
)

@Serializable
data class ComentarServicioRequest(val comentario: String)

@Serializable
data class LiquidarServicioRequest(val comentarioFinal: String? = null)

@Serializable
data class UpdateTipoServicioTecnicoRequest(
    val nombre: String? = null,
    val camposDefinicion: List<String>? = null,
)
