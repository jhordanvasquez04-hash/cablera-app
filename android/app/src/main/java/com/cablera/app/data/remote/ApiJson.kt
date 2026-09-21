package com.cablera.app.data.remote

import kotlinx.serialization.json.Json

/** Configuración única de JSON para hablar con la API: la usan Retrofit y las pruebas de contrato. */
object ApiJson {
    val instance: Json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
    }
}
