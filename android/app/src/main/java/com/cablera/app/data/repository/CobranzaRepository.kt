package com.cablera.app.data.repository

import com.cablera.app.data.cache.ApiCache
import com.cablera.app.data.cache.CacheTtl
import com.cablera.app.data.mapper.toContratoConDeuda
import com.cablera.app.data.mapper.toUi
import com.cablera.app.data.remote.ApiService
import com.cablera.app.data.remote.dto.ContratoConDeudaDto
import com.cablera.app.data.remote.dto.ResumenCobranzaDto
import com.cablera.app.data.remote.safeApiCall
import com.cablera.app.util.ZONA_PERU
import java.time.LocalDate
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

/**
 * Cobranza. Los indicadores vienen de los totales del servidor (`/dashboard/kpis`) y la lista de
 * contratos con deuda se pide por páginas de [TAMANO_PAGINA], con buscador y filtro por zona.
 */
class CobranzaRepository(
    private val apiService: ApiService,
    private val cache: ApiCache,
    /** Id del usuario con sesión iniciada (para "cobrado hoy por ti"); una función para no atar esto a Android. */
    private val usuarioActualId: suspend () -> String?,
) {

    suspend fun resumenEnCache(): ResumenCobranzaDto? = cache.leer(CLAVE_RESUMEN)

    suspend fun resumen(): Result<ResumenCobranzaDto> =
        cache.obtener(CLAVE_RESUMEN, CacheTtl.LISTA) { safeApiCall { armarResumen() } }

    suspend fun contratosConDeudaEnCache(busqueda: String?, sector: String?, offset: Int): Pagina<ContratoConDeudaDto>? =
        cache.leer(claveLista(busqueda, sector, offset))

    suspend fun contratosConDeuda(busqueda: String?, sector: String?, offset: Int): Result<Pagina<ContratoConDeudaDto>> =
        cache.obtener(claveLista(busqueda, sector, offset), CacheTtl.LISTA) {
            safeApiCall {
                paginar(offset) { limit, desde ->
                    apiService.listarContratos(
                        q = busqueda?.trim()?.takeIf { it.isNotEmpty() },
                        sector = sector,
                        conDeuda = true,
                        limit = limit,
                        offset = desde,
                    ).map { it.toUi().toContratoConDeuda() }
                }
            }
        }

    private suspend fun armarResumen(): ResumenCobranzaDto = coroutineScope {
        val hoy = LocalDate.now(ZONA_PERU)
        val usuarioId = usuarioActualId()

        val kpis = async { apiService.kpis().data }
        val sectores = async { runCatching { apiService.listarSectores() }.getOrDefault(emptyList()) }
        // Solo los pagos de HOY (una lista corta): sirve para "cobrado hoy por ti".
        val pagosHoy = async { runCatching { apiService.listarPagos(fechaDesde = hoy.toString(), fechaHasta = hoy.toString()) }.getOrDefault(emptyList()) }

        val k = kpis.await()
        val propios = pagosHoy.await().filter { it.usuarioId == usuarioId && !it.anulado }
        ResumenCobranzaDto(
            cobradoMes = k.recaudadoMes,
            deudaAcumulada = k.deudaTotal,
            contratosActivos = k.contratosActivos,
            contratosActivosConDeuda = k.contratosActivosConDeuda,
            deudaContratosActivos = k.deudaContratosActivos,
            clientesConDeudaCount = k.clientesConDeuda,
            cobradoHoyPorUsuario = propios.sumOf { it.monto },
            cobrosHoyPorUsuarioCount = propios.size,
            sectores = sectores.await(),
        )
    }

    private fun claveLista(busqueda: String?, sector: String?, offset: Int) =
        "cobranza-lista:${busqueda.orEmpty().trim()}|${sector.orEmpty()}|$offset"

    private companion object {
        const val CLAVE_RESUMEN = "cobranza:resumen"
    }
}
