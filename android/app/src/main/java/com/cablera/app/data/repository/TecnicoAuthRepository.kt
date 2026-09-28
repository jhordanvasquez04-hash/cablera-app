package com.cablera.app.data.repository

import com.cablera.app.data.cache.ApiCache
import com.cablera.app.data.mapper.toSesion
import com.cablera.app.data.remote.ApiServiceTecnico
import com.cablera.app.data.remote.dto.LoginRequest
import com.cablera.app.data.remote.safeApiCall
import com.cablera.app.data.session.TecnicoSession
import com.cablera.app.data.session.TecnicoSessionManager
import kotlinx.coroutines.flow.Flow

class TecnicoAuthRepository(
    private val apiService: ApiServiceTecnico,
    private val sessionManager: TecnicoSessionManager,
    private val cache: ApiCache,
) {
    val session: Flow<TecnicoSession?> = sessionManager.session

    suspend fun login(email: String, password: String): Result<Unit> =
        safeApiCall { apiService.login(LoginRequest(email, password)) }
            .onSuccess {
                cache.limpiar()
                sessionManager.save(it.token, it.tecnico.toSesion())
            }
            .map {}

    suspend fun logout() {
        // Sin llamada al backend a propósito: el token de técnico no tiene una sesión persistida en
        // el servidor que cerrar; "cerrar sesión" acá es solo borrar el token guardado en el teléfono.
        sessionManager.clear()
        cache.limpiar()
    }

    suspend fun currentSession(): TecnicoSession? = sessionManager.currentSession()
}
