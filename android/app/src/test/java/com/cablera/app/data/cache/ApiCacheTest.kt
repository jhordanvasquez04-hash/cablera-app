package com.cablera.app.data.cache

import com.cablera.app.data.remote.SinConexionException
import java.io.File
import java.nio.file.Files
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.KSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.serializer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@Serializable
private data class Item(val id: String, val nombre: String)

class ApiCacheTest {

    private lateinit var dir: File
    private var ahora = 1_000_000L
    private val serializer: KSerializer<List<Item>> = ListSerializer(serializer<Item>())

    private fun nuevaCache() = ApiCache(dir, reloj = { ahora })

    @Before
    fun preparar() {
        dir = Files.createTempDirectory("api_cache_test").toFile()
    }

    @After
    fun limpiar() {
        dir.deleteRecursively()
    }

    @Test
    fun `lo guardado sobrevive a reiniciar la app`() = runBlocking {
        nuevaCache().guardar("clientes:a", serializer, listOf(Item("1", "Ana")))

        val leido = nuevaCache().leer("clientes:a", serializer)

        assertEquals(listOf(Item("1", "Ana")), leido?.valor)
        assertEquals(ahora, leido?.guardadoEn)
    }

    @Test
    fun `dentro de la vigencia no se llama al servidor`() = runBlocking {
        val cache = nuevaCache()
        var llamadas = 0
        val llamada: suspend () -> Result<List<Item>> = { llamadas++; Result.success(listOf(Item("1", "Ana"))) }

        cache.obtener("clientes:a", serializer, 30_000, llamada)
        ahora += 29_999
        val segunda = cache.obtener("clientes:a", serializer, 30_000, llamada)

        assertEquals(1, llamadas)
        assertEquals(listOf(Item("1", "Ana")), segunda.getOrNull())
    }

    @Test
    fun `vencido el dato se vuelve a consultar y se actualiza`() = runBlocking {
        val cache = nuevaCache()
        cache.guardar("clientes:a", serializer, listOf(Item("1", "Ana")))
        ahora += 30_000

        val resultado = cache.obtener("clientes:a", serializer, 30_000) { Result.success(listOf(Item("2", "Beto"))) }

        assertEquals(listOf(Item("2", "Beto")), resultado.getOrNull())
        assertEquals(listOf(Item("2", "Beto")), nuevaCache().leer("clientes:a", serializer)?.valor)
    }

    @Test
    fun `sin conexion se sirve la copia vieja`() = runBlocking {
        val cache = nuevaCache()
        cache.guardar("clientes:a", serializer, listOf(Item("1", "Ana")))
        ahora += 999_999

        val resultado = cache.obtener("clientes:a", serializer, 30_000) { Result.failure(SinConexionException()) }

        assertEquals(listOf(Item("1", "Ana")), resultado.getOrNull())
    }

    @Test
    fun `sin conexion y sin copia falla`() = runBlocking {
        val resultado = nuevaCache().obtener("clientes:a", serializer, 30_000) { Result.failure(SinConexionException()) }

        assertTrue(resultado.exceptionOrNull() is SinConexionException)
    }

    @Test
    fun `un error del servidor nunca se tapa con la copia vieja`() = runBlocking {
        val cache = nuevaCache()
        cache.guardar("clientes:a", serializer, listOf(Item("1", "Ana")))
        ahora += 999_999

        val resultado = cache.obtener("clientes:a", serializer, 30_000) { Result.failure(Exception("Error del servidor (500)")) }

        assertEquals("Error del servidor (500)", resultado.exceptionOrNull()?.message)
    }

    @Test
    fun `invalidarDatos borra listas pero conserva catalogos`() = runBlocking {
        val cache = nuevaCache()
        cache.guardar("clientes:a", serializer, listOf(Item("1", "Ana")))
        cache.guardar("cat-zonas:lista", serializer, listOf(Item("z", "Norte")))

        cache.invalidarDatos()

        assertNull(nuevaCache().leer("clientes:a", serializer))
        assertEquals(listOf(Item("z", "Norte")), nuevaCache().leer("cat-zonas:lista", serializer)?.valor)
    }

    @Test
    fun `invalidar un grupo borra solo ese grupo`() = runBlocking {
        val cache = nuevaCache()
        cache.guardar("cat-zonas:lista", serializer, listOf(Item("z", "Norte")))
        cache.guardar("cat-tipos:lista", serializer, listOf(Item("t", "cable")))

        cache.invalidar("cat-zonas")

        assertNull(nuevaCache().leer("cat-zonas:lista", serializer))
        assertEquals(listOf(Item("t", "cable")), nuevaCache().leer("cat-tipos:lista", serializer)?.valor)
    }

    @Test
    fun `limpiar deja la cache vacia`() = runBlocking {
        val cache = nuevaCache()
        cache.guardar("clientes:a", serializer, listOf(Item("1", "Ana")))
        cache.guardar("cat-zonas:lista", serializer, listOf(Item("z", "Norte")))

        cache.limpiar()

        assertNull(nuevaCache().leer("clientes:a", serializer))
        assertNull(nuevaCache().leer("cat-zonas:lista", serializer))
    }

    @Test
    fun `un archivo corrupto se descarta sin romper`() = runBlocking {
        val cache = nuevaCache()
        cache.guardar("clientes:a", serializer, listOf(Item("1", "Ana")))
        dir.listFiles()!!.filter { it.name.endsWith(".json") }.forEach { it.writeText("{no es json") }

        assertNull(nuevaCache().leer("clientes:a", serializer))
    }

    @Test
    fun `claves distintas no se pisan`() = runBlocking {
        val cache = nuevaCache()
        cache.guardar("clientes:zona1|", serializer, listOf(Item("1", "Ana")))
        cache.guardar("clientes:zona2|", serializer, listOf(Item("2", "Beto")))

        assertEquals("Ana", nuevaCache().leer("clientes:zona1|", serializer)?.valor?.single()?.nombre)
        assertEquals("Beto", nuevaCache().leer("clientes:zona2|", serializer)?.valor?.single()?.nombre)
    }
}
