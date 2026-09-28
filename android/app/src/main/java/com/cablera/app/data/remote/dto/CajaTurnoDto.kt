package com.cablera.app.data.remote.dto

import kotlinx.serialization.Serializable

object EstadosCajaTurno {
    const val ABIERTA = "abierta"
    const val CERRADA = "cerrada"
}

@Serializable
data class UsuarioTurnoResumenDto(val id: String, val nombre: String)

// Fusión con Keysls: modo de caja "apertura_cierre" (arqueo), alternativa al modo "resumen"
// que ya tenía cablera — ver Configuracion.modoCaja. Un turno se abre con un monto inicial y
// se cierra contando el efectivo real; el backend calcula lo esperado y la diferencia.
@Serializable
data class CajaTurnoDto(
    val id: String,
    val usuarioApertura: UsuarioTurnoResumenDto,
    val fechaApertura: String,
    val montoInicial: Double,
    val usuarioCierre: UsuarioTurnoResumenDto? = null,
    val fechaCierre: String? = null,
    val montoEsperado: Double? = null,
    val montoContado: Double? = null,
    val diferencia: Double? = null,
    val observacion: String? = null,
    val estado: String,
)

@Serializable
data class AbrirTurnoRequest(val montoInicial: Double)

@Serializable
data class CerrarTurnoRequest(val montoContado: Double, val observacion: String? = null)
