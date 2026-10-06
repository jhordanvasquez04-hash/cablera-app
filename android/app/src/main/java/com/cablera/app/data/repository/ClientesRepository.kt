package com.cablera.app.data.repository

import com.cablera.app.data.cache.ApiCache
import com.cablera.app.data.cache.CacheTtl
import com.cablera.app.data.mapper.nombreCompleto
import com.cablera.app.data.mapper.toBoletaResumen
import com.cablera.app.data.mapper.toPendienteUi
import com.cablera.app.data.mapper.toUi
import com.cablera.app.data.remote.ApiService
import com.cablera.app.data.remote.dto.CargoPendienteDto
import com.cablera.app.data.remote.dto.ClienteDto
import com.cablera.app.data.remote.dto.ClienteFichaDto
import com.cablera.app.data.remote.dto.CreateClienteRequest
import com.cablera.app.data.remote.dto.EstadosCargo
import com.cablera.app.data.remote.dto.EstadosContrato
import com.cablera.app.data.remote.dto.KCliente
import com.cablera.app.data.remote.dto.KClienteRequest
import com.cablera.app.data.remote.dto.UpdateClienteRequest
import com.cablera.app.data.remote.safeApiCall
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

/**
 * Clientes de Keysls. La API no tiene "ficha" ni detalle por id: se arma juntando la lista de
 * clientes con la de contratos (que trae la deuda) y, para la ficha, los cargos y pagos.
 */
class ClientesRepository(
    private val apiService: ApiService,
    private val cache: ApiCache,
    private val contratosRepository: ContratosRepository,
    /** null = gestor (ve todos los pagos); si no, solo los registrados por ese usuario. */
    private val soloPagosDe: suspend () -> String? = { null },
) {

    suspend fun listarEnCache(busqueda: String?, sector: String?, offset: Int): Pagina<ClienteDto>? =
        cache.leer(claveLista(busqueda, sector, offset))

    /** Una página de clientes (10), con sus contratos y deuda; el buscador y la zona se filtran en el servidor. */
    suspend fun listar(busqueda: String?, sector: String?, offset: Int): Result<Pagina<ClienteDto>> =
        cache.obtener(claveLista(busqueda, sector, offset), CacheTtl.LISTA) {
            safeApiCall {
                val q = busqueda?.trim()?.takeIf { it.isNotEmpty() }
                val pagina = paginar(offset) { limit, desde -> apiService.listarClientes(q, sector, limit, desde) }
                // Los contratos (y su deuda) solo de los clientes de esta página, en una sola consulta.
                val contratos = if (pagina.items.isEmpty()) {
                    emptyList()
                } else {
                    apiService.listarContratos(clienteIds = pagina.items.joinToString(",") { it.id })
                }
                val porCliente = contratos.groupBy { it.clienteId }
                Pagina(pagina.items.map { it.toUi(porCliente[it.id].orEmpty()) }, pagina.hayMas)
            }
        }

    // Sin caché a propósito: se usa al registrar pagos y debe reflejar el estado real de la deuda.
    suspend fun obtener(id: String): Result<ClienteDto> = safeApiCall { armarCliente(id) }

    suspend fun fichaEnCache(id: String): ClienteFichaDto? = cache.leer("ficha:$id")

    suspend fun ficha(id: String): Result<ClienteFichaDto> =
        cache.obtener("ficha:$id", CacheTtl.LISTA) { safeApiCall { armarFicha(id) } }

    suspend fun cargosPendientes(id: String): Result<List<CargoPendienteDto>> = safeApiCall {
        cargosDe(armarCliente(id)).filter { it.estado != EstadosCargo.PAGADO }
    }

    suspend fun crear(request: CreateClienteRequest): Result<ClienteDto> = safeApiCall {
        apiService.crearCliente(
            KClienteRequest(
                dniRuc = request.dni,
                nombres = request.nombreCompleto,
                telefono = request.telefono,
                email = request.email,
                direccion = request.direccion,
                latitud = request.latitud,
                longitud = request.longitud,
            ),
        ).toUi()
    }.onSuccess { cache.invalidarDatos() }

    suspend fun actualizar(id: String, request: UpdateClienteRequest): Result<ClienteDto> = safeApiCall {
        val actual = clienteCrudo(id)
        val nombreCambio = request.nombreCompleto != null && request.nombreCompleto != nombreCompleto(actual.nombres, actual.apellidos)
        apiService.actualizarCliente(
            id,
            KClienteRequest(
                dniRuc = request.dni ?: actual.dniRuc.orEmpty(),
                // La app edita un solo campo "nombre": si cambió, va entero a `nombres` y se limpian
                // los apellidos; si no cambió, se conserva la separación que ya tenía.
                nombres = if (nombreCambio) request.nombreCompleto!!.trim() else actual.nombres,
                apellidos = if (nombreCambio) null else actual.apellidos,
                telefono = request.telefono ?: actual.telefono,
                email = request.email ?: actual.email,
                direccion = request.direccion ?: actual.direccion,
                latitud = request.latitud ?: actual.latitud,
                longitud = request.longitud ?: actual.longitud,
                activo = actual.activo,
            ),
        ).toUi()
    }.onSuccess { cache.invalidarDatos() }

    /** Baja del cliente: da de baja todos sus contratos vigentes y lo marca inactivo. */
    suspend fun darDeBaja(id: String, motivo: String): Result<ClienteDto> = safeApiCall {
        val cliente = armarCliente(id)
        cliente.contratos.filter { it.estado != EstadosContrato.BAJA }.forEach {
            contratosRepository.darDeBaja(it.id, motivo).getOrThrow()
        }
        fijarActivo(id, false)
        armarCliente(id)
    }.onSuccess { cache.invalidarDatos() }

    suspend fun suspender(id: String): Result<ClienteDto> = safeApiCall {
        armarCliente(id).contratos.filter { it.estado == EstadosContrato.ACTIVO }.forEach {
            contratosRepository.suspender(it.id).getOrThrow()
        }
        armarCliente(id)
    }.onSuccess { cache.invalidarDatos() }

    suspend fun activar(id: String): Result<ClienteDto> = safeApiCall {
        fijarActivo(id, true)
        armarCliente(id).contratos
            .filter { it.estado == EstadosContrato.SUSPENDIDO || it.estado == EstadosContrato.CORTADO }
            .forEach { contratosRepository.activar(it.id).getOrThrow() }
        armarCliente(id)
    }.onSuccess { cache.invalidarDatos() }

    // --- Armado a partir de la API ---

    private suspend fun clienteCrudo(id: String): KCliente =
        apiService.obtenerCliente(id)

    private suspend fun armarCliente(id: String): ClienteDto = coroutineScope {
        val cliente = async { clienteCrudo(id) }
        val contratos = async { apiService.listarContratos(clienteIds = id) }
        cliente.await().toUi(contratos.await())
    }

    private suspend fun cargosDe(cliente: ClienteDto): List<CargoPendienteDto> = coroutineScope {
        cliente.contratos.map { contrato ->
            async {
                apiService.cargosDeContrato(contrato.id)
                    // Los cargos anulados o exonerados no dejan saldo ni se cobran.
                    .filter { it.estado in ESTADOS_COBRABLES }
                    .map { it.toPendienteUi(numeroContrato = contrato.numero, tipoServicio = contrato.tipoServicio) }
            }
        }.map { it.await() }.flatten().sortedWith(compareByDescending<CargoPendienteDto> { it.anio }.thenByDescending { it.mes })
    }

    private suspend fun armarFicha(id: String): ClienteFichaDto = coroutineScope {
        val cliente = armarCliente(id)
        val cargos = async { cargosDe(cliente) }
        // Los pagos no se pueden filtrar por cliente: se busca por su DNI/RUC y se acota a sus contratos.
        val propietario = soloPagosDe()
        val pagos = async {
            val idsContratos = cliente.contratos.map { it.id }.toSet()
            if (cliente.dni.isNullOrBlank()) {
                emptyList()
            } else {
                apiService.listarPagos(q = cliente.dni, limit = TAMANO_PAGINA)
                    .filter { pago -> pago.cargos.any { it.cargo.contrato.id in idsContratos } }
                    .filter { propietario == null || it.usuarioId == propietario }
                    .map { it.toBoletaResumen() }
            }
        }
        val servicios = async {
            if (cliente.contratos.isEmpty()) {
                emptyList()
            } else {
                apiService.listarOrdenes(
                    contratoIds = cliente.contratos.joinToString(",") { it.id },
                    limit = TAMANO_PAGINA,
                    orden = ORDEN_PRIORIDAD,
                ).map { it.toUi() }
            }
        }
        val cargosCliente = cargos.await()
        ClienteFichaDto(
            cliente = cliente,
            saldoTotal = cargosCliente.filter { it.estado != EstadosCargo.PAGADO }.sumOf { it.saldo },
            cargosMesAMes = cargosCliente,
            historialPagos = pagos.await(),
            serviciosTecnicos = servicios.await(),
        )
    }

    private suspend fun fijarActivo(id: String, activo: Boolean) {
        val actual = clienteCrudo(id)
        apiService.actualizarCliente(
            id,
            KClienteRequest(
                dniRuc = actual.dniRuc.orEmpty(),
                nombres = actual.nombres,
                apellidos = actual.apellidos,
                telefono = actual.telefono,
                email = actual.email,
                direccion = actual.direccion,
                latitud = actual.latitud,
                longitud = actual.longitud,
                activo = activo,
            ),
        )
    }

    private fun claveLista(busqueda: String?, sector: String?, offset: Int) =
        "clientes:${busqueda.orEmpty().trim()}|${sector.orEmpty()}|$offset"

    private companion object {
        val ESTADOS_COBRABLES = setOf("PENDIENTE", "PARCIAL", "PAGADO")
    }
}
