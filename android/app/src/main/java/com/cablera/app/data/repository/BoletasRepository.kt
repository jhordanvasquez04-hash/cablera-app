package com.cablera.app.data.repository

import com.cablera.app.data.cache.ApiCache
import com.cablera.app.data.cache.CacheTtl
import com.cablera.app.data.mapper.aKeysls
import com.cablera.app.data.mapper.toBoletaDetalle
import com.cablera.app.data.mapper.toBoletaResumen
import com.cablera.app.data.remote.ApiService
import com.cablera.app.data.remote.dto.BoletaDetalleDto
import com.cablera.app.data.remote.dto.BoletaResumenDto
import com.cablera.app.data.remote.dto.KAnularPagoRequest
import com.cablera.app.data.remote.dto.KCargo
import com.cablera.app.data.remote.dto.KRegistrarPagoRequest
import com.cablera.app.data.remote.safeApiCall
import java.time.Instant

/**
 * "Boletas" de la app = pagos de Keysls (el comprobante de cada pago). Un pago de Keysls es de UN
 * solo contrato; si el cobro abarca cargos de varios contratos del cliente, se registra un pago por
 * contrato y se devuelve el primero.
 */
class BoletasRepository(private val apiService: ApiService, private val cache: ApiCache) {

    suspend fun registrarPago(
        clienteId: String,
        cargoIds: List<String>,
        montoPagado: Double,
        metodoPago: String,
    ): Result<String> = safeApiCall {
        val elegidos = cargoIds.toSet()
        // Cargos elegidos, más antiguos primero (el pago se aplica en ese orden), con su contrato.
        val porContrato = apiService.listarContratos(clienteIds = clienteId)
            .flatMap { contrato -> apiService.cargosDeContrato(contrato.id).filter { it.id in elegidos } }
            .sortedBy { it.periodo }
            .groupBy { it.contratoId }
        if (porContrato.isEmpty()) error("Selecciona al menos un cargo pendiente")

        var restante = montoPagado
        val pagos = mutableListOf<BoletaDetalleDto>()
        for ((contratoId, cargos) in porContrato) {
            if (restante <= 0.0) break
            val deContrato = minOf(restante, cargos.sumOf(KCargo::saldo).coerceAtLeast(0.0))
            if (deContrato <= 0.0) continue
            val pago = apiService.registrarPago(
                KRegistrarPagoRequest(
                    contratoId = contratoId,
                    fecha = Instant.now().toString(),
                    metodoPago = metodoPago.aKeysls(),
                    cargoIds = cargos.map { it.id },
                    monto = deContrato,
                ),
            )
            pagos += pago.toBoletaDetalle()
            restante -= deContrato
        }
        if (pagos.isEmpty()) error("No hay saldo pendiente para cobrar")
        // Primero se descarta lo viejo y recién después se guarda el comprobante recién emitido,
        // para que la pantalla de detalle lo muestre al instante sin buscarlo en la lista.
        cache.invalidarDatos()
        pagos.forEach { cache.guardar("boleta:${it.id}", it) }
        pagos.first().id
    }

    /** Anula el pago (solo gestor): queda en el historial como anulado y su monto vuelve a ser deuda del cliente. */
    suspend fun anular(id: String, motivo: String): Result<BoletaDetalleDto> = safeApiCall {
        apiService.anularPago(id, KAnularPagoRequest(motivo)).toBoletaDetalle()
    }.onSuccess {
        // Cambia la deuda, la caja y las listas: se descarta lo guardado y se deja el comprobante ya actualizado.
        cache.invalidarDatos()
        cache.guardar("boleta:${it.id}", it)
    }

    suspend fun listarEnCache(busqueda: String?, offset: Int): Pagina<BoletaResumenDto>? = cache.leer(claveLista(busqueda, offset))

    /** Una página de pagos (10), del más reciente al más antiguo. */
    suspend fun listar(busqueda: String?, offset: Int): Result<Pagina<BoletaResumenDto>> =
        cache.obtener(claveLista(busqueda, offset), CacheTtl.LISTA) {
            safeApiCall {
                val q = busqueda?.trim()?.takeIf { it.isNotEmpty() }
                val pagina = paginar(offset) { limit, desde -> apiService.listarPagos(q = q, limit = limit, offset = desde) }
                Pagina(pagina.items.map { it.toBoletaResumen() }, pagina.hayMas)
            }
        }

    suspend fun obtenerEnCache(id: String): BoletaDetalleDto? = cache.leer("boleta:$id")

    suspend fun obtener(id: String): Result<BoletaDetalleDto> =
        cache.obtener("boleta:$id", CacheTtl.LISTA) { safeApiCall { apiService.obtenerPago(id).toBoletaDetalle() } }

    private fun claveLista(busqueda: String?, offset: Int) = "boletas:${busqueda.orEmpty().trim()}|$offset"
}
