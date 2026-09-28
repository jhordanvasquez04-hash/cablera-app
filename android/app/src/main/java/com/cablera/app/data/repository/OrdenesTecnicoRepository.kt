package com.cablera.app.data.repository

import com.cablera.app.data.cache.ApiCache
import com.cablera.app.data.cache.CacheTtl
import com.cablera.app.data.mapper.toPerfil
import com.cablera.app.data.mapper.toUi
import com.cablera.app.data.remote.ApiServiceTecnico
import com.cablera.app.data.remote.dto.CompletarOrdenRequest
import com.cablera.app.data.remote.dto.EstadosOrdenServicio
import com.cablera.app.data.remote.dto.KCompletarOrdenRequest
import com.cablera.app.data.remote.dto.KConsumoRequest
import com.cablera.app.data.remote.dto.OrdenServicioDto
import com.cablera.app.data.remote.dto.PerfilTecnicoDto
import com.cablera.app.data.remote.dto.ProductoPortalDto
import com.cablera.app.data.remote.safeApiCall

class OrdenesTecnicoRepository(private val apiService: ApiServiceTecnico, private val cache: ApiCache) {

    suspend fun perfil(): Result<PerfilTecnicoDto> = safeApiCall { apiService.perfil().tecnico.toPerfil() }

    suspend fun listarEnCache(estado: String?): List<OrdenServicioDto>? = cache.leer(claveLista(estado))

    /**
     * Las órdenes del técnico. En Keysls "en curso" y "cerradas" son dos consultas distintas: sin
     * filtro se devuelven ambas; con filtro solo las de ese estado.
     */
    suspend fun listar(estado: String?): Result<List<OrdenServicioDto>> =
        cache.obtener(claveLista(estado), CacheTtl.LISTA) {
            safeApiCall {
                val cerradas = estado == null || estado == EstadosOrdenServicio.COMPLETADA || estado == EstadosOrdenServicio.CANCELADA
                val enCurso = estado == null || !(estado == EstadosOrdenServicio.COMPLETADA || estado == EstadosOrdenServicio.CANCELADA)
                val ordenes = buildList {
                    if (enCurso) addAll(apiService.listarOrdenes())
                    if (cerradas) addAll(apiService.historialOrdenes())
                }.map { it.toUi() }
                if (estado == null) ordenes else ordenes.filter { it.estado == estado }
            }
        }

    suspend fun obtener(id: String): Result<OrdenServicioDto> = safeApiCall { apiService.obtenerOrden(id).toUi() }

    /** Aceptar una orden todavía libre (pendiente, sin técnico) primero la toma para este técnico. */
    suspend fun aceptar(id: String): Result<OrdenServicioDto> = safeApiCall {
        val orden = apiService.obtenerOrden(id)
        if (orden.estado == "PENDIENTE" && orden.tecnicoId == null) apiService.tomarOrden(id)
        apiService.aceptarOrden(id).toUi()
    }.onSuccess { cache.invalidarDatos() }

    suspend fun iniciar(id: String): Result<OrdenServicioDto> =
        safeApiCall { apiService.iniciarOrden(id).toUi() }.onSuccess { cache.invalidarDatos() }

    suspend fun completar(id: String, request: CompletarOrdenRequest): Result<OrdenServicioDto> = safeApiCall {
        apiService.completarOrden(
            id,
            KCompletarOrdenRequest(
                comentario = request.observacionFinal,
                latitud = request.latitud,
                longitud = request.longitud,
                puntoRedId = request.puntoRedId,
                equipoSerie = request.equipoSerie,
                precinto = request.precinto,
                consumos = request.consumos?.mapNotNull { consumo ->
                    consumo.productoId.toIntOrNull()?.let { KConsumoRequest(it, consumo.cantidad) }
                },
            ),
        ).toUi()
    }.onSuccess { cache.invalidarDatos() }

    suspend fun listarProductos(): Result<List<ProductoPortalDto>> =
        cache.obtener("cat-tec-productos:lista", CacheTtl.CATALOGO) {
            safeApiCall { apiService.listarProductos().data.map { it.toUi() } }
        }

    private fun claveLista(estado: String?) = "tec-ordenes:${estado.orEmpty()}"
}
