package com.cablera.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.imePadding
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
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
        // de forma reactiva dentro de CableraNavHost. Se revisan AMBAS sesiones (panel y portal
        // de técnico, ver TecnicoSessionManager) — son independientes, así que priorizamos la
        // que exista; si un teléfono tuviera las dos guardadas (caso raro), gana el panel.
        val sesionInicial = runBlocking { container.sessionManager.currentSession() }
        val sesionTecnicoInicial = runBlocking { container.sessionManagerTecnico.currentSession() }
        val startDestination = when {
            sesionInicial != null -> Routes.HOME
            sesionTecnicoInicial != null -> Routes.ORDENES_TECNICO
            else -> Routes.LOGIN
        }

        setContent {
            val configuracion by container.configuracionState.collectAsStateWithLifecycle()
            CableraTheme(configuracion = configuracion) {
                CompositionLocalProvider(LocalAppContainer provides container) {
                    // La app dibuja de borde a borde (enableEdgeToEdge), y en ese modo Android NO achica la
                    // ventana cuando aparece el teclado: sin imePadding lo que queda debajo del teclado no se
                    // podía alcanzar ni deslizando. Aquí la ventana sube con el teclado y el scroll llega al final.
                    Box(modifier = Modifier.fillMaxSize().imePadding()) {
                        CableraNavHost(
                            authRepository = container.authRepository,
                            tecnicoAuthRepository = container.tecnicoAuthRepository,
                            startDestination = startDestination,
                            sesionInicial = sesionInicial,
                            sesionTecnicoInicial = sesionTecnicoInicial,
                        )
                    }
                }
            }
        }
    }
}
