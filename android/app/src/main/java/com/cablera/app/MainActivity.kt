package com.cablera.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.cablera.app.ui.navigation.CableraNavHost
import com.cablera.app.ui.navigation.Routes
import com.cablera.app.ui.theme.CableraTheme
import kotlinx.coroutines.runBlocking

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val container = (application as CableraApp).container

        // Lectura local (DataStore) rápida y única al inicio, para no mostrar Login en un
        // parpadeo si ya hay una sesión guardada. El resto de cambios de sesión se observan
        // de forma reactiva dentro de CableraNavHost.
        val sesionInicial = runBlocking { container.sessionManager.currentSession() }
        val startDestination = if (sesionInicial != null) Routes.HOME else Routes.LOGIN

        setContent {
            val configuracion by container.configuracionState.collectAsStateWithLifecycle()
            CableraTheme(configuracion = configuracion) {
                CompositionLocalProvider(LocalAppContainer provides container) {
                    CableraNavHost(
                        authRepository = container.authRepository,
                        startDestination = startDestination,
                        sesionInicial = sesionInicial,
                    )
                }
            }
        }
    }
}
