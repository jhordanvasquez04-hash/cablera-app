package com.cablera.app.data.cache

import com.cablera.app.data.remote.SinConexionException
import java.io.File
import java.security.MessageDigest
import java.util.concurrent.ConcurrentHashMap
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.KSerializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import kotlinx.serialization.serializer

/** Vigencia de lo guardado antes de volver a consultar al servidor. */
object CacheTtl {
    /** Datos que casi no cambian (zonas, tipos de servicio, categorías, marca). */
    const val CATALOGO = 10 * 60_000L

    /** Listas y resúmenes de trabajo diario. */
    const val LISTA = 30_000L
}

/**
 * Caché de respuestas de la API, en memoria y en disco (JSON en el almacenamiento privado de la app),
 * pensada para que las pantallas muestren datos al instante y no consulten al servidor de más.
 *
 * Las claves tienen la forma `grupo:detalle`. El grupo permite invalidar de golpe todo lo que una
 * escritura pudo dejar desactualizado (ver [invalidarDatos]); los grupos de catálogo empiezan con
 * [PREFIJO_CATALOGO] y sobreviven a las escrituras de datos.
 */
class ApiCache(
    private val dir: File,
    private val json: Json = Json { ignoreUnknownKeys = true },
    private val reloj: () -> Long = { System.currentTimeMillis() },
) {
    class Guardado<T>(val valor: T, val guardadoEn: Long)

    private class Entrada(val valor: Any, val guardadoEn: Long)

    private val memoria = ConcurrentHashMap<String, Entrada>()

    init {
        dir.mkdirs()
    }

    /** Lo último guardado para [clave], esté vigente o no; `null` si no hay nada (o quedó ilegible). */
    suspend fun <T : Any> leer(clave: String, serializer: KSerializer<T>): Guardado<T>? = withContext(Dispatchers.IO) {
        memoria[clave]?.let { entrada ->
            @Suppress("UNCHECKED_CAST")
            return@withContext Guardado(entrada.valor as T, entrada.guardadoEn)
        }
        val archivo = archivoDe(clave)
        if (!archivo.isFile) return@withContext null
        try {
            val raiz = json.parseToJsonElement(archivo.readText()).jsonObject
            if (raiz["clave"]?.jsonPrimitive?.content != clave) return@withContext null
            val guardadoEn = raiz.getValue("guardadoEn").jsonPrimitive.long
            val valor = json.decodeFromJsonElement(serializer, raiz.getValue("datos"))
            memoria[clave] = Entrada(valor, guardadoEn)
            Guardado(valor, guardadoEn)
        } catch (_: Exception) {
            // Archivo corrupto o de una versión anterior con otro formato: se descarta.
            archivo.delete()
            null
        }
    }

    suspend fun <T : Any> guardar(clave: String, serializer: KSerializer<T>, valor: T) = withContext(Dispatchers.IO) {
        val ahora = reloj()
        memoria[clave] = Entrada(valor, ahora)
        try {
            val contenido = JsonObject(
                mapOf(
                    "clave" to JsonPrimitive(clave),
                    "guardadoEn" to JsonPrimitive(ahora),
                    "datos" to json.encodeToJsonElement(serializer, valor),
                ),
            )
            val archivo = archivoDe(clave)
            val temporal = File(dir, archivo.name + ".tmp")
            temporal.writeText(json.encodeToString(JsonObject.serializer(), contenido))
            if (!temporal.renameTo(archivo)) {
                archivo.delete()
                temporal.renameTo(archivo)
            }
            podar()
        } catch (_: Exception) {
            // La caché en disco es opcional: si falla (disco lleno, etc.) sigue viva la de memoria.
        }
    }

    /**
     * Devuelve lo guardado si sigue vigente ([ttlMs]); si no, ejecuta [llamada], guarda el resultado
     * y lo devuelve. Si no hay conexión y existe una copia (aunque vieja), devuelve esa copia.
     * Los demás errores (401, 500, validaciones) nunca se tapan con datos guardados.
     */
    suspend fun <T : Any> obtener(
        clave: String,
        serializer: KSerializer<T>,
        ttlMs: Long,
        llamada: suspend () -> Result<T>,
    ): Result<T> {
        val guardado = leer(clave, serializer)
        if (guardado != null && reloj() - guardado.guardadoEn < ttlMs) return Result.success(guardado.valor)
        val resultado = llamada()
        resultado.onSuccess { guardar(clave, serializer, it) }
        if (resultado.exceptionOrNull() is SinConexionException && guardado != null) {
            return Result.success(guardado.valor)
        }
        return resultado
    }

    suspend inline fun <reified T : Any> leer(clave: String): T? = leer(clave, serializer<T>())?.valor

    suspend inline fun <reified T : Any> obtener(
        clave: String,
        ttlMs: Long,
        noinline llamada: suspend () -> Result<T>,
    ): Result<T> = obtener(clave, serializer<T>(), ttlMs, llamada)

    suspend inline fun <reified T : Any> guardar(clave: String, valor: T) = guardar(clave, serializer<T>(), valor)

    /** Borra todo lo guardado del [grupo] (la parte de la clave antes de los `:`). */
    fun invalidar(grupo: String) {
        memoria.keys.removeAll { grupoDe(it) == grupo }
        dir.listFiles()?.filter { it.name.startsWith(prefijoArchivo(grupo)) }?.forEach { it.delete() }
    }

    /** Tras una escritura: borra las listas y fichas; los catálogos se conservan. */
    fun invalidarDatos() {
        memoria.keys.removeAll { !grupoDe(it).startsWith(PREFIJO_CATALOGO) }
        dir.listFiles()?.filter { !it.name.startsWith(PREFIJO_CATALOGO) }?.forEach { it.delete() }
    }

    /** Al iniciar o cerrar sesión: nada de lo guardado debe verlo otro usuario. */
    fun limpiar() {
        memoria.clear()
        dir.listFiles()?.forEach { it.delete() }
    }

    private fun grupoDe(clave: String) = clave.substringBefore(':')

    private fun prefijoArchivo(grupo: String) = grupo.replace(Regex("[^A-Za-z0-9-]"), "_") + "__"

    private fun archivoDe(clave: String): File {
        val hash = MessageDigest.getInstance("SHA-1").digest(clave.toByteArray()).joinToString("") { "%02x".format(it) }
        return File(dir, prefijoArchivo(grupoDe(clave)) + hash + ".json")
    }

    private fun podar() {
        val archivos = dir.listFiles() ?: return
        if (archivos.size <= MAX_ARCHIVOS) return
        archivos.sortedBy { it.lastModified() }.take(archivos.size - MAX_ARCHIVOS).forEach { it.delete() }
    }

    companion object {
        const val PREFIJO_CATALOGO = "cat-"
        private const val MAX_ARCHIVOS = 200
    }
}
