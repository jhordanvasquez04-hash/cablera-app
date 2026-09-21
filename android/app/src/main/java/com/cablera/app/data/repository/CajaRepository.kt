package com.cablera.app.data.repository

import com.cablera.app.data.cache.ApiCache
import com.cablera.app.data.cache.CacheTtl
import com.cablera.app.data.remote.ApiService
import com.cablera.app.data.remote.dto.AprobarGastoRequest
import com.cablera.app.data.remote.dto.CategoriaEgresoDto
import com.cablera.app.data.remote.dto.CreateCategoriaEgresoRequest
import com.cablera.app.data.remote.dto.CreateMovimientoRequest
import com.cablera.app.data.remote.dto.EstadosGastoReportado
import com.cablera.app.data.remote.dto.GastoReportadoDto
import com.cablera.app.data.remote.dto.MovimientoCajaDto
import com.cablera.app.data.remote.dto.ResumenCajaDto
import com.cablera.app.data.remote.safeApiCall

class CajaRepository(private val apiService: ApiService, private val cache: ApiCache) {

    suspend fun resumenEnCache(desde: String? = null, hasta: String? = null): ResumenCajaDto? =
        cache.leer(claveRango("caja-resumen", desde, hasta))

    suspend fun resumen(desde: String? = null, hasta: String? = null): Result<ResumenCajaDto> =
        cache.obtener(claveRango("caja-resumen", desde, hasta), CacheTtl.LISTA) {
            safeApiCall { apiService.resumenCaja(desde, hasta) }
        }

    suspend fun movimientosEnCache(desde: String? = null, hasta: String? = null): List<MovimientoCajaDto>? =
        cache.leer(claveRango("caja-movimientos", desde, hasta))

    suspend fun movimientos(desde: String? = null, hasta: String? = null): Result<List<MovimientoCajaDto>> =
        cache.obtener(claveRango("caja-movimientos", desde, hasta), CacheTtl.LISTA) {
            safeApiCall { apiService.listarMovimientosCaja(desde, hasta) }
        }

    suspend fun registrarMovimiento(request: CreateMovimientoRequest): Result<MovimientoCajaDto> =
        safeApiCall { apiService.crearMovimientoCaja(request) }.onSuccess { cache.invalidarDatos() }

    suspend fun gastosPendientes(): Result<List<GastoReportadoDto>> =
        cache.obtener("caja-gastos:pendientes", CacheTtl.LISTA) {
            safeApiCall { apiService.listarGastosReportados(EstadosGastoReportado.PENDIENTE) }
        }

    suspend fun aprobarGasto(id: String, metodoPago: String): Result<GastoReportadoDto> =
        safeApiCall { apiService.aprobarGasto(id, AprobarGastoRequest(metodoPago)) }.onSuccess { cache.invalidarDatos() }

    suspend fun rechazarGasto(id: String): Result<GastoReportadoDto> =
        safeApiCall { apiService.rechazarGasto(id) }.onSuccess { cache.invalidarDatos() }

    suspend fun listarCategorias(): Result<List<CategoriaEgresoDto>> =
        cache.obtener("cat-categorias:lista", CacheTtl.CATALOGO) { safeApiCall { apiService.listarCategoriasEgreso() } }

    suspend fun crearCategoria(nombre: String): Result<CategoriaEgresoDto> =
        safeApiCall { apiService.crearCategoriaEgreso(CreateCategoriaEgresoRequest(nombre)) }
            .onSuccess { cache.invalidar("cat-categorias") }

    private fun claveRango(grupo: String, desde: String?, hasta: String?) = "$grupo:${desde.orEmpty()}|${hasta.orEmpty()}"
}
