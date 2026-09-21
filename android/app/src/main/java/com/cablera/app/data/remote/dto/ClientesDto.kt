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

@Serializable
data class DescuentoDto(
    val id: String,
    val clienteId: String,
    val servicioContratadoId: String? = null,
    val porcentaje: Int,
    val fechaInicio: String,
    val cantidadMeses: Int? = null,
    val fechaFin: String,
)

@Serializable
data class ServicioContratadoDto(
    val id: String,
    val clienteId: String,
    val tipoServicioId: String,
    val tipoServicio: TipoServicioDto,
    val montoBase: Double,
    val fechaFacturacionOverride: Int? = null,
    val estado: String,
    val fechaAlta: String,
    val fechaBaja: String? = null,
    val motivoBaja: String? = null,
    val montoEfectivo: Double,
    val descuentoVigente: DescuentoDto? = null,
    val deudaTotal: Double,
)

@Serializable
data class ClienteDto(
    val id: String,
    val numeroContrato: String,
    val dni: String? = null,
    val nombreCompleto: String,
    val telefono: String? = null,
    val direccion: String? = null,
    val zonaId: String,
    val zona: ZonaDto,
    val estadoServicio: String,
    val fechaAlta: String,
    val fechaBaja: String? = null,
    val motivoBaja: String? = null,
    val serviciosContratados: List<ServicioContratadoDto> = emptyList(),
    val deudaTotal: Double,
    val montoEfectivo: Double,
    val montoBase: Double,
)

@Serializable
data class ServicioContratadoInput(
    val tipoServicioId: String,
    val montoBase: Double,
    val fechaFacturacionOverride: Int? = null,
)

@Serializable
data class CreateClienteRequest(
    val dni: String? = null,
    val nombreCompleto: String,
    val telefono: String? = null,
    val direccion: String? = null,
    val zonaId: String,
    val servicios: List<ServicioContratadoInput>,
)

@Serializable
data class UpdateClienteRequest(
    val dni: String? = null,
    val nombreCompleto: String? = null,
    val telefono: String? = null,
    val direccion: String? = null,
    val zonaId: String? = null,
)

@Serializable
data class UpdateServicioContratadoRequest(
    val tipoServicioId: String? = null,
    val montoBase: Double? = null,
    val fechaFacturacionOverride: Int? = null,
)

@Serializable
data class DarDeBajaRequest(val motivo: String)

@Serializable
data class CreateDescuentoRequest(
    val porcentaje: Int,
    val cantidadMeses: Int? = null,
    val fechaFin: String? = null,
)

@Serializable
data class ClienteConDeudaDto(
    val id: String,
    val numeroContrato: String,
    val nombreCompleto: String,
    val dni: String? = null,
    val telefono: String? = null,
    val zona: ZonaResumenDto,
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
    val servicioContratadoId: String? = null,
    val tipoServicio: TipoServicioDto? = null,
)

@Serializable
data class ClienteFichaDto(
    val cliente: ClienteDto,
    val saldoTotal: Double,
    val cargosMesAMes: List<CargoPendienteDto>,
    val historialPagos: List<BoletaResumenDto>,
)
