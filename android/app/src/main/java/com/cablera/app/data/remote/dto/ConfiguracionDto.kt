package com.cablera.app.data.remote.dto

import kotlinx.serialization.Serializable

object FormatosBoleta {
    const val A4 = "a4"
    const val TICKET = "ticket"
}

object ModosCaja {
    const val RESUMEN = "resumen"
    const val APERTURA_CIERRE = "apertura_cierre"
}

@Serializable
data class ConfiguracionDto(
    val id: String,
    val nombreEmpresa: String,
    val ruc: String? = null,
    val logoUrl: String? = null,
    val colorPrimario: String,
    val colorSecundario: String,
    val telefonoContacto: String? = null,
    val emailContacto: String? = null,
    val direccionContacto: String? = null,
    val fechaFacturacionGlobal: Int,
    val formatoBoletaDefault: String,
    val modoCaja: String = ModosCaja.RESUMEN,
)

@Serializable
data class UpdateConfiguracionRequest(
    val nombreEmpresa: String? = null,
    val ruc: String? = null,
    val colorPrimario: String? = null,
    val colorSecundario: String? = null,
    val telefonoContacto: String? = null,
    val emailContacto: String? = null,
    val direccionContacto: String? = null,
    val fechaFacturacionGlobal: Int? = null,
    val formatoBoletaDefault: String? = null,
    val modoCaja: String? = null,
)

@Serializable
data class UsuarioListadoDto(
    val id: String,
    val nombre: String,
    val email: String,
    val rol: String,
    val createdAt: String,
)

@Serializable
data class CreateUsuarioRequest(
    val nombre: String,
    val email: String,
    val password: String,
    val rol: String,
)
