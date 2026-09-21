package com.cablera.app.data.repository

import com.cablera.app.data.cache.ApiCache
import com.cablera.app.data.cache.CacheTtl
import com.cablera.app.data.remote.ApiService
import com.cablera.app.data.remote.dto.ConfiguracionDto
import com.cablera.app.data.remote.dto.CreateTipoServicioRequest
import com.cablera.app.data.remote.dto.CreateUsuarioRequest
import com.cablera.app.data.remote.dto.TipoServicioDto
import com.cablera.app.data.remote.dto.UpdateConfiguracionRequest
import com.cablera.app.data.remote.dto.UsuarioListadoDto
import com.cablera.app.data.remote.safeApiCall
import okhttp3.MultipartBody
import okhttp3.ResponseBody

class ConfiguracionRepository(private val apiService: ApiService, private val cache: ApiCache) {

    suspend fun enCache(): ConfiguracionDto? = cache.leer(CLAVE_CONFIG)

    suspend fun obtener(): Result<ConfiguracionDto> =
        cache.obtener(CLAVE_CONFIG, CacheTtl.CATALOGO) { safeApiCall { apiService.obtenerConfiguracion() } }

    suspend fun actualizar(request: UpdateConfiguracionRequest): Result<ConfiguracionDto> =
        safeApiCall { apiService.actualizarConfiguracion(request) }.alCambiarConfiguracion()

    suspend fun subirLogo(archivo: MultipartBody.Part): Result<ConfiguracionDto> =
        safeApiCall { apiService.subirLogo(archivo) }.alCambiarConfiguracion()

    suspend fun quitarLogo(): Result<ConfiguracionDto> = safeApiCall { apiService.quitarLogo() }.alCambiarConfiguracion()

    suspend fun listarUsuarios(): Result<List<UsuarioListadoDto>> = safeApiCall { apiService.listarUsuarios() }

    suspend fun crearUsuario(request: CreateUsuarioRequest): Result<UsuarioListadoDto> =
        safeApiCall { apiService.crearUsuario(request) }

    suspend fun listarTiposServicio(): Result<List<TipoServicioDto>> =
        cache.obtener("cat-tipos:lista", CacheTtl.CATALOGO) { safeApiCall { apiService.listarTiposServicio() } }

    suspend fun crearTipoServicio(nombre: String): Result<TipoServicioDto> =
        safeApiCall { apiService.crearTipoServicio(CreateTipoServicioRequest(nombre)) }
            .onSuccess { cache.invalidar("cat-tipos") }

    suspend fun descargarBackup(): Result<ResponseBody> = safeApiCall { apiService.descargarBackupExcel() }

    /** La marca y el día de facturación afectan a lo que muestran otras pantallas: se descarta lo guardado. */
    private suspend fun Result<ConfiguracionDto>.alCambiarConfiguracion(): Result<ConfiguracionDto> = onSuccess {
        cache.invalidarDatos()
        cache.guardar(CLAVE_CONFIG, it)
    }

    private companion object {
        const val CLAVE_CONFIG = "cat-config:actual"
    }
}
