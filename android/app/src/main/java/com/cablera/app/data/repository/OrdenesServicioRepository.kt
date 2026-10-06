package com.cablera.app.data.repository

import com.cablera.app.data.cache.ApiCache
import com.cablera.app.data.cache.CacheTtl
import com.cablera.app.data.mapper.aKeysls
import com.cablera.app.data.mapper.toResumen
import com.cablera.app.data.mapper.toUi
import com.cablera.app.data.remote.ApiService
import com.cablera.app.data.remote.dto.CompletarOrdenPanelRequest
import com.cablera.app.data.remote.dto.CreateOrdenRequest
import com.cablera.app.data.remote.dto.EstadosOrdenServicio
import com.cablera.app.data.remote.dto.KCambiarEstadoOrdenRequest
import com.cablera.app.data.remote.dto.KOrdenRequest
import com.cablera.app.data.remote.dto.TiposOrdenPorServicio
import com.cablera.app.data.remote.dto.OrdenServicioDto
import com.cablera.app.data.remote.dto.TecnicoResumenDto
import com.cablera.app.data.remote.safeApiCall

/** Vista de Órdenes de servicio desde el PANEL (gestor/cobrador) — no confundir con
 * OrdenesTecnicoRepository (portal de campo, otro cliente/token por completo). Desde el celular se
 * puede listar, ver, crear (servicio técnico), asignar y cancelar; editar una orden sigue siendo solo web. */
class OrdenesServicioRepository(private val apiService: ApiService, private val cache: ApiCache) {

    suspend fun listarEnCache(estado: String?, busqueda: String?, offset: Int): Pagina<OrdenServicioDto>? =
        cache.leer(claveLista(estado, busqueda, offset))

    /** Una página de servicios técnicos (10) con filtro de estado y buscador en el servidor. */
    suspend fun listar(estado: String?, busqueda: String?, offset: Int): Result<Pagina<OrdenServicioDto>> =
        cache.obtener(claveLista(estado, busqueda, offset), CacheTtl.LISTA) {
            safeApiCall {
                val q = busqueda?.trim()?.takeIf { it.isNotEmpty() }
                val pagina = paginar(offset) { limit, desde -> apiService.listarOrdenes(estado?.aKeysls(), q, limit, desde, orden = ORDEN_PRIORIDAD) }
                Pagina(pagina.items.map { it.toUi() }, pagina.hayMas)
            }
        }

    suspend fun obtener(id: String): Result<OrdenServicioDto> = safeApiCall { apiService.obtenerOrden(id).toUi() }

    /** Crea la orden y, si se eligió técnico, la deja asignada a él (en dos llamadas: así lo hace Keysls). */
    suspend fun crear(request: CreateOrdenRequest): Result<OrdenServicioDto> = safeApiCall {
        val creada = apiService.crearOrden(
            KOrdenRequest(
                contratoId = request.contratoId,
                tipoOrden = TiposOrdenPorServicio.aKeysls(request.tipoOrden, request.tipoServicio),
                fechaServicio = java.time.Instant.now().toString(),
                abonado = request.abonado,
                dni = request.dni,
                direccion = request.direccion,
                referencia = request.referencia,
                sector = request.sector,
                celular = request.celular,
                observacion = request.observacion,
                planId = request.planId,
                mbps = request.mbps,
                mensualidad = request.mensualidad,
                ipWan = request.ipWan,
                mascara = request.mascara,
                gateway = request.gateway,
                pppoeUsuario = request.pppoeUsuario,
                pppoePassword = request.pppoePassword,
            ),
        )
        val final = if (request.tecnicoId != null) {
            apiService.cambiarEstadoOrden(
                creada.id,
                KCambiarEstadoOrdenRequest(EstadosOrdenServicio.ASIGNADA.aKeysls(), request.tecnicoId),
            )
        } else {
            creada
        }
        final.toUi()
    }.onSuccess { cache.invalidarDatos() }

    suspend fun asignarTecnico(id: String, tecnicoId: String): Result<OrdenServicioDto> = safeApiCall {
        apiService.cambiarEstadoOrden(id, KCambiarEstadoOrdenRequest(EstadosOrdenServicio.ASIGNADA.aKeysls(), tecnicoId)).toUi()
    }.onSuccess { cache.invalidarDatos() }

    /** "Iniciar trabajo": pasa la orden a en proceso (igual que en la web). */
    suspend fun iniciar(id: String): Result<OrdenServicioDto> = safeApiCall {
        apiService.cambiarEstadoOrden(id, KCambiarEstadoOrdenRequest(EstadosOrdenServicio.EN_PROCESO.aKeysls())).toUi()
    }.onSuccess { cache.invalidarDatos() }

    /** Completa la orden desde el panel, con o sin técnico asignado (como la web). */
    suspend fun completar(id: String, datos: CompletarOrdenPanelRequest): Result<OrdenServicioDto> = safeApiCall {
        apiService.cambiarEstadoOrden(
            id,
            KCambiarEstadoOrdenRequest(
                estado = EstadosOrdenServicio.COMPLETADA.aKeysls(),
                puntoRedId = datos.puntoRedId,
                equipoSerie = datos.equipoSerie,
                // Con punto de red (instalación) se registra la instalación de hoy, como el formulario de la web.
                fechaInstalacion = if (datos.puntoRedId != null) java.time.Instant.now().toString() else null,
                nuevoClienteId = datos.nuevoClienteId,
                celular = datos.celular,
            ),
        ).toUi()
    }.onSuccess { cache.invalidarDatos() }

    suspend fun cancelar(id: String): Result<OrdenServicioDto> = safeApiCall {
        apiService.cambiarEstadoOrden(id, KCambiarEstadoOrdenRequest(EstadosOrdenServicio.CANCELADA.aKeysls())).toUi()
    }.onSuccess { cache.invalidarDatos() }

    suspend fun listarTecnicos(): Result<List<TecnicoResumenDto>> =
        cache.obtener("cat-tecnicos:lista", CacheTtl.CATALOGO) {
            safeApiCall { apiService.listarTecnicos().map { it.toResumen() } }
        }

    private fun claveLista(estado: String?, busqueda: String?, offset: Int) =
        "ordenes-servicio:${estado.orEmpty()}|${busqueda.orEmpty().trim()}|$offset"
}
