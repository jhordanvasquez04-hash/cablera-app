package com.cablera.app.data.repository

import com.cablera.app.data.cache.ApiCache
import com.cablera.app.data.cache.CacheTtl
import com.cablera.app.data.mapper.toUi
import com.cablera.app.data.remote.ApiService
import com.cablera.app.data.remote.dto.ConfiguracionDto
import com.cablera.app.data.remote.dto.KEmpresaRequest
import com.cablera.app.data.remote.dto.UpdateConfiguracionRequest
import com.cablera.app.data.remote.safeApiCall

/** Datos de la empresa de quien tiene sesión (Keysls: /empresa). */
class ConfiguracionRepository(private val apiService: ApiService, private val cache: ApiCache) {

    suspend fun enCache(): ConfiguracionDto? = cache.leer(CLAVE_CONFIG)

    suspend fun obtener(): Result<ConfiguracionDto> =
        cache.obtener(CLAVE_CONFIG, CacheTtl.CATALOGO) { safeApiCall { apiService.obtenerEmpresa().toUi() } }

    suspend fun actualizar(request: UpdateConfiguracionRequest): Result<ConfiguracionDto> = safeApiCall {
        apiService.actualizarEmpresa(
            KEmpresaRequest(
                nombre = request.nombreEmpresa,
                ruc = request.ruc,
                direccion = request.direccionContacto,
                telefono = request.telefonoContacto,
                agencia = request.agencia,
            ),
        ).toUi()
    }.onSuccess {
        cache.invalidarDatos()
        cache.guardar(CLAVE_CONFIG, it)
    }

    private companion object {
        const val CLAVE_CONFIG = "cat-config:actual"
    }
}
