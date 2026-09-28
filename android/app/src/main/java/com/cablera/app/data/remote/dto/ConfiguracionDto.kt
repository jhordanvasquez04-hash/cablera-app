package com.cablera.app.data.remote.dto

import kotlinx.serialization.Serializable

object ModosCaja {
    // Keysls solo maneja caja por turnos (apertura y cierre con arqueo).
    const val APERTURA_CIERRE = "apertura_cierre"
}

/**
 * Datos de la empresa de quien tiene sesión (GET /empresa de Keysls). Keysls no guarda colores de
 * marca: la app usa siempre los suyos, por eso ya no hay colores acá.
 */
@Serializable
data class ConfiguracionDto(
    val id: String,
    val nombreEmpresa: String,
    val ruc: String? = null,
    val logoUrl: String? = null,
    val telefonoContacto: String? = null,
    val direccionContacto: String? = null,
    val agencia: String? = null,
    val modoCaja: String = ModosCaja.APERTURA_CIERRE,
)

data class UpdateConfiguracionRequest(
    val nombreEmpresa: String,
    val ruc: String? = null,
    val telefonoContacto: String? = null,
    val direccionContacto: String? = null,
    val agencia: String? = null,
)
