package com.cablera.app.data.remote.dto

import kotlinx.serialization.Serializable

object EstadosServicio {
    const val ACTIVO = "activo"
    const val SUSPENDIDO = "suspendido"
    const val RETIRADO = "retirado"
}

object EstadosCargo {
    const val PENDIENTE = "pendiente"
    const val PARCIAL = "parcial"
    const val PAGADO = "pagado"
}

/**
 * Cliente de Keysls: solo sus datos personales. Lo que se le cobra vive en cada uno de sus
 * [contratos] (un cliente puede tener varios). `estadoServicio` se deduce del cliente y de sus
 * contratos: "retirado" si el cliente está inactivo o todos sus contratos están de baja,
 * "suspendido" si ninguno de los que siguen vigentes está activo, "activo" en el resto.
 */
@Serializable
data class ClienteDto(
    val id: String,
    val dni: String? = null,
    val nombreCompleto: String,
    val telefono: String? = null,
    val email: String? = null,
    val direccion: String? = null,
    val latitud: Double? = null,
    val longitud: Double? = null,
    val activo: Boolean = true,
    val estadoServicio: String,
    val fechaAlta: String = "",
    val contratos: List<ContratoDto> = emptyList(),
    val deudaTotal: Double = 0.0,
)

data class CreateClienteRequest(
    val dni: String,
    val nombreCompleto: String,
    val telefono: String? = null,
    val email: String? = null,
    val direccion: String? = null,
    val latitud: Double? = null,
    val longitud: Double? = null,
)

/** Cambios sobre un cliente: un campo en `null` se deja como está (ver ClientesRepository.actualizar). */
data class UpdateClienteRequest(
    val dni: String? = null,
    val nombreCompleto: String? = null,
    val telefono: String? = null,
    val email: String? = null,
    val direccion: String? = null,
    val latitud: Double? = null,
    val longitud: Double? = null,
)

/** Un contrato con deuda pendiente, tal cual se lista en Cobranza. */
@Serializable
data class ContratoConDeudaDto(
    val contratoId: String,
    val clienteId: String,
    val clienteNombre: String,
    val dni: String? = null,
    val telefono: String? = null,
    val numero: String,
    val tipoServicio: String,
    /** Zona/sector del contrato: solo hay filtro por zonas si la empresa lo llena. */
    val sector: String? = null,
    val montoBase: Double,
    val suspendido: Boolean,
    val mesesPendientes: String,
    val deudaTotal: Double,
)

@Serializable
data class CargoPendienteDto(
    val id: String,
    val anio: Int,
    val mes: Int,
    val montoCorrespondiente: Double,
    val montoPagado: Double,
    val saldo: Double,
    val estado: String,
    val contratoId: String,
    val numeroContrato: String? = null,
    val tipoServicio: String? = null,
)

@Serializable
data class ClienteFichaDto(
    val cliente: ClienteDto,
    val saldoTotal: Double,
    val cargosMesAMes: List<CargoPendienteDto>,
    val historialPagos: List<BoletaResumenDto>,
    // Últimos servicios técnicos (órdenes de servicio) de sus contratos, del más reciente al más antiguo.
    val serviciosTecnicos: List<OrdenServicioDto> = emptyList(),
)
