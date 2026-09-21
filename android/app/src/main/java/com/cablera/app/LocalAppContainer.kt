package com.cablera.app

import androidx.compose.runtime.staticCompositionLocalOf

val LocalAppContainer = staticCompositionLocalOf<AppContainer> {
    error("AppContainer no fue provisto: envuelve el árbol de composables con CompositionLocalProvider(LocalAppContainer provides ...)")
}
