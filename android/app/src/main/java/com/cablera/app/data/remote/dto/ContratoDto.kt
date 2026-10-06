package com.cablera.app.data.remote.dto

import kotlinx.serialization.Serializable

// Modelo de UI del CONTRATO de Keysls: un cliente puede tener varios, y cada uno es a la vez lo que
// se factura mes a mes (tipo de servicio, plan, costo, día de corte) y la ficha técnica de la
// instalación (dirección, IP, PPPoE, punto de red, ...). Se arma a partir de KContrato en
// `data/mapper/KeyslsMappers.kt`.

object EstadosContrato {
    const val ACTIVO = "activo"
    const val SUSPENDIDO = "suspendido"
    const val CORTADO = "cortado"
    const val BAJA = "baja"
}

@Serializable
data class PuntoRedResumenDto(val id: String, val codigo: String, val tipo: String)

@Serializable
data class TecnicoInstaladorResumenDto(val id: String, val nombre: String, val apellido: String)

@Serializable
data class EquipoProductoResumenDto(val id: String, val nombre: String, val codigo: String? = null)

@Serializable
data class ContratoDto(
    val id: String,
    /** Correlativo del contrato (ej. "C00000000006"). */
    val numero: String,
    val estado: String,
    /** "internet" | "cable" | "duo" */
    val tipoServicio: String,
    val clienteId: String,
    val clienteNombre: String,
    val clienteDni: String? = null,
    val clienteTelefono: String? = null,
    val planId: String? = null,
    val planNombre: String? = null,
    val mbps: Int? = null,
    val costoMensual: Double = 0.0,
    val diaCorte: Int? = null,
    val deudaPendiente: Double = 0.0,
    val mesesPendientes: Int = 0,
    val direccion: String? = null,
    val referencia: String? = null,
    val sector: String? = null,
    val ipWan: String? = null,
    val mascara: String? = null,
    val gateway: String? = null,
    val pppoeUsuario: String? = null,
    val pppoePassword: String? = null,
    // Ubicación del servicio — propia de este contrato, no del cliente (un cliente puede sacar
    // contratos para casas distintas).
    val latitud: Double? = null,
    val longitud: Double? = null,
    val precinto: String? = null,
    val equipoSerie: String? = null,
    val puntoRedId: String? = null,
    val puntoRed: PuntoRedResumenDto? = null,
    val tecnicoInstaladorId: String? = null,
    val tecnicoInstalador: TecnicoInstaladorResumenDto? = null,
    val equipoProducto: EquipoProductoResumenDto? = null,
    val fechaInstalacion: String? = null,
    val motivoBaja: String? = null,
    val fechaCorte: String? = null,
)

/** Datos para crear un contrato nuevo (POST /contratos). */
data class CreateContratoRequest(
    val clienteId: String,
    val tipoServicio: String,
    val direccion: String,
    val diaCorte: Int,
    val planId: String? = null,
    val costoMensual: Double? = null,
    val referencia: String? = null,
    val sector: String? = null,
    val ipWan: String? = null,
    val pppoeUsuario: String? = null,
    val pppoePassword: String? = null,
    val latitud: Double? = null,
    val longitud: Double? = null,
    val precinto: String? = null,
    val puntoRedId: String? = null,
    val equipoSerie: String? = null,
    val tecnicoInstaladorId: String? = null,
)

/**
 * Cambios sobre un contrato existente. Un campo en `null` se deja como está: la API de Keysls
 * exige el contrato completo al editar, así que el repositorio parte del contrato actual y solo
 * pisa lo que llega distinto de null.
 */
data class UpdateContratoRequest(
    val direccion: String? = null,
    val referencia: String? = null,
    val sector: String? = null,
    val ipWan: String? = null,
    val pppoeUsuario: String? = null,
    val pppoePassword: String? = null,
    val latitud: Double? = null,
    val longitud: Double? = null,
    val precinto: String? = null,
    val puntoRedId: String? = null,
    val equipoSerie: String? = null,
    val tecnicoInstaladorId: String? = null,
    val costoMensual: Double? = null,
    val diaCorte: Int? = null,
    val planId: String? = null,
)
