package com.cablera.app.data.repository

import com.cablera.app.data.cache.ApiCache
import com.cablera.app.data.cache.CacheTtl
import com.cablera.app.data.mapper.aKeysls
import com.cablera.app.data.mapper.toUi
import com.cablera.app.data.remote.ApiService
import com.cablera.app.data.remote.dto.ContratoDto
import com.cablera.app.data.remote.dto.CreateContratoRequest
import com.cablera.app.data.remote.dto.EstadosContrato
import com.cablera.app.data.remote.dto.KContrato
import com.cablera.app.data.remote.dto.KContratoRequest
import com.cablera.app.data.remote.dto.PuntoRedResumenDto
import com.cablera.app.data.remote.dto.UpdateContratoRequest
import com.cablera.app.data.remote.safeApiCall
import java.time.Instant

/**
 * Contratos de Keysls: cada uno es el servicio que se factura y, a la vez, su ficha técnica.
 * La API exige el contrato COMPLETO al editar (PUT), así que todos los cambios parten del contrato
 * actual y solo pisan lo que cambia (ver [KContrato.comoSolicitud]).
 */
class ContratosRepository(private val apiService: ApiService, private val cache: ApiCache) {

    suspend fun listarEnCache(busqueda: String?, sector: String?, offset: Int): Pagina<ContratoDto>? =
        cache.leer(claveLista(busqueda, sector, offset))

    /** Una página de contratos (10); el buscador y la zona se filtran en el servidor. */
    suspend fun listar(busqueda: String?, sector: String?, offset: Int): Result<Pagina<ContratoDto>> =
        cache.obtener(claveLista(busqueda, sector, offset), CacheTtl.LISTA) {
            safeApiCall {
                val q = busqueda?.trim()?.takeIf { it.isNotEmpty() }
                val pagina = paginar(offset) { limit, desde -> apiService.listarContratos(q = q, sector = sector, limit = limit, offset = desde) }
                Pagina(pagina.items.map { it.toUi() }, pagina.hayMas)
            }
        }

    /** Zonas que usa la empresa (sectores de sus contratos). Vacío = no usa zonas: no se muestra el filtro. */
    suspend fun sectores(): Result<List<String>> =
        cache.obtener("sectores:lista", CacheTtl.LISTA) { safeApiCall { apiService.listarSectores() } }

    // Sin caché a propósito: el detalle se abre justo después de editar y debe ser lo último.
    suspend fun obtener(id: String): Result<ContratoDto> = safeApiCall { apiService.obtenerContrato(id).toUi() }

    suspend fun crear(request: CreateContratoRequest): Result<ContratoDto> = safeApiCall {
        apiService.crearContrato(
            KContratoRequest(
                clienteId = request.clienteId,
                direccion = request.direccion,
                tipoServicio = request.tipoServicio.aKeysls(),
                diaCorte = request.diaCorte,
                referencia = request.referencia,
                sector = request.sector,
                ipWan = request.ipWan,
                pppoeUsuario = request.pppoeUsuario,
                pppoePassword = request.pppoePassword,
                latitud = request.latitud,
                longitud = request.longitud,
                precinto = request.precinto,
                planId = request.planId,
                costoMensual = request.costoMensual,
                puntoRedId = request.puntoRedId,
                equipoSerie = request.equipoSerie,
                tecnicoInstaladorId = request.tecnicoInstaladorId,
                // Sin fechaInstalacion a propósito (igual que la web): la fija la orden de
                // instalación al completarse, y recién ahí empieza a facturarse el contrato.
            ),
        ).toUi()
    }.onSuccess { cache.invalidarDatos() }

    suspend fun actualizar(id: String, request: UpdateContratoRequest): Result<ContratoDto> = safeApiCall {
        val actual = apiService.obtenerContrato(id)
        apiService.actualizarContrato(
            id,
            actual.comoSolicitud().copy(
                direccion = request.direccion ?: actual.direccion.orEmpty().ifBlank { "-" },
                referencia = request.referencia ?: actual.referencia,
                sector = request.sector ?: actual.sector,
                ipWan = request.ipWan ?: actual.ipWan,
                pppoeUsuario = request.pppoeUsuario ?: actual.pppoeUsuario,
                pppoePassword = request.pppoePassword ?: actual.pppoePassword,
                latitud = request.latitud ?: actual.latitud,
                longitud = request.longitud ?: actual.longitud,
                precinto = request.precinto ?: actual.precinto,
                puntoRedId = request.puntoRedId ?: actual.puntoRedId,
                equipoSerie = request.equipoSerie ?: actual.equipoSerie,
                tecnicoInstaladorId = request.tecnicoInstaladorId ?: actual.tecnicoInstaladorId,
                costoMensual = request.costoMensual ?: actual.costoMensual,
                diaCorte = request.diaCorte ?: actual.diaCorte ?: 1,
                planId = request.planId ?: actual.planId,
            ),
        ).toUi()
    }.onSuccess { cache.invalidarDatos() }

    suspend fun suspender(id: String): Result<ContratoDto> = cambiarEstado(id, EstadosContrato.SUSPENDIDO)

    suspend fun activar(id: String): Result<ContratoDto> = cambiarEstado(id, EstadosContrato.ACTIVO)

    suspend fun cortar(id: String): Result<ContratoDto> = cambiarEstado(id, EstadosContrato.CORTADO)

    suspend fun darDeBaja(id: String, motivo: String): Result<ContratoDto> = cambiarEstado(id, EstadosContrato.BAJA, motivo)

    private fun claveLista(busqueda: String?, sector: String?, offset: Int) =
        "contratos:${busqueda.orEmpty().trim()}|${sector.orEmpty()}|$offset"

    suspend fun listarPuntosRed(): Result<List<PuntoRedResumenDto>> =
        cache.obtener("cat-puntos-red:lista", CacheTtl.CATALOGO) {
            safeApiCall { apiService.listarPuntosRed().map { it.toUi() } }
        }

    private suspend fun cambiarEstado(id: String, estado: String, motivo: String? = null): Result<ContratoDto> = safeApiCall {
        val actual = apiService.obtenerContrato(id)
        apiService.actualizarContrato(
            id,
            actual.comoSolicitud().copy(
                estado = estado.aKeysls(),
                motivoBaja = if (estado == EstadosContrato.BAJA) motivo else actual.motivoBaja,
                fechaBaja = if (estado == EstadosContrato.BAJA) Instant.now().toString() else actual.fechaBaja,
            ),
        ).toUi()
    }.onSuccess { cache.invalidarDatos() }
}

/** El contrato tal cual está hoy, en la forma completa que exige PUT /contratos/:id. */
internal fun KContrato.comoSolicitud() = KContratoRequest(
    clienteId = clienteId,
    direccion = direccion.orEmpty().ifBlank { "-" },
    tipoServicio = tipoServicio,
    diaCorte = diaCorte ?: 1,
    referencia = referencia,
    sector = sector,
    ipWan = ipWan,
    mascara = mascara,
    gateway = gateway,
    pppoeUsuario = pppoeUsuario,
    pppoePassword = pppoePassword,
    latitud = latitud,
    longitud = longitud,
    precinto = precinto,
    planId = planId,
    mbps = mbps,
    costoMensual = costoMensual,
    puntoRedId = puntoRedId,
    equipoProductoId = equipoProductoId,
    equipoSerie = equipoSerie,
    tecnicoInstaladorId = tecnicoInstaladorId,
    fechaInstalacion = fechaInstalacion,
    estado = estado,
    motivoBaja = motivoBaja,
    fechaBaja = fechaBaja,
)
