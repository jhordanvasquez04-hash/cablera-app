package com.cablera.app.data.repository

import com.cablera.app.data.cache.ApiCache
import com.cablera.app.data.cache.CacheTtl
import com.cablera.app.data.remote.ApiService
import com.cablera.app.data.remote.dto.BoletaDetalleDto
import com.cablera.app.data.remote.dto.BoletaResumenDto
import com.cablera.app.data.remote.dto.RegistrarPagoRequest
import com.cablera.app.data.remote.safeApiCall

class BoletasRepository(private val apiService: ApiService, private val cache: ApiCache) {

    suspend fun registrarPago(
        clienteId: String,
        cargoIds: List<String>,
        montoPagado: Double,
        metodoPago: String,
    ): Result<String> = safeApiCall {
        apiService.registrarPago(RegistrarPagoRequest(clienteId, cargoIds, montoPagado, metodoPago)).id
    }.onSuccess { cache.invalidarDatos() }

    suspend fun listarEnCache(busqueda: String?): List<BoletaResumenDto>? = cache.leer(claveLista(busqueda))

    suspend fun listar(busqueda: String?): Result<List<BoletaResumenDto>> =
        cache.obtener(claveLista(busqueda), CacheTtl.LISTA) {
            safeApiCall { apiService.listarBoletas(busqueda?.takeIf { it.isNotBlank() }) }
        }

    suspend fun obtenerEnCache(id: String): BoletaDetalleDto? = cache.leer("boleta:$id")

    suspend fun obtener(id: String): Result<BoletaDetalleDto> =
        cache.obtener("boleta:$id", CacheTtl.LISTA) { safeApiCall { apiService.obtenerBoleta(id) } }

    suspend fun anular(id: String): Result<BoletaDetalleDto> =
        safeApiCall { apiService.anularBoleta(id, emptyMap()) }.onSuccess { cache.invalidarDatos() }

    private fun claveLista(busqueda: String?) = "boletas:${busqueda.orEmpty().trim()}"
}
