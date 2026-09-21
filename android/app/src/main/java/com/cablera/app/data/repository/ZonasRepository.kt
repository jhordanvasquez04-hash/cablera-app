package com.cablera.app.data.repository

import com.cablera.app.data.cache.ApiCache
import com.cablera.app.data.cache.CacheTtl
import com.cablera.app.data.remote.ApiService
import com.cablera.app.data.remote.dto.ZonaDto
import com.cablera.app.data.remote.safeApiCall

class ZonasRepository(private val apiService: ApiService, private val cache: ApiCache) {

    suspend fun enCache(): List<ZonaDto>? = cache.leer(CLAVE)

    suspend fun listar(): Result<List<ZonaDto>> =
        cache.obtener(CLAVE, CacheTtl.CATALOGO) { safeApiCall { apiService.listarZonas() } }

    private companion object {
        const val CLAVE = "cat-zonas:lista"
    }
}
