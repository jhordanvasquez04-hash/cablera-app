package com.cablera.app.data.remote.dto

import kotlinx.serialization.Serializable

/**
 * Usuario del panel. `rol` ya viene normalizado por KeyslsMappers: "gestor" para ADMIN y
 * SUPERVISOR (ven y administran todo), "cobrador" para SECRETARIA (cobra y atiende clientes).
 */
@Serializable
data class UsuarioDto(
    val id: String,
    val nombre: String,
    val email: String,
    val rol: String,
)

@Serializable
data class LoginRequest(
    val email: String,
    val password: String,
)

object Roles {
    const val GESTOR = "gestor"
    const val COBRADOR = "cobrador"
}
