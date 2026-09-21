package com.cablera.app.data.remote

import java.io.IOException
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import retrofit2.HttpException

private val errorJson = Json { ignoreUnknownKeys = true }

/** Falla de red (sin internet, timeout, servidor caído); permite a la caché servir datos guardados. */
class SinConexionException : Exception("No se pudo conectar. Verifica tu conexión a internet.")

/** Envuelve una llamada suspend de Retrofit en un [Result], traduciendo errores HTTP/red a mensajes legibles. */
suspend fun <T> safeApiCall(call: suspend () -> T): Result<T> = try {
    Result.success(call())
} catch (e: HttpException) {
    Result.failure(Exception(extraerMensajeError(e)))
} catch (e: IOException) {
    Result.failure(SinConexionException())
} catch (e: SerializationException) {
    // El servidor respondió algo que la app no entiende (versión desfasada): error controlado, no un cierre de la app.
    Result.failure(Exception("Respuesta inesperada del servidor. Actualiza la aplicación."))
}

private fun extraerMensajeError(e: HttpException): String {
    val cuerpo = try {
        e.response()?.errorBody()?.string()
    } catch (_: Exception) {
        null
    }
    if (cuerpo.isNullOrBlank()) return "Error del servidor (${e.code()})"
    return try {
        val mensaje = errorJson.parseToJsonElement(cuerpo).jsonObject["message"]
        when (mensaje) {
            is JsonArray -> mensaje.joinToString("\n") { it.jsonPrimitive.content }
            is JsonPrimitive -> mensaje.content
            else -> "Error del servidor (${e.code()})"
        }
    } catch (_: Exception) {
        "Error del servidor (${e.code()})"
    }
}
