package com.cablera.app.data.session

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.cablera.app.data.remote.dto.UsuarioDto
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json

data class Session(val accessToken: String, val usuario: UsuarioDto)

private object SessionKeys {
    val ACCESS_TOKEN = stringPreferencesKey("access_token")
    val USUARIO_JSON = stringPreferencesKey("usuario_json")
}

class SessionManager(
    private val dataStore: DataStore<Preferences>,
) {
    private val json = Json { ignoreUnknownKeys = true }

    val session: Flow<Session?> = dataStore.data.map { prefs ->
        val token = prefs[SessionKeys.ACCESS_TOKEN]
        val usuarioJson = prefs[SessionKeys.USUARIO_JSON]
        if (token != null && usuarioJson != null) {
            Session(token, json.decodeFromString(UsuarioDto.serializer(), usuarioJson))
        } else {
            null
        }
    }

    suspend fun currentSession(): Session? = session.first()

    suspend fun save(accessToken: String, usuario: UsuarioDto) {
        dataStore.edit { prefs ->
            prefs[SessionKeys.ACCESS_TOKEN] = accessToken
            prefs[SessionKeys.USUARIO_JSON] = json.encodeToString(UsuarioDto.serializer(), usuario)
        }
    }

    suspend fun clear() {
        dataStore.edit { it.clear() }
    }

    /** Solo para el interceptor de red, que corre en un contexto no-suspend de OkHttp. */
    fun tokenBlocking(): String? = runBlocking { session.first()?.accessToken }

    fun clearBlocking() = runBlocking { clear() }
}
