package com.cablera.app

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore
import com.cablera.app.data.cache.ApiCache
import com.cablera.app.data.remote.ApiJson
import com.cablera.app.data.remote.ApiService
import com.cablera.app.data.remote.AuthHeaderInterceptor
import com.cablera.app.data.remote.SessionExpiredInterceptor
import com.cablera.app.data.remote.dto.ConfiguracionDto
import com.cablera.app.data.repository.AuthRepository
import com.cablera.app.data.repository.BoletasRepository
import com.cablera.app.data.repository.CajaRepository
import com.cablera.app.data.repository.ClientesRepository
import com.cablera.app.data.repository.CobranzaRepository
import com.cablera.app.data.repository.ConfiguracionRepository
import com.cablera.app.data.repository.GastosRepository
import com.cablera.app.data.repository.ServiciosTecnicosRepository
import com.cablera.app.data.repository.ZonasRepository
import com.cablera.app.data.session.SessionManager
import java.io.File
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "cablera_session")

/**
 * Contenedor manual de dependencias (no usamos Hilt/KSP: ver README para el porqué). Un único
 * árbol de singletons construido a mano, expuesto vía [CableraApp] y consumido con
 * [LocalAppContainer] desde los composables.
 */
class AppContainer(context: Context) {

    val sessionManager: SessionManager = SessionManager(context.dataStore)

    private val json: Json = ApiJson.instance

    // Público para reutilizarlo al descargar imágenes remotas (ej. logo de Configuración)
    // fuera de Retrofit, sin necesitar una librería de carga de imágenes aparte.
    val okHttpClient: OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(AuthHeaderInterceptor(sessionManager))
        .addInterceptor(SessionExpiredInterceptor(sessionManager))
        .addInterceptor(
            HttpLoggingInterceptor().apply {
                level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC else HttpLoggingInterceptor.Level.NONE
            },
        )
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    private val retrofit: Retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()

    private val apiService: ApiService = retrofit.create(ApiService::class.java)

    // Respuestas de la API guardadas en memoria y disco: las pantallas pintan al instante lo último
    // conocido y solo consultan al servidor cuando el dato venció (ver ApiCache).
    val apiCache: ApiCache = ApiCache(File(context.filesDir, "api_cache"))

    val authRepository: AuthRepository = AuthRepository(apiService, sessionManager, apiCache)
    val zonasRepository: ZonasRepository = ZonasRepository(apiService, apiCache)
    val cobranzaRepository: CobranzaRepository = CobranzaRepository(apiService, apiCache)
    val clientesRepository: ClientesRepository = ClientesRepository(apiService, apiCache)
    val boletasRepository: BoletasRepository = BoletasRepository(apiService, apiCache)
    val gastosRepository: GastosRepository = GastosRepository(apiService, apiCache)
    val configuracionRepository: ConfiguracionRepository = ConfiguracionRepository(apiService, apiCache)
    val cajaRepository: CajaRepository = CajaRepository(apiService, apiCache)
    val serviciosTecnicosRepository: ServiciosTecnicosRepository = ServiciosTecnicosRepository(apiService, apiCache)

    /** URL absoluta para una ruta relativa devuelta por el backend (ej. logo subido). */
    fun resolverUrlArchivo(ruta: String?): String? {
        if (ruta.isNullOrBlank()) return null
        if (ruta.startsWith("http://") || ruta.startsWith("https://")) return ruta
        return BuildConfig.API_BASE_URL.trimEnd('/') + ruta
    }

    // Compartido por CableraTheme (colores de marca) y la pantalla de login (nombre/logo).
    // `/configuracion` es pública, así que se puede cargar antes de iniciar sesión. La pantalla de
    // Ajustes actualiza este mismo estado al guardar cambios, para que el tema se repinte al toque.
    val configuracionState: MutableStateFlow<ConfiguracionDto?> = MutableStateFlow(null)
    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    init {
        // Lectura pequeña y local: la marca guardada se aplica antes del primer frame, sin parpadeo de tema.
        configuracionState.value = runBlocking { configuracionRepository.enCache() }
        appScope.launch {
            configuracionRepository.obtener().onSuccess { configuracionState.value = it }
        }
        // Cualquier cierre de sesión (manual o por 401 del interceptor) descarta lo guardado del usuario.
        // Solo al pasar de "con sesión" a "sin sesión": en un arranque sin sesión no hay nada que borrar
        // y así se conserva la marca guardada para la pantalla de login.
        appScope.launch {
            var teniaSesion = false
            sessionManager.session.collect { sesion ->
                if (sesion == null && teniaSesion) apiCache.limpiar()
                teniaSesion = sesion != null
            }
        }
    }
}
