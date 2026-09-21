package com.cablera.app.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class ReportarGastoRequest(
    val monto: Double,
    val descripcion: String,
)

@Serializable
data class GastoUsuarioDto(
    val nombre: String,
)

@Serializable
data class GastoReportadoDto(
    val id: String,
    val fecha: String,
    val monto: Double,
    val descripcion: String,
    val estado: String,
    val usuario: GastoUsuarioDto,
)
