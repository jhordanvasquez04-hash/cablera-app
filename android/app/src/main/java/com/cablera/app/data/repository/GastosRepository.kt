package com.cablera.app.data.repository

import com.cablera.app.data.cache.ApiCache
import com.cablera.app.data.remote.ApiService
import com.cablera.app.data.remote.dto.ReportarGastoRequest
import com.cablera.app.data.remote.safeApiCall

class GastosRepository(private val apiService: ApiService, private val cache: ApiCache) {
    suspend fun reportar(monto: Double, descripcion: String): Result<Unit> =
        safeApiCall { apiService.reportarGasto(ReportarGastoRequest(monto, descripcion)) }
            .onSuccess { cache.invalidarDatos() }
            .map {}
}
