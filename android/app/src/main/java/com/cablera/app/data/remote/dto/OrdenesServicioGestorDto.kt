package com.cablera.app.data.remote.dto

import kotlinx.serialization.Serializable

/** Para el selector de "asignar técnico" en el panel — no es el TecnicoDto del portal de campo
 * (ese es de la sesión del propio técnico logueado; este es un ítem de catálogo cualquiera). */
@Serializable
data class TecnicoResumenDto(
    val id: String,
    val nombre: String,
    val apellido: String,
    val activo: Boolean,
)
