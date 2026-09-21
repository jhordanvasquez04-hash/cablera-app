package com.cablera.app.data.remote.dto

import kotlinx.serialization.Serializable

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

@Serializable
data class LoginResponse(
    val accessToken: String,
    val usuario: UsuarioDto,
)

object Roles {
    const val GESTOR = "gestor"
    const val COBRADOR = "cobrador"
}
