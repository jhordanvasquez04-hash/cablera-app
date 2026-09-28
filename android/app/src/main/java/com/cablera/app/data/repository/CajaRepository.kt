package com.cablera.app.data.repository

import com.cablera.app.data.cache.ApiCache
import com.cablera.app.data.cache.CacheTtl
import com.cablera.app.data.mapper.aKeysls
import com.cablera.app.data.mapper.deKeysls
import com.cablera.app.data.mapper.toMovimiento
import com.cablera.app.data.mapper.toUi
import com.cablera.app.data.remote.ApiService
import com.cablera.app.data.remote.dto.CategoriaEgresoDto
import com.cablera.app.data.remote.dto.CreateMovimientoRequest
import com.cablera.app.data.remote.dto.KEgresoRequest
import com.cablera.app.data.remote.dto.MontoPorMetodoDto
import com.cablera.app.data.remote.dto.MovimientoCajaDto
import com.cablera.app.data.remote.dto.OrigenesMovimiento
import com.cablera.app.data.remote.dto.TiposMovimientoCaja
import com.cablera.app.data.remote.dto.ResumenCajaDto
import com.cablera.app.data.remote.safeApiCall

/**
 * Ingresos y egresos de un rango de fechas. En Keysls los ingresos son los pagos cobrados y los
 * egresos se registran aparte (`/egresos`, solo ADMIN/SUPERVISOR); no hay "movimientos" mixtos.
 */
class CajaRepository(private val apiService: ApiService, private val cache: ApiCache) {

    suspend fun resumenEnCache(desde: String? = null, hasta: String? = null): ResumenCajaDto? =
        cache.leer(claveRango("caja-resumen", desde, hasta))

    /**
     * Totales del rango sacados del servidor (`/pagos/reporte`): no se traen todos los pagos. Los
     * ingresos incluyen los cobros a clientes y los ingresos externos.
     */
    suspend fun resumen(desde: String? = null, hasta: String? = null): Result<ResumenCajaDto> =
        cache.obtener(claveRango("caja-resumen", desde, hasta), CacheTtl.LISTA) {
            safeApiCall {
                val r = apiService.reportePagos(soloFecha(desde), soloFecha(hasta))
                val porMetodo = (r.porMetodo.keys + r.porMetodoExternos.keys).associateWith { m ->
                    (r.porMetodo[m] ?: 0.0) + (r.porMetodoExternos[m] ?: 0.0)
                }
                val ingresos = r.totalIngresos + r.ingresosExternos
                ResumenCajaDto(
                    desde = desde.orEmpty(),
                    hasta = hasta.orEmpty(),
                    porMetodo = porMetodo.filterValues { it > 0.0 }.map { (metodo, monto) -> MontoPorMetodoDto(metodo.deKeysls(), monto) },
                    ingresosTotal = ingresos,
                    egresosTotal = r.totalEgresos,
                    neto = ingresos - r.totalEgresos,
                )
            }
        }

    suspend fun movimientosEnCache(desde: String?, hasta: String?, tipo: String?, offset: Int): Pagina<MovimientoCajaDto>? =
        cache.leer(claveMovimientos(desde, hasta, tipo, offset))

    /** Una página de movimientos (10) del rango, del más reciente al más antiguo; `tipo`: "ingreso" | "egreso" | null (todos). */
    suspend fun movimientos(desde: String?, hasta: String?, tipo: String?, offset: Int): Result<Pagina<MovimientoCajaDto>> =
        cache.obtener(claveMovimientos(desde, hasta, tipo, offset), CacheTtl.LISTA) {
            safeApiCall {
                val pagina = paginar(offset) { limit, d ->
                    apiService.movimientosCaja(tipo?.aKeysls(), soloFecha(desde), soloFecha(hasta), limit, d)
                }
                Pagina(pagina.items.map { it.toUi() }, pagina.hayMas)
            }
        }

    /** Registra un ingreso externo o un egreso, según `request.tipo`. */
    suspend fun registrarMovimiento(request: CreateMovimientoRequest): Result<MovimientoCajaDto> = safeApiCall {
        val cuerpo = KEgresoRequest(
            concepto = request.descripcion.ifBlank { request.categoria },
            categoria = request.categoria,
            monto = request.monto,
            metodoPago = request.metodoPago.aKeysls(),
            fecha = request.fecha,
        )
        if (request.tipo == TiposMovimientoCaja.INGRESO) {
            apiService.crearIngreso(cuerpo).toMovimiento().copy(tipo = TiposMovimientoCaja.INGRESO, origen = OrigenesMovimiento.EXTERNO)
        } else {
            apiService.crearEgreso(cuerpo).toMovimiento()
        }
    }.onSuccess { cache.invalidarDatos() }

    /** Las categorías son texto libre en Keysls: las sugeridas más las que ya se usaron en ese tipo de movimiento. */
    suspend fun listarCategorias(tipo: String): Result<List<CategoriaEgresoDto>> =
        cache.obtener("cat-categorias-$tipo:lista", CacheTtl.CATALOGO) {
            safeApiCall {
                val ingreso = tipo == TiposMovimientoCaja.INGRESO
                val usadas = runCatching {
                    if (ingreso) apiService.listarIngresos(limit = 100) else apiService.listarEgresos(limit = 100)
                }.getOrDefault(emptyList()).mapNotNull { it.categoria?.trim() }
                val sugeridas = if (ingreso) CATEGORIAS_INGRESO else CATEGORIAS_EGRESO
                (sugeridas + usadas).filter { it.isNotBlank() }.distinct().map { CategoriaEgresoDto(id = it, nombre = it) }
            }
        }

    /** Una categoría nueva no se guarda aparte: existe desde que un egreso la usa. */
    fun crearCategoria(nombre: String): Result<CategoriaEgresoDto> {
        cache.invalidar("cat-categorias-ingreso")
        cache.invalidar("cat-categorias-egreso")
        return Result.success(CategoriaEgresoDto(id = nombre, nombre = nombre))
    }

    /** "2026-09-01T00:00-05:00" -> "2026-09-01": Keysls filtra por día. */
    private fun soloFecha(iso: String?): String? = iso?.take(10)

    private fun claveRango(grupo: String, desde: String?, hasta: String?) = "$grupo:${desde.orEmpty()}|${hasta.orEmpty()}"

    private fun claveMovimientos(desde: String?, hasta: String?, tipo: String?, offset: Int) =
        claveRango("caja-movimientos", desde, hasta) + "|${tipo.orEmpty()}|$offset"

    private companion object {
        val CATEGORIAS_EGRESO = listOf("Servicios", "Planilla", "Insumos", "Combustible", "Mantenimiento", "Otros")
        val CATEGORIAS_INGRESO = listOf("Aporte del dueño", "Venta de equipos", "Devolución", "Instalaciones", "Otros")
    }
}
