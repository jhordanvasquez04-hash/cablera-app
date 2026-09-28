package com.cablera.app.data.remote.dto

import kotlinx.serialization.Serializable

object EstadosOrdenServicio {
    const val PENDIENTE = "pendiente"
    const val ASIGNADA = "asignada"
    const val EN_PROCESO = "en_proceso"
    const val COMPLETADA = "completada"
    const val CANCELADA = "cancelada"
}

@Serializable
data class ContratoResumenDto(
    val id: String,
    val numero: String,
)

@Serializable
data class PlanResumenDto(val id: String, val nombre: String)

@Serializable
data class TecnicoOrdenResumenDto(val id: String, val nombre: String, val apellido: String)

/**
 * Orden de servicio (panel y portal del técnico). Se arma desde KOrden: en Keysls el tipo de
 * orden trae el servicio como sufijo ("AVERIA_I"), acá se separa en `tipoOrden` ("averia") y
 * `tipoServicio` ("internet"), y los estados vienen en minúscula ("en_proceso").
 */
@Serializable
data class OrdenServicioDto(
    val id: String,
    val nServicio: String,
    val tipoOrden: String,
    val tipoServicio: String,
    val estado: String,
    val contratoId: String? = null,
    val contrato: ContratoResumenDto? = null,
    val fechaServicio: String,
    val abonado: String,
    val dni: String? = null,
    val direccion: String,
    val referencia: String? = null,
    val sector: String? = null,
    val celular: String? = null,
    val observacion: String? = null,
    val tecnicoId: String? = null,
    val tecnico: TecnicoOrdenResumenDto? = null,
    val fechaAsignacion: String? = null,
    val fechaAceptacion: String? = null,
    val fechaInicio: String? = null,
    val fechaFin: String? = null,
    val tiempoInstalacionMin: Int? = null,
    val ipWan: String? = null,
    val mascara: String? = null,
    val gateway: String? = null,
    val pppoeUsuario: String? = null,
    val pppoePassword: String? = null,
    val latitud: Double? = null,
    val longitud: Double? = null,
    val precinto: String? = null,
    val mensualidad: Double? = null,
    val mbps: Int? = null,
    val planId: String? = null,
    val plan: PlanResumenDto? = null,
)

/** Datos para crear una orden de servicio desde la app (servicio técnico). */
data class CreateOrdenRequest(
    val contratoId: String,
    /** Tipo sin sufijo de servicio, en minúscula (ej. "averia"). */
    val tipoOrden: String,
    /** "internet" | "cable" | "duo": decide el sufijo del tipo en Keysls. */
    val tipoServicio: String,
    val abonado: String,
    val dni: String? = null,
    val direccion: String,
    val referencia: String? = null,
    val sector: String? = null,
    val celular: String? = null,
    val observacion: String? = null,
    /** Si viene, la orden se crea y se asigna de inmediato a ese técnico. */
    val tecnicoId: String? = null,
)

/** Tipos de orden que Keysls permite según el servicio del contrato. */
object TiposOrdenPorServicio {
    private val INTERNET = listOf(
        "instalacion", "alta_servicio", "atencion_noc", "averia", "baja_servicio", "cambio_contrasena",
        "cambio_domicilio", "cambio_equipo", "cambio_plan", "cambio_titular", "corte_solicitud", "corte_deuda",
        "reconexion", "retiro_equipo", "traslado",
    )
    private val CABLE = listOf(
        "instalacion", "alta_servicio", "averia", "cambio_domicilio", "cambio_plan", "cambio_titular",
        "corte_solicitud", "corte_deuda", "instalacion_anexo", "migracion_ftth", "reconexion", "retiro_equipo",
        "supervision", "traslado",
    )
    private val DUO = listOf(
        "instalacion", "alta_servicio", "averia", "cambio_domicilio", "cambio_equipo", "cambio_plan",
        "cambio_titular", "corte_solicitud", "corte_deuda", "reconexion", "retiro_equipo", "traslado", "baja_servicio",
    )

    fun de(tipoServicio: String): List<String> = when (tipoServicio) {
        "cable" -> CABLE
        "duo" -> DUO
        else -> INTERNET
    }

    /** "averia" + "internet" -> "AVERIA_I". */
    fun aKeysls(tipoOrden: String, tipoServicio: String): String {
        val sufijo = when (tipoServicio) {
            "cable" -> "C"
            "duo" -> "D"
            else -> "I"
        }
        return "${tipoOrden.uppercase()}_$sufijo"
    }
}

/**
 * Datos al completar una orden DESDE EL PANEL (igual que la web): una instalación pide el punto de red
 * (equipo y serie son opcionales) y un cambio de titular pide el nuevo titular. Se puede completar aunque
 * la orden no tenga técnico asignado.
 */
data class CompletarOrdenPanelRequest(
    val puntoRedId: String? = null,
    val equipoSerie: String? = null,
    val nuevoClienteId: String? = null,
    val celular: String? = null,
)

data class ConsumoItemRequest(val productoId: String, val cantidad: Double)

/** Lo que el técnico registra al completar una orden (Keysls: PATCH /tecnico/ordenes/:id/completar). */
data class CompletarOrdenRequest(
    val observacionFinal: String? = null,
    val latitud: Double? = null,
    val longitud: Double? = null,
    val puntoRedId: String? = null,
    val equipoSerie: String? = null,
    val precinto: String? = null,
    val consumos: List<ConsumoItemRequest>? = null,
)

@Serializable
data class ProductoPortalDto(
    val id: String,
    val nombre: String,
    val unidad: String? = null,
    val esMedible: Boolean = false,
    val stockTotal: Int = 0,
    val metrosDisponibles: Double? = null,
)
