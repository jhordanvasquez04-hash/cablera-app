package com.cablera.app.data.session

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.cablera.app.data.remote.dto.TecnicoDto
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json

data class TecnicoSession(val accessToken: String, val tecnico: TecnicoDto)

// DataStore FÍSICAMENTE APARTE del de SessionManager (ver AppContainer): si compartieran el
// mismo, SessionManager.clear() (que hace `it.clear()`, borra TODO) se llevaría por delante
// una sesión de técnico guardada al mismo tiempo, y viceversa.
private object TecnicoSessionKeys {
    val ACCESS_TOKEN = stringPreferencesKey("tecnico_access_token")
    val TECNICO_JSON = stringPreferencesKey("tecnico_json")
}

class TecnicoSessionManager(
    private val dataStore: DataStore<Preferences>,
) {
    private val json = Json { ignoreUnknownKeys = true }

    val session: Flow<TecnicoSession?> = dataStore.data.map { prefs ->
        val token = prefs[TecnicoSessionKeys.ACCESS_TOKEN]
        val tecnicoJson = prefs[TecnicoSessionKeys.TECNICO_JSON]
        if (token != null && tecnicoJson != null) {
            TecnicoSession(token, json.decodeFromString(TecnicoDto.serializer(), tecnicoJson))
        } else {
            null
        }
    }

    suspend fun currentSession(): TecnicoSession? = session.first()

    suspend fun save(accessToken: String, tecnico: TecnicoDto) {
        dataStore.edit { prefs ->
            prefs[TecnicoSessionKeys.ACCESS_TOKEN] = accessToken
            prefs[TecnicoSessionKeys.TECNICO_JSON] = json.encodeToString(TecnicoDto.serializer(), tecnico)
        }
    }

    suspend fun clear() {
        dataStore.edit {
            it.remove(TecnicoSessionKeys.ACCESS_TOKEN)
            it.remove(TecnicoSessionKeys.TECNICO_JSON)
        }
    }

    fun tokenBlocking(): String? = runBlocking { session.first()?.accessToken }

    fun clearBlocking() = runBlocking { clear() }
}
