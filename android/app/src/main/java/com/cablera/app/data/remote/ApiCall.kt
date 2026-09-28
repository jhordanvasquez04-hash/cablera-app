package com.cablera.app.data.remote

import java.io.IOException
import kotlin.coroutines.cancellation.CancellationException
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
} catch (e: CancellationException) {
    throw e
} catch (e: Exception) {
    // Errores propios de una operación compuesta (ej. "Cliente no encontrado"): mensaje legible, sin cerrar la app.
    Result.failure(Exception(e.message ?: "No se pudo completar la operación"))
}

private fun extraerMensajeError(e: HttpException): String {
    val cuerpo = try {
        e.response()?.errorBody()?.string()
    } catch (_: Exception) {
        null
    }
    if (cuerpo.isNullOrBlank()) return "Error del servidor (${e.code()})"
    return try {
        val raiz = errorJson.parseToJsonElement(cuerpo).jsonObject
        // Keysls responde {"error": "..."}; el "message" (texto o lista) queda por compatibilidad.
        val mensaje = raiz["error"] ?: raiz["message"]
        when (mensaje) {
            is JsonArray -> mensaje.joinToString("\n") { it.jsonPrimitive.content }
            is JsonPrimitive -> mensaje.content
            else -> "Error del servidor (${e.code()})"
        }
    } catch (_: Exception) {
        "Error del servidor (${e.code()})"
    }
}
