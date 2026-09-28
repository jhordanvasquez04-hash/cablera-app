package com.cablera.app.data.repository

import com.cablera.app.data.cache.ApiCache
import com.cablera.app.data.mapper.toUi
import com.cablera.app.data.remote.ApiService
import com.cablera.app.data.remote.dto.LoginRequest
import com.cablera.app.data.remote.safeApiCall
import com.cablera.app.data.session.Session
import com.cablera.app.data.session.SessionManager
import kotlinx.coroutines.flow.Flow

class AuthRepository(
    private val apiService: ApiService,
    private val sessionManager: SessionManager,
    private val cache: ApiCache,
) {
    val session: Flow<Session?> = sessionManager.session

    suspend fun login(email: String, password: String): Result<Unit> {
        val respuesta = safeApiCall { apiService.login(LoginRequest(email, password)) }
        val login = respuesta.getOrElse { return Result.failure(it) }
        // La cuenta de plataforma (SUPERADMIN) no pertenece a ninguna empresa: no opera desde la app.
        if (login.usuario.rol == "SUPERADMIN") {
            return Result.failure(Exception("Esta cuenta administra la plataforma y no puede usar la app."))
        }
        // Lo guardado pertenece al usuario anterior (otra empresa, otro rol): se descarta.
        cache.limpiar()
        sessionManager.save(login.token, login.usuario.toUi())
        return Result.success(Unit)
    }

    suspend fun logout() {
        sessionManager.clear()
        cache.limpiar()
    }

    suspend fun currentSession(): Session? = sessionManager.currentSession()
}
