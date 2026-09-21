package com.cablera.app.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class ResumenCobranzaDto(
    val cobradoMes: Double,
    val deudaAcumulada: Double,
    val egresosMes: Double,
    val saldoNeto: Double,
    val cobradoHoyPorUsuario: Double,
    val cobrosHoyPorUsuarioCount: Int,
    val clientesConDeudaCount: Int,
    val clientes: List<ClienteConDeudaDto>,
)
