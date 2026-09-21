package com.cablera.app.data.remote

import com.cablera.app.data.remote.dto.BoletaCreadaDto
import com.cablera.app.data.remote.dto.BoletaDetalleDto
import com.cablera.app.data.remote.dto.BoletaResumenDto
import com.cablera.app.data.remote.dto.CargoPendienteDto
import com.cablera.app.data.remote.dto.CategoriaEgresoDto
import com.cablera.app.data.remote.dto.ClienteDto
import com.cablera.app.data.remote.dto.ClienteFichaDto
import com.cablera.app.data.remote.dto.ConfiguracionDto
import com.cablera.app.data.remote.dto.DescuentoDto
import com.cablera.app.data.remote.dto.EstadosBoleta
import com.cablera.app.data.remote.dto.GastoReportadoDto
import com.cablera.app.data.remote.dto.LoginResponse
import com.cablera.app.data.remote.dto.MovimientoCajaDto
import com.cablera.app.data.remote.dto.ResumenCajaDto
import com.cablera.app.data.remote.dto.ResumenCobranzaDto
import com.cablera.app.data.remote.dto.ServicioTecnicoDto
import com.cablera.app.data.remote.dto.TipoServicioDto
import com.cablera.app.data.remote.dto.TipoServicioTecnicoDto
import com.cablera.app.data.remote.dto.UsuarioListadoDto
import com.cablera.app.data.remote.dto.ZonaDto
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.KSerializer
import kotlinx.serialization.builtins.ListSerializer
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Response

/**
 * Contrato con el backend: cada archivo de `src/test/resources/fixtures` es una respuesta REAL de la API
 * (capturada de un backend corriendo, con nombres, DNI y teléfonos anonimizados) para uno de los endpoints
 * que usa la app. Si un DTO de la app no puede leer su respuesta, la pantalla correspondiente fallaría en
 * producción: justo lo que pasó con `ConfiguracionDto.id` (Int en la app, UUID en el servidor).
 */
class ApiContractTest {

    private fun fixture(nombre: String): String =
        checkNotNull(javaClass.getResource("/fixtures/$nombre.json")) { "Falta el fixture $nombre" }.readText()

    private fun <T> decodificar(nombre: String, serializer: KSerializer<T>): T =
        ApiJson.instance.decodeFromString(serializer, fixture(nombre))

    private fun <T> lista(s: KSerializer<T>) = ListSerializer(s)

    @Test
    fun `todas las respuestas reales de la API se leen con los DTOs de la app`() {
        val contratos: List<Pair<String, KSerializer<*>>> = listOf(
            "login" to LoginResponse.serializer(),
            "configuracion_publica" to ConfiguracionDto.serializer(),
            "configuracion" to ConfiguracionDto.serializer(),
            "configuracion_actualizada" to ConfiguracionDto.serializer(),
            "configuracion_con_logo" to ConfiguracionDto.serializer(),
            "configuracion_sin_logo" to ConfiguracionDto.serializer(),
            "zonas" to lista(ZonaDto.serializer()),
            "cobranza_resumen" to ResumenCobranzaDto.serializer(),
            "cobranza_resumen_filtrado" to ResumenCobranzaDto.serializer(),
            "clientes" to lista(ClienteDto.serializer()),
            "cliente" to ClienteDto.serializer(),
            "cliente_creado" to ClienteDto.serializer(),
            "cliente_actualizado" to ClienteDto.serializer(),
            "cliente_servicio_agregado" to ClienteDto.serializer(),
            "cliente_servicio_actualizado" to ClienteDto.serializer(),
            "cliente_servicio_suspendido" to ClienteDto.serializer(),
            "cliente_servicio_activado" to ClienteDto.serializer(),
            "cliente_servicio_baja" to ClienteDto.serializer(),
            "cliente_suspendido" to ClienteDto.serializer(),
            "cliente_activado" to ClienteDto.serializer(),
            "cliente_baja" to ClienteDto.serializer(),
            "ficha" to ClienteFichaDto.serializer(),
            "ficha_con_historial" to ClienteFichaDto.serializer(),
            "cargos_pendientes" to lista(CargoPendienteDto.serializer()),
            "cargos_pendientes_parcial" to lista(CargoPendienteDto.serializer()),
            "tipos_servicio" to lista(TipoServicioDto.serializer()),
            "tipo_servicio_creado" to TipoServicioDto.serializer(),
            "descuento" to DescuentoDto.serializer(),
            "descuentos" to lista(DescuentoDto.serializer()),
            "boleta_creada" to BoletaCreadaDto.serializer(),
            "boletas" to lista(BoletaResumenDto.serializer()),
            "boletas_busqueda" to lista(BoletaResumenDto.serializer()),
            "boleta_detalle" to BoletaDetalleDto.serializer(),
            "boleta_anulada" to BoletaDetalleDto.serializer(),
            "categorias_egreso" to lista(CategoriaEgresoDto.serializer()),
            "categoria_creada" to CategoriaEgresoDto.serializer(),
            "movimiento_egreso" to MovimientoCajaDto.serializer(),
            "movimiento_ingreso" to MovimientoCajaDto.serializer(),
            "movimientos" to lista(MovimientoCajaDto.serializer()),
            "caja_resumen" to ResumenCajaDto.serializer(),
            "gasto_reportado" to GastoReportadoDto.serializer(),
            "gasto_aprobado" to GastoReportadoDto.serializer(),
            "gasto_rechazado" to GastoReportadoDto.serializer(),
            "gastos_pendientes" to lista(GastoReportadoDto.serializer()),
            "usuarios" to lista(UsuarioListadoDto.serializer()),
            "usuario_creado" to UsuarioListadoDto.serializer(),
            "tipo_st_creado" to TipoServicioTecnicoDto.serializer(),
            "tipo_st_actualizado" to TipoServicioTecnicoDto.serializer(),
            "tipos_st" to lista(TipoServicioTecnicoDto.serializer()),
            "servicio_tecnico" to ServicioTecnicoDto.serializer(),
            "servicio_tecnico_comentado" to ServicioTecnicoDto.serializer(),
            "servicio_tecnico_liquidado" to ServicioTecnicoDto.serializer(),
            "servicios_tecnicos" to lista(ServicioTecnicoDto.serializer()),
            "servicios_tecnicos_estado" to lista(ServicioTecnicoDto.serializer()),
        )

        // Se juntan todos los fallos para verlos de una vez en lugar de uno por corrida.
        val fallos = contratos.mapNotNull { (nombre, serializer) ->
            try {
                decodificar(nombre, serializer)
                null
            } catch (e: Exception) {
                "$nombre: ${e.message?.lineSequence()?.first()}"
            }
        }
        assertTrue("DTOs que no leen su respuesta real:\n" + fallos.joinToString("\n"), fallos.isEmpty())
    }

    @Test
    fun `la configuracion trae un id de texto (UUID) y no un numero`() {
        val config = decodificar("configuracion", ConfiguracionDto.serializer())
        assertTrue(config.id.length > 8)
        assertTrue(config.colorPrimario.startsWith("#"))
    }

    @Test
    fun `la configuracion publica no expone RUC ni contacto`() {
        val publica = decodificar("configuracion_publica", ConfiguracionDto.serializer())
        assertNull(publica.ruc)
        assertNull(publica.telefonoContacto)
        assertNull(publica.emailContacto)
    }

    @Test
    fun `el resumen de cobranza trae clientes con deuda y totales coherentes`() {
        val resumen = decodificar("cobranza_resumen", ResumenCobranzaDto.serializer())
        assertTrue(resumen.clientes.isNotEmpty())
        assertTrue(resumen.deudaAcumulada > 0)
        assertTrue(resumen.clientesConDeudaCount >= resumen.clientes.size)
    }

    @Test
    fun `la boleta anulada llega con estado anulada`() {
        assertEquals(EstadosBoleta.ANULADA, decodificar("boleta_anulada", BoletaDetalleDto.serializer()).estado)
        assertEquals(EstadosBoleta.EMITIDA, decodificar("boleta_detalle", BoletaDetalleDto.serializer()).estado)
    }

    @Test
    fun `un pago parcial deja saldo pendiente en el cargo`() {
        val cargos = decodificar("cargos_pendientes_parcial", lista(CargoPendienteDto.serializer()))
        assertTrue(cargos.isNotEmpty())
        assertTrue(cargos.all { it.saldo > 0 })
    }

    @Test
    fun `un servicio tecnico liquidado conserva su comentario final y la fecha`() {
        val servicio = decodificar("servicio_tecnico_liquidado", ServicioTecnicoDto.serializer())
        assertEquals("Listo", servicio.comentarioFinal)
        assertNotNull(servicio.fechaLiquidacion)
    }

    // ---- errores: la app debe mostrarle al usuario el mensaje del servidor, no "Error del servidor (400)" ----

    private fun mensajeDeError(codigo: Int, fixture: String): String = runBlocking {
        val cuerpo = fixture(fixture).toResponseBody("application/json".toMediaType())
        val resultado = safeApiCall<Unit> { throw HttpException(Response.error<Unit>(codigo, cuerpo)) }
        resultado.exceptionOrNull()?.message.orEmpty()
    }

    @Test
    fun `los errores de validacion (400) muestran los mensajes del servidor`() {
        val mensaje = mensajeDeError(400, "error_400_validacion")
        assertFalse(mensaje.startsWith("Error del servidor"))
        assertTrue(mensaje.isNotBlank())
    }

    @Test
    fun `un duplicado (409) muestra un mensaje legible`() {
        assertEquals("Ya existe un registro con esos datos", mensajeDeError(409, "error_409_duplicado"))
    }

    @Test
    fun `no encontrado, sin sesion y sin permiso traen mensaje`() {
        assertFalse(mensajeDeError(404, "error_404").startsWith("Error del servidor"))
        assertFalse(mensajeDeError(401, "error_401").startsWith("Error del servidor"))
        assertFalse(mensajeDeError(403, "error_403").startsWith("Error del servidor"))
    }

    @Test
    fun `una respuesta que la app no entiende da un error controlado y no un cierre`() = runBlocking {
        val resultado = safeApiCall<ConfiguracionDto> {
            // Lo que pasaba con el id numérico: el servidor devuelve texto donde la app esperaba un Int.
            ApiJson.instance.decodeFromString(ConfiguracionDto.serializer(), """{"id": "abc", "nombreEmpresa": 5}""")
        }
        assertTrue(resultado.isFailure)
        assertEquals("Respuesta inesperada del servidor. Actualiza la aplicación.", resultado.exceptionOrNull()?.message)
    }
}
