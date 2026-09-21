package com.cablera.app.data.repository

import com.cablera.app.data.cache.ApiCache
import com.cablera.app.data.cache.CacheTtl
import com.cablera.app.data.remote.ApiService
import com.cablera.app.data.remote.dto.ComentarServicioRequest
import com.cablera.app.data.remote.dto.CreateServicioTecnicoRequest
import com.cablera.app.data.remote.dto.CreateTipoServicioTecnicoRequest
import com.cablera.app.data.remote.dto.LiquidarServicioRequest
import com.cablera.app.data.remote.dto.ServicioTecnicoDto
import com.cablera.app.data.remote.dto.TipoServicioTecnicoDto
import com.cablera.app.data.remote.dto.UpdateTipoServicioTecnicoRequest
import com.cablera.app.data.remote.safeApiCall

class ServiciosTecnicosRepository(private val apiService: ApiService, private val cache: ApiCache) {

    suspend fun listarTipos(): Result<List<TipoServicioTecnicoDto>> =
        cache.obtener("cat-tst:lista", CacheTtl.CATALOGO) { safeApiCall { apiService.listarTiposServicioTecnico() } }

    suspend fun crearTipo(nombre: String, camposDefinicion: List<String>): Result<TipoServicioTecnicoDto> =
        safeApiCall { apiService.crearTipoServicioTecnico(CreateTipoServicioTecnicoRequest(nombre, camposDefinicion)) }
            .onSuccess { cache.invalidar("cat-tst") }

    suspend fun actualizarTipo(id: String, nombre: String?, camposDefinicion: List<String>?): Result<TipoServicioTecnicoDto> =
        safeApiCall { apiService.actualizarTipoServicioTecnico(id, UpdateTipoServicioTecnicoRequest(nombre, camposDefinicion)) }
            .onSuccess {
                cache.invalidar("cat-tst")
                cache.invalidarDatos()
            }

    suspend fun listarEnCache(estado: String?, tipoServicioTecnicoId: String?, clienteId: String?): List<ServicioTecnicoDto>? =
        cache.leer(claveLista(estado, tipoServicioTecnicoId, clienteId))

    suspend fun listar(estado: String?, tipoServicioTecnicoId: String?, clienteId: String?): Result<List<ServicioTecnicoDto>> =
        cache.obtener(claveLista(estado, tipoServicioTecnicoId, clienteId), CacheTtl.LISTA) {
            safeApiCall { apiService.listarServiciosTecnicos(estado, tipoServicioTecnicoId, clienteId) }
        }

    suspend fun crear(request: CreateServicioTecnicoRequest): Result<ServicioTecnicoDto> =
        safeApiCall { apiService.crearServicioTecnico(request) }.onSuccess { cache.invalidarDatos() }

    suspend fun comentar(id: String, comentario: String): Result<ServicioTecnicoDto> =
        safeApiCall { apiService.comentarServicioTecnico(id, ComentarServicioRequest(comentario)) }
            .onSuccess { cache.invalidarDatos() }

    suspend fun liquidar(id: String, comentarioFinal: String? = null): Result<ServicioTecnicoDto> =
        safeApiCall { apiService.liquidarServicioTecnico(id, LiquidarServicioRequest(comentarioFinal)) }
            .onSuccess { cache.invalidarDatos() }

    private fun claveLista(estado: String?, tipoId: String?, clienteId: String?) =
        "st:${estado.orEmpty()}|${tipoId.orEmpty()}|${clienteId.orEmpty()}"
}
