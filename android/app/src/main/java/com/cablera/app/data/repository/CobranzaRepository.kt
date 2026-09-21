package com.cablera.app.data.repository

import com.cablera.app.data.cache.ApiCache
import com.cablera.app.data.cache.CacheTtl
import com.cablera.app.data.remote.ApiService
import com.cablera.app.data.remote.dto.ResumenCobranzaDto
import com.cablera.app.data.remote.safeApiCall

class CobranzaRepository(private val apiService: ApiService, private val cache: ApiCache) {

    suspend fun resumenEnCache(zonaId: String?, busqueda: String?): ResumenCobranzaDto? =
        cache.leer(clave(zonaId, busqueda))

    suspend fun resumen(zonaId: String?, busqueda: String?): Result<ResumenCobranzaDto> =
        cache.obtener(clave(zonaId, busqueda), CacheTtl.LISTA) {
            safeApiCall {
                apiService.resumenCobranza(
                    zonaId = zonaId?.takeIf { it.isNotBlank() },
                    busqueda = busqueda?.takeIf { it.isNotBlank() },
                )
            }
        }

    private fun clave(zonaId: String?, busqueda: String?) = "cobranza:${zonaId.orEmpty()}|${busqueda.orEmpty().trim()}"
}
