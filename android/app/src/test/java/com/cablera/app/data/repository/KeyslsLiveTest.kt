package com.cablera.app.data.repository

import com.cablera.app.data.cache.ApiCache
import com.cablera.app.data.remote.ApiJson
import com.cablera.app.data.remote.ApiService
import com.cablera.app.data.remote.ApiServiceTecnico
import com.cablera.app.data.remote.dto.CompletarOrdenPanelRequest
import com.cablera.app.data.remote.dto.CompletarOrdenRequest
import com.cablera.app.data.remote.dto.EstadosBoleta
import com.cablera.app.data.remote.dto.CreateClienteRequest
import com.cablera.app.data.remote.dto.CreateContratoRequest
import com.cablera.app.data.remote.dto.CreateMovimientoRequest
import com.cablera.app.data.remote.dto.CreateOrdenRequest
import com.cablera.app.data.remote.dto.EstadosContrato
import com.cablera.app.data.remote.dto.EstadosOrdenServicio
import com.cablera.app.data.remote.dto.LoginRequest
import com.cablera.app.data.remote.dto.UpdateClienteRequest
import com.cablera.app.data.remote.dto.UpdateContratoRequest
import com.cablera.app.data.repository.TAMANO_PAGINA
import java.io.File
import java.time.OffsetDateTime
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

/**
 * Prueba de integración CONTRA UN KEYSLS EN MARCHA: ejecuta los repositorios reales de la app (con
 * Retrofit, DTO y mapeadores de verdad) y comprueba que lo que la app lee y escribe llega bien al backend.
 *
 * Solo corre si están definidas KEYSLS_LIVE_URL (ej. http://127.0.0.1:3100/api/), KEYSLS_LIVE_EMAIL,
 * KEYSLS_LIVE_PASSWORD, KEYSLS_LIVE_TEC_EMAIL y KEYSLS_LIVE_TEC_PASSWORD; sin ellas se omite, así que no
 * afecta a las pruebas normales. Escribe datos de prueba: usar solo con una empresa de pruebas.
 */
class KeyslsLiveTest {

    private val url = System.getenv("KEYSLS_LIVE_URL")
    private val json = ApiJson.instance

    private fun retrofit(token: () -> String?): Retrofit = Retrofit.Builder()
        .baseUrl(checkNotNull(url))
        .client(
            OkHttpClient.Builder()
                .addInterceptor(Interceptor { chain ->
                    val t = token()
                    chain.proceed(if (t != null) chain.request().newBuilder().addHeader("Authorization", "Bearer $t").build() else chain.request())
                })
                .build(),
        )
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()

    private inline fun <T> List<T>.buscar(que: String, p: (T) -> Boolean): T =
        firstOrNull(p) ?: throw AssertionError("No se encontró: $que (hay ${size} elementos)")

    private fun <T> ok(r: Result<T>): T = r.getOrElse { throw AssertionError("Falló la operación: ${it.message}", it) }

    @Test
    fun `los repositorios de la app funcionan contra Keysls`() = runBlocking<Unit> {
        assumeTrue("KEYSLS_LIVE_URL no definida: prueba omitida", url != null)
        val email = checkNotNull(System.getenv("KEYSLS_LIVE_EMAIL"))
        val password = checkNotNull(System.getenv("KEYSLS_LIVE_PASSWORD"))

        var token: String? = null
        val api = retrofit { token }.create(ApiService::class.java)
        val login = api.login(LoginRequest(email, password))
        token = login.token
        val cacheDir = File.createTempFile("cache", "").also { it.delete(); it.mkdirs() }
        val cache = ApiCache(cacheDir)

        val contratosRepo = ContratosRepository(api, cache)
        val clientesRepo = ClientesRepository(api, cache, contratosRepo)
        val boletasRepo = BoletasRepository(api, cache)
        val cajaTurnoRepo = CajaTurnoRepository(api, cache)
        val cajaRepo = CajaRepository(api, cache)
        val ordenesRepo = OrdenesServicioRepository(api, cache)
        val cobranzaRepo = CobranzaRepository(api, cache) { login.usuario.id }
        val planesRepo = PlanesRepository(api, cache)
        val configRepo = ConfiguracionRepository(api, cache)

        // --- Clientes y contratos ---
        // Paginación: la lista viene de a 10 y "Ver más" (offset) trae los siguientes, sin repetir
        val pagina1 = ok(clientesRepo.listar(null, null, 0))
        assertEquals(TAMANO_PAGINA, pagina1.items.size)
        assertTrue("hay más clientes de prueba que una página", pagina1.hayMas)
        val pagina2 = ok(clientesRepo.listar(null, null, TAMANO_PAGINA))
        assertTrue(pagina1.items.map { it.id }.intersect(pagina2.items.map { it.id }.toSet()).isEmpty())
        val clientes = pagina1.items + pagina2.items
        assertTrue("cada cliente de la página trae sus contratos y deuda", clientes.any { it.contratos.isNotEmpty() && it.deudaTotal >= 0 })
        // Buscador y zona se filtran en el servidor
        val buscado = ok(clientesRepo.listar(pagina1.items.first().dni, null, 0)).items
        assertTrue(buscado.any { it.id == pagina1.items.first().id })
        val zonas = ok(contratosRepo.sectores())
        assertTrue("la empresa de prueba usa zonas", zonas.isNotEmpty())
        val enZona = ok(clientesRepo.listar(null, zonas.first(), 0)).items
        assertTrue(enZona.isNotEmpty() && enZona.all { c -> c.contratos.any { it.sector?.trim() == zonas.first() } })
        val contratosPagina = ok(contratosRepo.listar(null, null, 0))
        assertEquals(TAMANO_PAGINA, contratosPagina.items.size)
        assertTrue(contratosPagina.hayMas)
        val conContrato = clientes.buscar("un cliente con contratos") { it.contratos.isNotEmpty() }
        val ficha = ok(clientesRepo.ficha(conContrato.id))
        assertEquals(conContrato.id, ficha.cliente.id)
        assertTrue(ficha.cliente.contratos.isNotEmpty())

        // Lo que se edita en la app llega a Keysls: teléfono del cliente y dirección del contrato.
        val telefonoNuevo = "9" + (10000000..99999999).random()
        ok(clientesRepo.actualizar(conContrato.id, UpdateClienteRequest(telefono = telefonoNuevo)))
        assertEquals(telefonoNuevo, ok(clientesRepo.obtener(conContrato.id)).telefono)

        val contrato = conContrato.contratos.first()
        val refNueva = "Ref app ${System.currentTimeMillis() % 10000}"
        val editado = ok(contratosRepo.actualizar(contrato.id, UpdateContratoRequest(referencia = refNueva, costoMensual = contrato.costoMensual)))
        assertEquals(refNueva, editado.referencia)
        assertEquals("editar un dato no debe borrar los demás", contrato.direccion, editado.direccion)
        assertEquals(contrato.costoMensual, editado.costoMensual, 0.0)
        assertEquals(contrato.diaCorte, editado.diaCorte)

        // Suspender / reactivar (PUT completo con solo el estado cambiado)
        assertEquals(EstadosContrato.SUSPENDIDO, ok(contratosRepo.suspender(contrato.id)).estado)
        assertEquals(EstadosContrato.ACTIVO, ok(contratosRepo.activar(contrato.id)).estado)

        // Alta de cliente + contrato desde la app: el backend crea también la orden de instalación
        val dni = (10000000..99999999).random().toString()
        val nuevo = ok(clientesRepo.crear(CreateClienteRequest(dni = dni, nombreCompleto = "Cliente App Prueba", telefono = "999888777")))
        val plan = ok(planesRepo.listar(soloActivos = true)).first()
        val contratoNuevo = ok(
            contratosRepo.crear(
                CreateContratoRequest(
                    clienteId = nuevo.id, tipoServicio = plan.tipoServicio, direccion = "Calle App 123", diaCorte = 10,
                    planId = plan.id, costoMensual = plan.precio, sector = "Zona App",
                ),
            ),
        )
        assertEquals(plan.tipoServicio, contratoNuevo.tipoServicio)
        assertEquals(10, contratoNuevo.diaCorte)
        val ordenInstalacion = ok(ordenesRepo.listar(null, null, 0)).items.firstOrNull { it.contratoId == contratoNuevo.id }
        assertNotNull("al crear el contrato Keysls genera su orden de instalación", ordenInstalacion)
        assertEquals("instalacion", ordenInstalacion!!.tipoOrden)
        // El sector del contrato es lo que activa el filtro por zonas
        assertTrue(ok(clientesRepo.listar(dni, null, 0)).items.single().contratos.single().sector == "Zona App")

        // --- Cobranza (resumen) ---
        val resumen = ok(cobranzaRepo.resumen())
        assertTrue(resumen.contratosActivos > 0)
        assertTrue(resumen.deudaAcumulada >= resumen.deudaContratosActivos)
        assertTrue("con un sector en uso aparece el filtro", "Zona App" in resumen.sectores)
        val deudores = ok(cobranzaRepo.contratosConDeuda(null, null, 0))
        assertEquals(TAMANO_PAGINA, deudores.items.size)
        assertTrue(deudores.hayMas)
        assertTrue("solo contratos con deuda", deudores.items.all { it.deudaTotal > 0 })
        val deudoresZona = ok(cobranzaRepo.contratosConDeuda(null, "Norte", 0)).items
        assertTrue(deudoresZona.isNotEmpty() && deudoresZona.all { it.sector == "Norte" })

        // --- Caja: turno, egreso y resumen del mes ---
        val turnoInicial = ok(cajaTurnoRepo.turnoAbierto())
        val turno = turnoInicial ?: ok(cajaTurnoRepo.abrir(100.0))
        assertEquals("abierta", turno.estado)
        val egreso = ok(
            cajaRepo.registrarMovimiento(
                CreateMovimientoRequest("egreso", OffsetDateTime.now().toString(), 12.5, "efectivo", "Combustible", "Prueba app"),
            ),
        )
        assertEquals(12.5, egreso.monto, 0.0)
        val inicioMes = OffsetDateTime.now().withDayOfMonth(1).toLocalDate().atStartOfDay().toString() + "-05:00"
        val resumenCaja = ok(cajaRepo.resumen(inicioMes, OffsetDateTime.now().toString()))
        assertTrue(resumenCaja.egresosTotal >= 12.5)
        val ahora = OffsetDateTime.now().toString()
        val egresosPagina = ok(cajaRepo.movimientos(inicioMes, ahora, "egreso", 0))
        assertTrue(egresosPagina.items.size <= TAMANO_PAGINA && egresosPagina.items.any { it.monto == 12.5 } && egresosPagina.items.all { it.tipo == "egreso" })

        // Ingreso externo desde la app: sube el ingreso del mes y el monto esperado del turno (si es en efectivo)
        val esperadoAntes = ok(cajaTurnoRepo.turnoAbierto())!!.montoEsperado ?: 0.0
        val resumenAntes = ok(cajaRepo.resumen(inicioMes, ahora))
        val externo = ok(
            cajaRepo.registrarMovimiento(
                CreateMovimientoRequest("ingreso", OffsetDateTime.now().toString(), 40.0, "efectivo", "Aporte del dueño", "Aporte de prueba app"),
            ),
        )
        assertEquals("ingreso", externo.tipo)
        assertEquals("externo", externo.origen)
        assertEquals(esperadoAntes + 40.0, ok(cajaTurnoRepo.turnoAbierto())!!.montoEsperado ?: 0.0, 0.001)
        assertEquals(resumenAntes.ingresosTotal + 40.0, ok(cajaRepo.resumen(inicioMes, ahora)).ingresosTotal, 0.001)
        val ingresosPagina = ok(cajaRepo.movimientos(inicioMes, ahora, "ingreso", 0))
        assertTrue(ingresosPagina.items.all { it.tipo == "ingreso" } && ingresosPagina.items.any { it.id == externo.id })
        val mixtos = ok(cajaRepo.movimientos(inicioMes, ahora, null, 0)).items
        assertTrue("sin filtro vienen ingresos y egresos", mixtos.any { it.tipo == "ingreso" } && mixtos.any { it.tipo == "egreso" })
        assertTrue(ok(cajaRepo.listarCategorias("ingreso")).any { it.nombre == "Aporte del dueño" })
        // Un ingreso por Yape no toca el efectivo esperado
        ok(cajaRepo.registrarMovimiento(CreateMovimientoRequest("ingreso", OffsetDateTime.now().toString(), 25.0, "yape", "Venta de equipos", "Router usado")))
        assertEquals(esperadoAntes + 40.0, ok(cajaTurnoRepo.turnoAbierto())!!.montoEsperado ?: 0.0, 0.001)
        assertTrue(ok(cajaRepo.listarCategorias("egreso")).any { it.nombre == "Combustible" })

        // --- Pago: la app cobra un cargo y Keysls lo deja pagado ---
        val cliente = clientes.buscar("otro cliente con deuda") { c -> c.contratos.any { it.deudaPendiente > 0 } && c.id != conContrato.id }
        val ficha0 = ok(clientesRepo.ficha(cliente.id))
        val pendientes = ok(clientesRepo.cargosPendientes(cliente.id))
        assertTrue(pendientes.isNotEmpty())
        val cargo = pendientes.first()
        val pagoId = ok(boletasRepo.registrarPago(cliente.id, listOf(cargo.id), cargo.saldo, "efectivo"))
        val comprobante = ok(boletasRepo.obtener(pagoId))
        assertEquals(cargo.saldo, comprobante.montoTotal, 0.001)
        assertTrue(comprobante.folio.startsWith("P-"))
        assertEquals(cliente.nombreCompleto, comprobante.cliente.nombreCompleto)
        val despues = ok(clientesRepo.ficha(cliente.id))
        // Keysls solo lista los cargos que aún se deben: el cobrado sale de la ficha y baja el saldo.
        assertTrue("el cargo cobrado ya no debe aparecer como pendiente", despues.cargosMesAMes.none { it.id == cargo.id })
        assertEquals(ficha0.saldoTotal - cargo.saldo, despues.saldoTotal, 0.001)
        assertTrue(ok(boletasRepo.listar(null, 0)).items.any { it.id == pagoId })

        // --- Órdenes: el panel asigna un técnico y el técnico la trabaja desde su portal ---
        val tecnicoEmail = checkNotNull(System.getenv("KEYSLS_LIVE_TEC_EMAIL"))
        val tecnicoPassword = checkNotNull(System.getenv("KEYSLS_LIVE_TEC_PASSWORD"))
        var tokenTec: String? = null
        val apiTec = retrofit { tokenTec }.create(ApiServiceTecnico::class.java)
        val loginTec = apiTec.login(LoginRequest(tecnicoEmail, tecnicoPassword))
        tokenTec = loginTec.token
        val tecnicos = ok(ordenesRepo.listarTecnicos())
        val tecnico = tecnicos.buscar("el tecnico de prueba") { it.id == loginTec.tecnico.id }
        val asignada = ok(ordenesRepo.asignarTecnico(ordenInstalacion.id, tecnico.id))
        assertEquals(EstadosOrdenServicio.ASIGNADA, asignada.estado)
        assertEquals(tecnico.id, asignada.tecnicoId)

        val tecRepo = OrdenesTecnicoRepository(apiTec, cache)
        assertEquals(loginTec.tecnico.nombre, ok(tecRepo.perfil()).nombre)
        assertTrue(ok(tecRepo.listar(null)).any { it.id == ordenInstalacion.id })
        assertEquals(EstadosOrdenServicio.ASIGNADA, ok(tecRepo.aceptar(ordenInstalacion.id)).estado)
        assertEquals(EstadosOrdenServicio.EN_PROCESO, ok(tecRepo.iniciar(ordenInstalacion.id)).estado)
        val completada = ok(tecRepo.completar(ordenInstalacion.id, CompletarOrdenRequest(observacionFinal = "Instalado desde la app", precinto = "P-${System.currentTimeMillis() % 1000}")))
        assertEquals(EstadosOrdenServicio.COMPLETADA, completada.estado)
        assertTrue(ok(tecRepo.listar(EstadosOrdenServicio.COMPLETADA)).any { it.id == ordenInstalacion.id })
        // Al completar una instalación Keysls fija la fecha de instalación del contrato
        assertNotNull(ok(contratosRepo.obtener(contratoNuevo.id)).fechaInstalacion)

        // --- Crear un servicio técnico desde la app (orden nueva ya asignada al técnico) ---
        val servicioTecnico = ok(
            ordenesRepo.crear(
                CreateOrdenRequest(
                    contratoId = contratoNuevo.id, tipoOrden = "averia", tipoServicio = contratoNuevo.tipoServicio,
                    abonado = "Cliente App Prueba", direccion = "Calle App 123", celular = "999888777",
                    observacion = "Sin señal (creado desde la app)", tecnicoId = tecnico.id,
                ),
            ),
        )
        assertEquals("averia", servicioTecnico.tipoOrden)
        assertEquals(contratoNuevo.tipoServicio, servicioTecnico.tipoServicio)
        assertEquals(EstadosOrdenServicio.ASIGNADA, servicioTecnico.estado)
        assertEquals(tecnico.id, servicioTecnico.tecnicoId)
        assertTrue("el técnico la ve en su portal", ok(tecRepo.listar(null)).any { it.id == servicioTecnico.id })
        // Sin técnico queda pendiente y libre
        val libre = ok(
            ordenesRepo.crear(
                CreateOrdenRequest(
                    contratoId = contratoNuevo.id, tipoOrden = "cambio_equipo", tipoServicio = contratoNuevo.tipoServicio,
                    abonado = "Cliente App Prueba", direccion = "Calle App 123",
                ),
            ),
        )
        assertEquals(EstadosOrdenServicio.PENDIENTE, libre.estado)
        assertNull(libre.tecnicoId)

        // La ficha del cliente lista sus servicios técnicos (más recientes primero, hasta 10)
        val fichaNueva = ok(clientesRepo.ficha(nuevo.id))
        assertTrue(fichaNueva.serviciosTecnicos.size <= TAMANO_PAGINA)
        assertTrue("la ficha incluye los servicios técnicos creados", fichaNueva.serviciosTecnicos.any { it.id == servicioTecnico.id } && fichaNueva.serviciosTecnicos.any { it.id == libre.id })
        assertTrue(fichaNueva.serviciosTecnicos.all { it.contratoId == contratoNuevo.id })

        // --- Cancelar una orden desde el panel ---
        val otraOrden = ok(ordenesRepo.listar(EstadosOrdenServicio.PENDIENTE, null, 0)).items.first()
        assertEquals(EstadosOrdenServicio.CANCELADA, ok(ordenesRepo.cancelar(otraOrden.id)).estado)

        // --- Empresa y planes ---
        val config = ok(configRepo.obtener())
        val guardada = ok(configRepo.actualizar(com.cablera.app.data.remote.dto.UpdateConfiguracionRequest(
            nombreEmpresa = config.nombreEmpresa, ruc = config.ruc, telefonoContacto = config.telefonoContacto,
            direccionContacto = config.direccionContacto, agencia = config.agencia,
        )))
        assertEquals(config.nombreEmpresa, guardada.nombreEmpresa)
        assertTrue(ok(planesRepo.listar(false)).isNotEmpty())

        // Baja de un contrato desde la app (queda de baja con su motivo)
        val baja = ok(contratosRepo.darDeBaja(contratoNuevo.id, "Prueba"))
        assertEquals(EstadosContrato.BAJA, baja.estado)
        assertEquals("Prueba", baja.motivoBaja)
        cacheDir.deleteRecursively()
    }

    @Test
    fun `duplicados, ordenes del panel y anulacion de pagos funcionan contra Keysls`() = runBlocking<Unit> {
        assumeTrue("KEYSLS_LIVE_URL no definida: prueba omitida", url != null)
        var token: String? = null
        val api = retrofit { token }.create(ApiService::class.java)
        val login = api.login(LoginRequest(checkNotNull(System.getenv("KEYSLS_LIVE_EMAIL")), checkNotNull(System.getenv("KEYSLS_LIVE_PASSWORD"))))
        token = login.token
        val cacheDir = File.createTempFile("cache", "").also { it.delete(); it.mkdirs() }
        val cache = ApiCache(cacheDir)
        val contratosRepo = ContratosRepository(api, cache)
        val clientesRepo = ClientesRepository(api, cache, contratosRepo)
        val boletasRepo = BoletasRepository(api, cache)
        val ordenesRepo = OrdenesServicioRepository(api, cache)
        val planesRepo = PlanesRepository(api, cache)

        val dni = (10000000..99999999).random().toString()
        val nuevo = ok(clientesRepo.crear(CreateClienteRequest(dni = dni, nombreCompleto = "Cliente Panel Prueba", telefono = "999888777")))
        val plan = ok(planesRepo.listar(soloActivos = true)).first()
        val contratoNuevo = ok(
            contratosRepo.crear(
                CreateContratoRequest(clienteId = nuevo.id, tipoServicio = plan.tipoServicio, direccion = "Calle Panel 1", diaCorte = 10, planId = plan.id, costoMensual = plan.precio),
            ),
        )
        val servicioTecnico = ok(
            ordenesRepo.crear(CreateOrdenRequest(contratoId = contratoNuevo.id, tipoOrden = "averia", tipoServicio = contratoNuevo.tipoServicio, abonado = "Cliente Panel Prueba", direccion = "Calle Panel 1")),
        )
        val libre = ok(
            ordenesRepo.crear(CreateOrdenRequest(contratoId = contratoNuevo.id, tipoOrden = "cambio_equipo", tipoServicio = contratoNuevo.tipoServicio, abonado = "Cliente Panel Prueba", direccion = "Calle Panel 1")),
        )
        // Un cliente con deuda para cobrar y anular
        val cliente = ok(clientesRepo.listar(null, null, 0)).items.buscar("un cliente con deuda") { c -> c.contratos.any { it.deudaPendiente > 0 } }
        val ficha0 = ok(clientesRepo.ficha(cliente.id))
        val cargo = ok(clientesRepo.cargosPendientes(cliente.id)).first()
        val pagoId = ok(boletasRepo.registrarPago(cliente.id, listOf(cargo.id), cargo.saldo, "efectivo"))

        // --- DNI repetido: la app lo detecta buscando por DNI antes de crear (y el servidor lo rechaza igual) ---
        val existente = ok(clientesRepo.listar(dni, null, 0)).items.firstOrNull { it.dni == dni }
        assertNotNull("el cliente recién creado se encuentra por su DNI", existente)
        assertEquals(nuevo.id, existente!!.id)
        val rechazo = clientesRepo.crear(CreateClienteRequest(dni = dni, nombreCompleto = "Repetido", telefono = "999000111"))
        assertTrue("el servidor rechaza un DNI repetido", rechazo.isFailure && rechazo.exceptionOrNull()?.message?.contains("Ya existe", ignoreCase = true) == true)

        // --- Servicios técnicos desde el panel: iniciar y completar, con o sin técnico asignado ---
        assertEquals(EstadosOrdenServicio.EN_PROCESO, ok(ordenesRepo.iniciar(servicioTecnico.id)).estado)
        assertEquals(EstadosOrdenServicio.COMPLETADA, ok(ordenesRepo.completar(servicioTecnico.id, CompletarOrdenPanelRequest())).estado)
        val sinTecnico = ok(ordenesRepo.completar(libre.id, CompletarOrdenPanelRequest()))
        assertNull(sinTecnico.tecnicoId)
        assertEquals("una orden sin técnico se puede completar", EstadosOrdenServicio.COMPLETADA, sinTecnico.estado)

        // --- Anular un pago: el monto vuelve a ser deuda y el comprobante queda anulado ---
        val anulado = ok(boletasRepo.anular(pagoId, "Cobro registrado por error (prueba app)"))
        assertEquals(EstadosBoleta.ANULADA, anulado.estado)
        assertEquals("Cobro registrado por error (prueba app)", anulado.motivoAnulacion)
        assertNotNull(anulado.fechaAnulacion)
        assertEquals("anular deja la deuda como antes de cobrar", ficha0.saldoTotal, ok(clientesRepo.ficha(cliente.id)).saldoTotal, 0.001)
        assertTrue("el pago anulado sigue en el historial", ok(boletasRepo.listar(null, 0)).items.any { it.id == pagoId && it.estado == EstadosBoleta.ANULADA })
        assertTrue("no se puede anular dos veces", boletasRepo.anular(pagoId, "otra vez").isFailure)

        // --- Orden de la lista de servicios: abiertas, luego canceladas y al final completadas (a través de las páginas) ---
        val rango = mapOf(
            EstadosOrdenServicio.PENDIENTE to 0, EstadosOrdenServicio.ASIGNADA to 0, EstadosOrdenServicio.EN_PROCESO to 0,
            EstadosOrdenServicio.CANCELADA to 1, EstadosOrdenServicio.COMPLETADA to 2,
        )
        val todas = buildList {
            var offset = 0
            while (true) {
                val pagina = ok(ordenesRepo.listar(null, null, offset))
                addAll(pagina.items)
                if (!pagina.hayMas) break
                offset += TAMANO_PAGINA
            }
        }
        val rangos = todas.map { rango.getValue(it.estado) }
        assertEquals("abiertas, canceladas y completadas, en ese orden", rangos.sorted(), rangos)
        assertTrue(rangos.toSet().size > 1)

        cacheDir.deleteRecursively()
    }
}
