package com.cablera.app.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class ZonaDto(
    val id: String,
    val nombre: String,
    val codigo: String,
    val correlativoActual: Int,
)

@Serializable
data class ZonaResumenDto(
    val id: String,
    val nombre: String,
)

@Serializable
data class TipoServicioDto(
    val id: String,
    val nombre: String,
)

@Serializable
data class CreateTipoServicioRequest(
    val nombre: String,
)
