package com.cablera.app.data.repository

import com.cablera.app.data.cache.ApiCache
import com.cablera.app.data.cache.CacheTtl
import com.cablera.app.data.remote.ApiService
import com.cablera.app.data.remote.dto.CargoPendienteDto
import com.cablera.app.data.remote.dto.ClienteDto
import com.cablera.app.data.remote.dto.ClienteFichaDto
import com.cablera.app.data.remote.dto.CreateClienteRequest
import com.cablera.app.data.remote.dto.CreateDescuentoRequest
import com.cablera.app.data.remote.dto.DarDeBajaRequest
import com.cablera.app.data.remote.dto.DescuentoDto
import com.cablera.app.data.remote.dto.ServicioContratadoInput
import com.cablera.app.data.remote.dto.UpdateClienteRequest
import com.cablera.app.data.remote.dto.UpdateServicioContratadoRequest
import com.cablera.app.data.remote.safeApiCall

class ClientesRepository(private val apiService: ApiService, private val cache: ApiCache) {

    suspend fun listarEnCache(zonaId: String?, estado: String?, busqueda: String?): List<ClienteDto>? =
        cache.leer(claveLista(zonaId, estado, busqueda))

    suspend fun listar(zonaId: String?, estado: String?, busqueda: String?): Result<List<ClienteDto>> =
        cache.obtener(claveLista(zonaId, estado, busqueda), CacheTtl.LISTA) {
            safeApiCall {
                apiService.listarClientes(
                    zonaId = zonaId?.takeIf { it.isNotBlank() },
                    estado = estado,
                    busqueda = busqueda?.takeIf { it.isNotBlank() },
                )
            }
        }

    // Sin caché a propósito: se usa al registrar pagos y debe reflejar el estado real de la deuda.
    suspend fun obtener(id: String): Result<ClienteDto> = safeApiCall { apiService.obtenerCliente(id) }

    suspend fun fichaEnCache(id: String): ClienteFichaDto? = cache.leer("ficha:$id")

    suspend fun ficha(id: String): Result<ClienteFichaDto> =
        cache.obtener("ficha:$id", CacheTtl.LISTA) { safeApiCall { apiService.obtenerFichaCliente(id) } }

    suspend fun cargosPendientes(id: String): Result<List<CargoPendienteDto>> =
        safeApiCall { apiService.cargosPendientesDeCliente(id) }

    suspend fun crear(request: CreateClienteRequest): Result<ClienteDto> = safeApiCall { apiService.crearCliente(request) }.onSuccess { cache.invalidarDatos() }

    suspend fun actualizar(id: String, request: UpdateClienteRequest): Result<ClienteDto> =
        safeApiCall { apiService.actualizarCliente(id, request) }.onSuccess { cache.invalidarDatos() }

    suspend fun darDeBaja(id: String, motivo: String): Result<ClienteDto> =
        safeApiCall { apiService.darDeBajaCliente(id, DarDeBajaRequest(motivo)) }.onSuccess { cache.invalidarDatos() }

    suspend fun suspender(id: String): Result<ClienteDto> = safeApiCall { apiService.suspenderCliente(id) }.onSuccess { cache.invalidarDatos() }

    suspend fun activar(id: String): Result<ClienteDto> = safeApiCall { apiService.activarCliente(id) }.onSuccess { cache.invalidarDatos() }

    suspend fun agregarServicio(id: String, request: ServicioContratadoInput): Result<ClienteDto> =
        safeApiCall { apiService.agregarServicio(id, request) }.onSuccess { cache.invalidarDatos() }

    suspend fun actualizarServicio(id: String, servicioId: String, request: UpdateServicioContratadoRequest): Result<ClienteDto> =
        safeApiCall { apiService.actualizarServicio(id, servicioId, request) }.onSuccess { cache.invalidarDatos() }

    suspend fun suspenderServicio(id: String, servicioId: String): Result<ClienteDto> =
        safeApiCall { apiService.suspenderServicio(id, servicioId) }.onSuccess { cache.invalidarDatos() }

    suspend fun activarServicio(id: String, servicioId: String): Result<ClienteDto> =
        safeApiCall { apiService.activarServicio(id, servicioId) }.onSuccess { cache.invalidarDatos() }

    suspend fun darDeBajaServicio(id: String, servicioId: String, motivo: String): Result<ClienteDto> =
        safeApiCall { apiService.darDeBajaServicio(id, servicioId, DarDeBajaRequest(motivo)) }.onSuccess { cache.invalidarDatos() }

    suspend fun listarDescuentosDeServicio(id: String, servicioId: String): Result<List<DescuentoDto>> =
        safeApiCall { apiService.listarDescuentosDeServicio(id, servicioId) }

    suspend fun aplicarDescuento(id: String, servicioId: String, request: CreateDescuentoRequest): Result<DescuentoDto> =
        safeApiCall { apiService.aplicarDescuento(id, servicioId, request) }.onSuccess { cache.invalidarDatos() }

    private fun claveLista(zonaId: String?, estado: String?, busqueda: String?) =
        "clientes:${zonaId.orEmpty()}|${estado.orEmpty()}|${busqueda.orEmpty().trim()}"
}
