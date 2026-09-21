package com.cablera.app.ui.caja

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.CategoriaEgresoDto
import com.cablera.app.data.remote.dto.CreateMovimientoRequest
import com.cablera.app.data.remote.dto.GastoReportadoDto
import com.cablera.app.data.remote.dto.MetodosPago
import com.cablera.app.data.remote.dto.MovimientoCajaDto
import com.cablera.app.data.remote.dto.ResumenCajaDto
import com.cablera.app.data.remote.dto.TiposMovimientoCaja
import com.cablera.app.data.repository.CajaRepository
import com.cablera.app.ui.common.UiState
import com.cablera.app.util.ZONA_PERU
import java.time.LocalTime
import java.time.OffsetDateTime
import java.time.YearMonth
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class CajaUiState(
    val mesSeleccionado: YearMonth = YearMonth.now(ZONA_PERU),
    val resumen: UiState<ResumenCajaDto> = UiState.Loading,
    val movimientos: UiState<List<MovimientoCajaDto>> = UiState.Loading,
    val gastosPendientes: List<GastoReportadoDto> = emptyList(),
    val categorias: List<CategoriaEgresoDto> = emptyList(),
    val mostrarForm: Boolean = false,
    val tipoMovimiento: String = TiposMovimientoCaja.EGRESO,
    val montoMovimiento: String = "",
    val metodoMovimiento: String = MetodosPago.EFECTIVO,
    val categoriaId: String? = null,
    val descripcionMovimiento: String = "",
    val guardandoMovimiento: Boolean = false,
    val errorMovimiento: String? = null,
    val procesandoGastoId: String? = null,
    val mostrandoNuevaCategoria: Boolean = false,
    val nombreNuevaCategoria: String = "",
    val creandoCategoria: Boolean = false,
) {
    /** No tiene sentido navegar a meses futuros: el más reciente visible es el actual. */
    val puedeAvanzarMes: Boolean get() = mesSeleccionado < YearMonth.now(ZONA_PERU)

    /** Un mes anterior ya "cerró": solo se puede consultar, no registrar movimientos nuevos ahí
     * (registrar siempre usa la fecha/hora real de hoy, así que de todos modos no aparecería en
     * el mes que se está mirando — mejor no ofrecer la acción para no confundir). */
    val esMesActual: Boolean get() = mesSeleccionado == YearMonth.now(ZONA_PERU)
}

class CajaViewModel(private val cajaRepository: CajaRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(CajaUiState())
    val uiState: StateFlow<CajaUiState> = _uiState.asStateFlow()

    init {
        cargar()
        cargarGastosPendientes()
        cargarCategorias()
    }

    fun mesAnterior() {
        _uiState.value = _uiState.value.copy(mesSeleccionado = _uiState.value.mesSeleccionado.minusMonths(1))
        cargar()
    }

    fun mesSiguiente() {
        val estado = _uiState.value
        if (!estado.puedeAvanzarMes) return
        _uiState.value = estado.copy(mesSeleccionado = estado.mesSeleccionado.plusMonths(1))
        cargar()
    }

    /** Rango del mes elegido en hora de Lima (00:00 del día 1 al último instante del último día),
     * para que "separado por meses" no dependa del huso del teléfono ni del servidor. */
    private fun rangoDelMes(mes: YearMonth): Pair<String, String> {
        val desde = mes.atDay(1).atStartOfDay(ZONA_PERU).toOffsetDateTime().toString()
        val hasta = mes.atEndOfMonth().atTime(LocalTime.MAX).atZone(ZONA_PERU).toOffsetDateTime().toString()
        return desde to hasta
    }

    fun cargar() {
        val (desde, hasta) = rangoDelMes(_uiState.value.mesSeleccionado)
        viewModelScope.launch {
            val resumenGuardado = cajaRepository.resumenEnCache(desde, hasta)
            val movimientosGuardados = cajaRepository.movimientosEnCache(desde, hasta)
            _uiState.value = _uiState.value.copy(
                resumen = if (resumenGuardado != null) UiState.Success(resumenGuardado) else UiState.Loading,
                movimientos = if (movimientosGuardados != null) UiState.Success(movimientosGuardados) else UiState.Loading,
            )
            val resumenDeferred = async { cajaRepository.resumen(desde, hasta) }
            val movimientosDeferred = async { cajaRepository.movimientos(desde, hasta) }

            resumenDeferred.await()
                .onSuccess { data -> _uiState.value = _uiState.value.copy(resumen = UiState.Success(data)) }
                .onFailure { e -> _uiState.value = _uiState.value.copy(resumen = UiState.Error(e.message ?: "No se pudo cargar la caja")) }

            movimientosDeferred.await()
                .onSuccess { data -> _uiState.value = _uiState.value.copy(movimientos = UiState.Success(data)) }
                .onFailure { e -> _uiState.value = _uiState.value.copy(movimientos = UiState.Error(e.message ?: "No se pudo cargar los movimientos")) }
        }
    }

    fun cargarGastosPendientes() {
        viewModelScope.launch {
            cajaRepository.gastosPendientes().onSuccess { gastos -> _uiState.value = _uiState.value.copy(gastosPendientes = gastos) }
        }
    }

    fun cargarCategorias() {
        viewModelScope.launch {
            cajaRepository.listarCategorias().onSuccess { categorias ->
                _uiState.value = _uiState.value.copy(categorias = categorias, categoriaId = _uiState.value.categoriaId ?: categorias.firstOrNull()?.id)
            }
        }
    }

    fun abrirForm(tipo: String) {
        if (!_uiState.value.esMesActual) return // defensa extra: el mes en pantalla ya cerró
        _uiState.value = _uiState.value.copy(
            mostrarForm = true,
            tipoMovimiento = tipo,
            montoMovimiento = "",
            descripcionMovimiento = "",
            errorMovimiento = null,
        )
    }

    fun cerrarForm() { _uiState.value = _uiState.value.copy(mostrarForm = false) }
    fun mostrarNuevaCategoria() { _uiState.value = _uiState.value.copy(mostrandoNuevaCategoria = true) }
    fun ocultarNuevaCategoria() { _uiState.value = _uiState.value.copy(mostrandoNuevaCategoria = false, nombreNuevaCategoria = "") }
    fun onNombreNuevaCategoriaChange(v: String) { _uiState.value = _uiState.value.copy(nombreNuevaCategoria = v) }

    fun crearCategoria() {
        val nombre = _uiState.value.nombreNuevaCategoria.trim()
        if (nombre.isBlank()) return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(creandoCategoria = true)
            cajaRepository.crearCategoria(nombre)
                .onSuccess { categoria ->
                    _uiState.value = _uiState.value.copy(
                        categorias = _uiState.value.categorias + categoria,
                        categoriaId = categoria.id,
                        creandoCategoria = false,
                        mostrandoNuevaCategoria = false,
                        nombreNuevaCategoria = "",
                    )
                }
                .onFailure { e -> _uiState.value = _uiState.value.copy(creandoCategoria = false, errorMovimiento = e.message ?: "No se pudo crear la categoría") }
        }
    }

    fun onMontoChange(v: String) { _uiState.value = _uiState.value.copy(montoMovimiento = v, errorMovimiento = null) }
    fun onMetodoChange(v: String) { _uiState.value = _uiState.value.copy(metodoMovimiento = v) }
    fun onCategoriaChange(v: String) { _uiState.value = _uiState.value.copy(categoriaId = v) }
    fun onDescripcionChange(v: String) { _uiState.value = _uiState.value.copy(descripcionMovimiento = v) }

    fun guardarMovimiento() {
        val estado = _uiState.value
        val monto = estado.montoMovimiento.toDoubleOrNull()
        if (monto == null || monto <= 0.0) {
            _uiState.value = estado.copy(errorMovimiento = "Ingresa un monto válido")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(guardandoMovimiento = true, errorMovimiento = null)
            cajaRepository.registrarMovimiento(
                CreateMovimientoRequest(
                    tipo = estado.tipoMovimiento,
                    fecha = OffsetDateTime.now().toString(),
                    monto = monto,
                    metodoPago = estado.metodoMovimiento,
                    categoriaId = if (estado.tipoMovimiento == TiposMovimientoCaja.EGRESO) estado.categoriaId else null,
                    descripcion = estado.descripcionMovimiento.ifBlank { null },
                ),
            )
                .onSuccess {
                    _uiState.value = _uiState.value.copy(guardandoMovimiento = false, mostrarForm = false)
                    cargar()
                }
                .onFailure { e -> _uiState.value = _uiState.value.copy(guardandoMovimiento = false, errorMovimiento = e.message ?: "No se pudo registrar") }
        }
    }

    fun aprobarGasto(id: String, metodoPago: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(procesandoGastoId = id)
            cajaRepository.aprobarGasto(id, metodoPago)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(procesandoGastoId = null)
                    cargarGastosPendientes()
                    cargar()
                }
                .onFailure { _uiState.value = _uiState.value.copy(procesandoGastoId = null) }
        }
    }

    fun rechazarGasto(id: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(procesandoGastoId = id)
            cajaRepository.rechazarGasto(id)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(procesandoGastoId = null)
                    cargarGastosPendientes()
                }
                .onFailure { _uiState.value = _uiState.value.copy(procesandoGastoId = null) }
        }
    }
}
