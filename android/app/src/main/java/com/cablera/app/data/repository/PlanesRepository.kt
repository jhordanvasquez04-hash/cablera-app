package com.cablera.app.data.repository

import com.cablera.app.data.cache.ApiCache
import com.cablera.app.data.cache.CacheTtl
import com.cablera.app.data.mapper.toUi
import com.cablera.app.data.remote.ApiService
import com.cablera.app.data.remote.dto.PlanDto
import com.cablera.app.data.remote.safeApiCall

// Catálogo de planes (precio/velocidad sugeridos). Solo lectura desde la app: crear o editar
// planes es cosa del panel web.
class PlanesRepository(private val apiService: ApiService, private val cache: ApiCache) {

    suspend fun enCache(soloActivos: Boolean = true): List<PlanDto>? = cache.leer(clave(soloActivos))

    suspend fun listar(soloActivos: Boolean = true): Result<List<PlanDto>> =
        cache.obtener(clave(soloActivos), CacheTtl.CATALOGO) {
            safeApiCall { apiService.listarPlanes().map { it.toUi() }.filter { !soloActivos || it.activo } }
        }

    private fun clave(soloActivos: Boolean) = "cat-planes:lista:$soloActivos"
}
