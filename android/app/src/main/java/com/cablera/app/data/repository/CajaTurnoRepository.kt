package com.cablera.app.data.repository

import com.cablera.app.data.cache.ApiCache
import com.cablera.app.data.mapper.toUi
import com.cablera.app.data.remote.ApiService
import com.cablera.app.data.remote.dto.CajaTurnoDto
import com.cablera.app.data.remote.dto.KAbrirCajaRequest
import com.cablera.app.data.remote.dto.KCerrarCajaRequest
import com.cablera.app.data.remote.safeApiCall

/** Turno de caja con arqueo (apertura con monto inicial, cierre contando el efectivo). En Keysls hay
 * UN turno abierto por empresa, no uno por persona. Sin caché a propósito: es un dato de "ahora". */
class CajaTurnoRepository(private val apiService: ApiService, private val cache: ApiCache) {

    suspend fun turnoAbierto(): Result<CajaTurnoDto?> = safeApiCall { apiService.cajaActual()?.toUi() }

    suspend fun historial(): Result<List<CajaTurnoDto>> = safeApiCall { apiService.cajaHistorial().map { it.toUi() } }

    suspend fun abrir(montoInicial: Double): Result<CajaTurnoDto> =
        safeApiCall { apiService.abrirCaja(KAbrirCajaRequest(montoInicial)).toUi() }.onSuccess { cache.invalidarDatos() }

    // Keysls cierra "el turno abierto": no recibe el id del turno.
    suspend fun cerrar(montoContado: Double, observacion: String?): Result<CajaTurnoDto> =
        safeApiCall { apiService.cerrarCaja(KCerrarCajaRequest(montoContado, observacion)).toUi() }.onSuccess { cache.invalidarDatos() }
}
