package com.cablera.app.data.remote

import com.cablera.app.data.mapper.etiquetaPeriodo
import com.cablera.app.data.mapper.sectoresDe
import com.cablera.app.data.mapper.toBoletaDetalle
import com.cablera.app.data.mapper.toBoletaResumen
import com.cablera.app.data.mapper.toContratoConDeuda
import com.cablera.app.data.mapper.toMovimiento
import com.cablera.app.data.mapper.toPendienteUi
import com.cablera.app.data.mapper.toPerfil
import com.cablera.app.data.mapper.toResumen
import com.cablera.app.data.mapper.toUi
import com.cablera.app.data.remote.dto.EstadosCargo
import com.cablera.app.data.remote.dto.EstadosServicio
import com.cablera.app.data.remote.dto.KCajaTurno
import com.cablera.app.data.remote.dto.KCargo
import com.cablera.app.data.remote.dto.KCliente
import com.cablera.app.data.remote.dto.KContrato
import com.cablera.app.data.remote.dto.KEgreso
import com.cablera.app.data.remote.dto.KEmpresa
import com.cablera.app.data.remote.dto.KKpisResponse
import com.cablera.app.data.remote.dto.KLoginResponse
import com.cablera.app.data.remote.dto.KMovimientoCaja
import com.cablera.app.data.remote.dto.KOrden
import com.cablera.app.data.remote.dto.KPaginado
import com.cablera.app.data.remote.dto.KPago
import com.cablera.app.data.remote.dto.KPlan
import com.cablera.app.data.remote.dto.KReportePagos
import com.cablera.app.data.remote.dto.KProducto
import com.cablera.app.data.remote.dto.KPuntoRed
import com.cablera.app.data.remote.dto.KTecnico
import com.cablera.app.data.remote.dto.KTecnicoLoginResponse
import com.cablera.app.data.remote.dto.KTecnicoMe
import com.cablera.app.data.remote.dto.Roles
import com.cablera.app.data.remote.dto.TiposOrdenPorServicio
import com.cablera.app.data.repository.TAMANO_PAGINA
import com.cablera.app.data.repository.paginar
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.decodeFromString
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
 * Contrato con la API de Keysls: cada archivo de `src/test/resources/fixtures` es una respuesta REAL
 * capturada del backend de Keysls corriendo (datos de prueba, sin tokens reales). Si un DTO no puede
 * leer su respuesta, o el mapeo a los modelos de la app se rompe, la pantalla fallaría en uso real.
 */
class KeyslsContractTest {

    private fun fixture(nombre: String): String =
        checkNotNull(javaClass.getResource("/fixtures/$nombre.json")) { "Falta el fixture $nombre" }.readText()

    private inline fun <reified T> leer(nombre: String): T = ApiJson.instance.decodeFromString<T>(fixture(nombre))

    @Test
    fun `todas las respuestas reales de Keysls se leen con los DTO crudos`() {
        leer<KLoginResponse>("login")
        leer<KTecnicoLoginResponse>("tec_login")
        leer<KTecnicoMe>("tec_me")
        leer<List<KCliente>>("clientes")
        leer<List<KContrato>>("contratos")
        leer<KContrato>("contrato_detalle")
        leer<List<KCargo>>("cargos_contrato")
        leer<List<KPlan>>("planes")
        leer<List<KTecnico>>("tecnicos")
        leer<List<KPuntoRed>>("puntos_red")
        leer<KEmpresa>("empresa")
        leer<List<KPago>>("pagos")
        leer<KPago>("pago_creado")
        leer<KCajaTurno>("caja_actual_abierta")
        leer<KEgreso>("egreso_creado")
        leer<List<KOrden>>("ordenes")
        leer<KOrden>("orden_asignada")
        leer<List<KOrden>>("tec_ordenes")
        leer<KOrden>("tec_orden_detalle")
        leer<KOrden>("tec_aceptar")
        leer<KPaginado<KProducto>>("productos_catalogo")
        leer<KKpisResponse>("kpis")
        leer<KReportePagos>("reporte_pagos")
        leer<List<String>>("sectores")
        leer<List<KMovimientoCaja>>("caja_movimientos")
        leer<List<KMovimientoCaja>>("caja_movimientos_ingresos")
    }

    @Test
    fun `sin turno abierto la API responde null y se lee como null`() {
        assertNull(leer<KCajaTurno?>("caja_actual_cerrada"))
    }

    @Test
    fun `el login del panel normaliza el rol de Keysls al de la app`() {
        val usuario = leer<KLoginResponse>("login").usuario.toUi()
        assertEquals("ADMIN se ve como gestor", Roles.GESTOR, usuario.rol)
        assertEquals("Admin Pruebas", usuario.nombre)
        assertEquals("admin@isp.test", usuario.email)
    }

    @Test
    fun `los montos que Keysls manda como texto se leen como numeros`() {
        val contrato = leer<List<KContrato>>("contratos").first()
        assertEquals(35.0, contrato.costoMensual ?: 0.0, 0.0)
        assertEquals(35.0, contrato.deudaPendiente, 0.0)
        assertEquals(35.0, leer<List<KPlan>>("planes").first { it.tipoServicio == "CABLE" }.precio, 0.0)
    }

    @Test
    fun `un contrato de Keysls llega a la app con estado y tipo en minuscula`() {
        val contrato = leer<List<KContrato>>("contratos").first().toUi()
        assertEquals("activo", contrato.estado)
        assertEquals("cable", contrato.tipoServicio)
        assertEquals("Jorge Ramos Leon", contrato.clienteNombre)
        assertEquals(5, contrato.diaCorte)
        assertEquals(1, contrato.mesesPendientes)
        assertTrue(contrato.costoMensual > 0)
    }

    @Test
    fun `un cliente reune sus contratos, su deuda y su estado`() {
        val contratos = leer<List<KContrato>>("contratos")
        val cliente = leer<List<KCliente>>("clientes").first { it.id == contratos.first().clienteId }
        val ui = cliente.toUi(contratos.filter { it.clienteId == cliente.id })
        assertEquals("Jorge Ramos Leon", ui.nombreCompleto)
        assertEquals(1, ui.contratos.size)
        assertEquals(35.0, ui.deudaTotal, 0.0)
        assertEquals(EstadosServicio.ACTIVO, ui.estadoServicio)
    }

    @Test
    fun `un cliente inactivo se ve como retirado`() {
        val cliente = leer<List<KCliente>>("clientes").first().copy(activo = false)
        assertEquals(EstadosServicio.RETIRADO, cliente.toUi().estadoServicio)
    }

    @Test
    fun `un contrato con deuda aparece en cobranza con su numero y meses pendientes`() {
        val deuda = leer<List<KContrato>>("contratos").first().toUi().toContratoConDeuda()
        assertEquals(35.0, deuda.deudaTotal, 0.0)
        assertEquals("1 mes", deuda.mesesPendientes)
        assertFalse(deuda.suspendido)
        assertTrue(deuda.numero.startsWith("C"))
    }

    @Test
    fun `los cargos se traducen a meses pendientes con su saldo`() {
        val cargo = leer<List<KCargo>>("cargos_contrato").first().toPendienteUi(numeroContrato = "C1", tipoServicio = "cable")
        assertEquals(2026, cargo.anio)
        assertEquals(9, cargo.mes)
        assertEquals(35.0, cargo.saldo, 0.0)
        assertEquals(0.0, cargo.montoPagado, 0.0)
        assertEquals(EstadosCargo.PENDIENTE, cargo.estado)
    }

    @Test
    fun `un pago de Keysls se muestra como comprobante con folio, cliente y lineas`() {
        val pago = leer<KPago>("pago_creado")
        val resumen = pago.toBoletaResumen()
        assertTrue(resumen.folio.startsWith("P-"))
        assertEquals("efectivo", resumen.metodoPago)
        assertEquals("Jorge Ramos Leon", resumen.cliente.nombreCompleto)
        assertEquals("Septiembre 2026", resumen.concepto)
        val detalle = pago.toBoletaDetalle()
        assertEquals(1, detalle.lineas.size)
        assertEquals(35.0, detalle.montoTotal, 0.0)
        assertEquals("Admin Pruebas", detalle.registradoPor)
    }

    @Test
    fun `el turno de caja abierto trae el monto esperado actual`() {
        val turno = leer<KCajaTurno>("caja_actual_abierta").toUi()
        assertEquals("abierta", turno.estado)
        assertTrue(turno.montoInicial > 0)
        assertEquals(turno.montoEsperado ?: 0.0, turno.montoEsperado ?: 0.0, 0.0)
    }

    @Test
    fun `un egreso de Keysls se ve como movimiento de caja`() {
        val movimiento = leer<KEgreso>("egreso_creado").toMovimiento()
        assertEquals("egreso", movimiento.tipo)
        assertEquals(20.0, movimiento.monto, 0.0)
        assertEquals("Combustible", movimiento.categoria)
        assertEquals("Gasolina", movimiento.descripcion)
    }

    @Test
    fun `el tipo de orden de Keysls se separa en tipo y servicio`() {
        val orden = leer<KOrden>("orden_asignada").toUi()
        assertEquals("averia", orden.tipoOrden)
        assertEquals("internet", orden.tipoServicio)
        assertEquals("asignada", orden.estado)
        assertEquals("OS0000000007", orden.nServicio)
        assertNotNull(orden.tecnico)
        assertEquals("C00000000006", orden.contrato?.numero)
    }

    @Test
    fun `las ordenes del tecnico incluyen las libres y traen su instalacion`() {
        val ordenes = leer<List<KOrden>>("tec_ordenes").map { it.toUi() }
        assertTrue(ordenes.isNotEmpty())
        assertTrue(ordenes.any { it.tipoOrden == "instalacion" && it.estado == "pendiente" })
    }

    @Test
    fun `el portal del tecnico lee su sesion y su perfil`() {
        val login = leer<KTecnicoLoginResponse>("tec_login")
        assertEquals("tecnico@isp.test", login.tecnico.email)
        assertEquals("Tomas", leer<KTecnicoMe>("tec_me").tecnico.toPerfil().nombre)
        assertTrue(leer<List<KTecnico>>("tecnicos").map { it.toResumen() }.any { it.activo })
    }

    @Test
    fun `los datos de la empresa llegan como configuracion`() {
        val config = leer<KEmpresa>("empresa").toUi()
        assertEquals("Empresa Pruebas", config.nombreEmpresa)
        assertEquals("apertura_cierre", config.modoCaja)
    }

    @Test
    fun `el filtro por zonas solo aparece si algun contrato usa sector`() {
        val sinSector = leer<List<KContrato>>("contratos").map { it.sector }
        assertTrue("la empresa de prueba no usa sectores", sectoresDe(sinSector).isEmpty())
        assertEquals(listOf("Centro", "Norte"), sectoresDe(listOf("Norte", null, " Centro ", "Norte", "")))
    }

    @Test
    fun `los tipos de servicio tecnico dependen del servicio del contrato`() {
        assertEquals("AVERIA_I", TiposOrdenPorServicio.aKeysls("averia", "internet"))
        assertEquals("INSTALACION_C", TiposOrdenPorServicio.aKeysls("instalacion", "cable"))
        assertEquals("RECONEXION_D", TiposOrdenPorServicio.aKeysls("reconexion", "duo"))
        assertTrue("instalacion_anexo" in TiposOrdenPorServicio.de("cable"))
        assertFalse("instalacion_anexo" in TiposOrdenPorServicio.de("internet"))
        assertTrue("atencion_noc" in TiposOrdenPorServicio.de("internet"))
        assertTrue("no debe haber tipos repetidos", TiposOrdenPorServicio.de("duo").let { it.size == it.toSet().size })
    }

    @Test
    fun `los indicadores de cobranza salen de los totales del servidor`() {
        val k = leer<KKpisResponse>("kpis").data
        assertTrue(k.contratosActivos > 0)
        assertTrue("la deuda de contratos activos no supera la deuda total", k.deudaContratosActivos <= k.deudaTotal)
        assertTrue(k.contratosActivosConDeuda <= k.contratosActivos)
        val reporte = leer<KReportePagos>("reporte_pagos")
        assertTrue(reporte.porMetodo.keys.containsAll(listOf("EFECTIVO", "YAPE", "PLIN", "TRANSFERENCIA")))
        assertEquals(reporte.totalIngresos - reporte.totalEgresos, reporte.saldoNeto, 0.001)
    }

    @Test
    fun `los listados se piden de a 10 y se sabe si hay mas pidiendo uno de sobra`() = runBlocking {
        val pedidos = mutableListOf<Pair<Int, Int>>()
        // El servidor tiene 25: la 1.ª página trae 10 y avisa que hay más
        val p1 = paginar(0) { limit, offset -> pedidos += limit to offset; (0 until 25).drop(offset).take(limit) }
        assertEquals((0 until 10).toList(), p1.items)
        assertTrue(p1.hayMas)
        assertEquals("se pide uno de más para saber si hay siguiente", TAMANO_PAGINA + 1, pedidos.single().first)
        // 3.ª página: quedan 5, no hay más
        val p3 = paginar(20) { limit, offset -> (0 until 25).drop(offset).take(limit) }
        assertEquals((20 until 25).toList(), p3.items)
        assertFalse(p3.hayMas)
        // Exactamente 10: es la última, no queda nada por pedir
        val exacta = paginar(0) { limit, offset -> (0 until 10).drop(offset).take(limit) }
        assertEquals(10, exacta.items.size)
        assertFalse(exacta.hayMas)
        // Vacío
        assertTrue(paginar<Int>(0) { _, _ -> emptyList() }.items.isEmpty())
    }

    @Test
    fun `los movimientos de caja distinguen cobros, ingresos externos y egresos`() {
        val ingresos = leer<List<KMovimientoCaja>>("caja_movimientos_ingresos").map { it.toUi() }
        assertTrue(ingresos.isNotEmpty() && ingresos.all { it.tipo == "ingreso" })
        assertTrue("hay cobros de clientes", ingresos.any { it.origen == "pago" && it.categoria == "Cobro de cliente" })
        assertTrue("hay ingresos externos", ingresos.any { it.origen == "externo" })
        val todos = leer<List<KMovimientoCaja>>("caja_movimientos").map { it.toUi() }
        assertTrue(todos.all { it.tipo == "ingreso" || it.tipo == "egreso" })
        assertEquals("el mas reciente primero", todos.sortedByDescending { it.fecha }.map { it.id }, todos.map { it.id })
    }

    @Test
    fun `el reporte y el turno de caja informan los ingresos externos`() {
        val reporte = leer<KReportePagos>("reporte_pagos")
        assertTrue(reporte.ingresosExternos > 0)
        assertEquals(reporte.ingresosExternos, reporte.porMetodoExternos.values.sum(), 0.001)
        val turno = leer<KCajaTurno>("caja_actual_abierta")
        assertEquals(turno.montoInicial + turno.efectivoCobrado + turno.ingresosExternosEfectivo - turno.egresosEfectivo, turno.montoEsperadoActual, 0.001)
    }

    @Test
    fun `las etiquetas de periodo salen en espanol`() {
        assertEquals("Septiembre 2026", etiquetaPeriodo("2026-09"))
        assertEquals("Enero 2027", etiquetaPeriodo("2027-01"))
    }

    // --- Errores: Keysls responde {"error": "..."} y la app debe mostrar ese texto ---

    private fun httpError(codigo: Int, fixture: String) = HttpException(
        Response.error<Any>(codigo, fixture(fixture).toResponseBody("application/json".toMediaType())),
    )

    @Test
    fun `el mensaje de error de Keysls llega a la pantalla`() {
        val resultado = runBlocking { safeApiCall<Unit> { throw httpError(400, "error_400_caja_cerrada") } }
        assertEquals("Debes abrir la caja antes de registrar un cobro en efectivo", resultado.exceptionOrNull()?.message)
        val limite = runBlocking { safeApiCall<Unit> { throw httpError(429, "error_429_login") } }
        assertEquals("Demasiados intentos de login. Espera 15 minutos.", limite.exceptionOrNull()?.message)
    }

    @Test
    fun `un error propio de una operacion no cierra la app`() {
        val resultado = runBlocking { safeApiCall<Unit> { error("Cliente no encontrado") } }
        assertTrue(resultado.isFailure)
        assertEquals("Cliente no encontrado", resultado.exceptionOrNull()?.message)
    }

    @Test
    fun `sin conexion se distingue del resto de errores`() {
        val resultado = runBlocking { safeApiCall<Unit> { throw java.io.IOException("sin red") } }
        assertTrue(resultado.exceptionOrNull() is SinConexionException)
    }
}
