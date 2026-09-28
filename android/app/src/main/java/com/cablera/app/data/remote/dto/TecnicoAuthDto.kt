package com.cablera.app.data.remote.dto

import kotlinx.serialization.Serializable

/**
 * Portal de campo: un Tecnico NO es un Usuario del panel — tiene su propia cuenta, su propio login
 * (/auth/tecnico/login) y su propio token, deliberadamente separados del panel de gestor/cobrador.
 * Por eso este DTO y su sesión (TecnicoSessionManager) son un árbol aparte de UsuarioDto/Session.
 */
@Serializable
data class TecnicoDto(
    val id: String,
    val nombre: String,
    val apellido: String,
    val email: String,
)

@Serializable
data class PerfilTecnicoDto(
    val id: String,
    val nombre: String,
    val apellido: String,
    val email: String,
    val telefono: String? = null,
    val zona: String? = null,
    val vehiculo: String? = null,
)
