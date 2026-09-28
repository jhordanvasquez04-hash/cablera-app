package com.cablera.app.data.remote.dto

import kotlinx.serialization.Serializable

/**
 * Indicadores de la pantalla de Cobranza. Salen de los totales del servidor (no de sumar listas en el
 * celular), así funcionan igual con 20 clientes que con 20.000. La lista de contratos con deuda va
 * aparte y paginada (ver CobranzaRepository.contratosConDeuda).
 */
@Serializable
data class ResumenCobranzaDto(
    val cobradoMes: Double,
    /** Deuda pendiente de TODOS los contratos. */
    val deudaAcumulada: Double,
    val contratosActivos: Int,
    /** Contratos activos que tienen deuda, y cuánto suman. */
    val contratosActivosConDeuda: Int,
    val deudaContratosActivos: Double,
    val clientesConDeudaCount: Int,
    val cobradoHoyPorUsuario: Double,
    val cobrosHoyPorUsuarioCount: Int,
    // Sectores (zonas) que usa la empresa en sus contratos; vacío = no usa zonas y el filtro no se muestra.
    val sectores: List<String> = emptyList(),
)
