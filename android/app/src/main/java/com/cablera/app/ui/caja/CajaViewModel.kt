package com.cablera.app.ui.caja

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.CajaTurnoDto
import com.cablera.app.data.remote.dto.CategoriaEgresoDto
import com.cablera.app.data.remote.dto.CreateMovimientoRequest
import com.cablera.app.data.remote.dto.MetodosPago
import com.cablera.app.data.remote.dto.MovimientoCajaDto
import com.cablera.app.data.remote.dto.ResumenCajaDto
import com.cablera.app.data.remote.dto.TiposMovimientoCaja
import com.cablera.app.data.repository.CajaRepository
import com.cablera.app.data.repository.CajaTurnoRepository
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
    val hayMasMovimientos: Boolean = false,
    /** Filtro de "Movimientos del mes": "ingreso", "egreso" o null (todos). */
    val filtroMovimientos: String? = null,
    /** Tipo del movimiento que se está registrando: "ingreso" (externo) o "egreso". */
    val tipoMovimiento: String = TiposMovimientoCaja.EGRESO,
    val cargandoMasMovimientos: Boolean = false,
    val categorias: List<CategoriaEgresoDto> = emptyList(),
    val mostrarForm: Boolean = false,
    val montoMovimiento: String = "",
    val metodoMovimiento: String = MetodosPago.EFECTIVO,
    val categoriaId: String? = null,
    val descripcionMovimiento: String = "",
    val guardandoMovimiento: Boolean = false,
    val errorMovimiento: String? = null,
    val mostrandoNuevaCategoria: Boolean = false,
    val nombreNuevaCategoria: String = "",
    val creandoCategoria: Boolean = false,
    // Turnos de caja con arqueo (Configuracion.modoCaja = "apertura_cierre", fusión con
    // Keysls) — alternativa al modo "resumen" de siempre. `turnoActual == null` con
    // `cargandoTurno == false` significa "no hay ninguno abierto ahora mismo".
    val turnoActual: CajaTurnoDto? = null,
    val cargandoTurno: Boolean = true,
    val mostrarAbrirTurno: Boolean = false,
    val montoAperturaTurno: String = "",
    val guardandoAbrirTurno: Boolean = false,
    val errorAbrirTurno: String? = null,
    val mostrarCerrarTurno: Boolean = false,
    val montoContadoTurno: String = "",
    val observacionCierreTurno: String = "",
    val guardandoCerrarTurno: Boolean = false,
    val errorCerrarTurno: String? = null,
) {
    /** No tiene sentido navegar a meses futuros: el más reciente visible es el actual. */
    val puedeAvanzarMes: Boolean get() = mesSeleccionado < YearMonth.now(ZONA_PERU)

    /** Un mes anterior ya "cerró": solo se puede consultar, no registrar movimientos nuevos ahí
     * (registrar siempre usa la fecha/hora real de hoy, así que de todos modos no aparecería en
     * el mes que se está mirando — mejor no ofrecer la acción para no confundir). */
    val esMesActual: Boolean get() = mesSeleccionado == YearMonth.now(ZONA_PERU)
}

class CajaViewModel(
    private val cajaRepository: CajaRepository,
    private val cajaTurnoRepository: CajaTurnoRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(CajaUiState())
    val uiState: StateFlow<CajaUiState> = _uiState.asStateFlow()

    init {
        cargar()
        cargarCategorias()
        cargarTurno()
    }

    // --- Turno de caja (apertura/cierre con arqueo) ---
    fun cargarTurno() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(cargandoTurno = true)
            cajaTurnoRepository.turnoAbierto()
                .onSuccess { turno -> _uiState.value = _uiState.value.copy(turnoActual = turno, cargandoTurno = false) }
                .onFailure { _uiState.value = _uiState.value.copy(cargandoTurno = false) }
        }
    }

    fun abrirFormAbrirTurno() { _uiState.value = _uiState.value.copy(mostrarAbrirTurno = true, montoAperturaTurno = "", errorAbrirTurno = null) }
    fun cerrarFormAbrirTurno() { _uiState.value = _uiState.value.copy(mostrarAbrirTurno = false) }
    fun onMontoAperturaChange(v: String) { _uiState.value = _uiState.value.copy(montoAperturaTurno = v) }

    fun confirmarAbrirTurno() {
        val monto = _uiState.value.montoAperturaTurno.toDoubleOrNull()
        if (monto == null || monto < 0) {
            _uiState.value = _uiState.value.copy(errorAbrirTurno = "Ingresa un monto inicial válido")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(guardandoAbrirTurno = true, errorAbrirTurno = null)
            cajaTurnoRepository.abrir(monto)
                .onSuccess { turno ->
                    _uiState.value = _uiState.value.copy(guardandoAbrirTurno = false, mostrarAbrirTurno = false, turnoActual = turno)
                }
                .onFailure { e -> _uiState.value = _uiState.value.copy(guardandoAbrirTurno = false, errorAbrirTurno = e.message ?: "No se pudo abrir el turno") }
        }
    }

    fun abrirFormCerrarTurno() { _uiState.value = _uiState.value.copy(mostrarCerrarTurno = true, montoContadoTurno = "", observacionCierreTurno = "", errorCerrarTurno = null) }
    fun cerrarFormCerrarTurno() { _uiState.value = _uiState.value.copy(mostrarCerrarTurno = false) }
    fun onMontoContadoChange(v: String) { _uiState.value = _uiState.value.copy(montoContadoTurno = v) }
    fun onObservacionCierreChange(v: String) { _uiState.value = _uiState.value.copy(observacionCierreTurno = v) }

    fun confirmarCerrarTurno() {
        if (_uiState.value.turnoActual == null) return
        val monto = _uiState.value.montoContadoTurno.toDoubleOrNull()
        if (monto == null || monto < 0) {
            _uiState.value = _uiState.value.copy(errorCerrarTurno = "Ingresa cuánto contaste en efectivo")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(guardandoCerrarTurno = true, errorCerrarTurno = null)
            cajaTurnoRepository.cerrar(monto, _uiState.value.observacionCierreTurno.ifBlank { null })
                .onSuccess {
                    _uiState.value = _uiState.value.copy(guardandoCerrarTurno = false, mostrarCerrarTurno = false, turnoActual = null)
                    cargar()
                }
                .onFailure { e -> _uiState.value = _uiState.value.copy(guardandoCerrarTurno = false, errorCerrarTurno = e.message ?: "No se pudo cerrar el turno") }
        }
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
            _uiState.value = _uiState.value.copy(
                resumen = if (resumenGuardado != null) UiState.Success(resumenGuardado) else UiState.Loading,
            )
            cajaRepository.resumen(desde, hasta)
                .onSuccess { data -> _uiState.value = _uiState.value.copy(resumen = UiState.Success(data)) }
                .onFailure { e -> _uiState.value = _uiState.value.copy(resumen = UiState.Error(e.message ?: "No se pudo cargar la caja")) }
        }
        cargarMovimientos()
    }

    /** Primera página de "Movimientos del mes", respetando el filtro de ingresos/egresos. */
    fun cargarMovimientos() {
        val estado = _uiState.value
        val (desde, hasta) = rangoDelMes(estado.mesSeleccionado)
        viewModelScope.launch {
            val guardados = cajaRepository.movimientosEnCache(desde, hasta, estado.filtroMovimientos, 0)
            _uiState.value = _uiState.value.copy(
                movimientos = if (guardados != null) UiState.Success(guardados.items) else UiState.Loading,
                hayMasMovimientos = guardados?.hayMas ?: false,
            )
            cajaRepository.movimientos(desde, hasta, estado.filtroMovimientos, 0)
                .onSuccess { pagina -> _uiState.value = _uiState.value.copy(movimientos = UiState.Success(pagina.items), hayMasMovimientos = pagina.hayMas) }
                .onFailure { e -> _uiState.value = _uiState.value.copy(movimientos = UiState.Error(e.message ?: "No se pudo cargar los movimientos")) }
        }
    }

    /** Ingresos / Egresos: tocar el que ya está activo vuelve a mostrar todos. */
    fun onFiltroMovimientosChange(tipo: String) {
        val nuevo = if (_uiState.value.filtroMovimientos == tipo) null else tipo
        _uiState.value = _uiState.value.copy(filtroMovimientos = nuevo)
        cargarMovimientos()
    }

    /** Trae los siguientes 10 movimientos del mes. */
    fun verMasMovimientos() {
        val estado = _uiState.value
        val actuales = (estado.movimientos as? UiState.Success)?.data ?: return
        if (estado.cargandoMasMovimientos || !estado.hayMasMovimientos) return
        val (desde, hasta) = rangoDelMes(estado.mesSeleccionado)
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(cargandoMasMovimientos = true)
            cajaRepository.movimientos(desde, hasta, estado.filtroMovimientos, actuales.size)
                .onSuccess { pagina ->
                    _uiState.value = _uiState.value.copy(
                        movimientos = UiState.Success((actuales + pagina.items).distinctBy { it.id }),
                        hayMasMovimientos = pagina.hayMas,
                        cargandoMasMovimientos = false,
                    )
                }
                .onFailure { _uiState.value = _uiState.value.copy(cargandoMasMovimientos = false) }
        }
    }

    fun cargarCategorias() {
        viewModelScope.launch {
            cajaRepository.listarCategorias(_uiState.value.tipoMovimiento).onSuccess { categorias ->
                _uiState.value = _uiState.value.copy(categorias = categorias, categoriaId = categorias.firstOrNull()?.id)
            }
        }
    }

    /** Cambia entre registrar un ingreso externo o un egreso; las categorías sugeridas son distintas. */
    fun onTipoMovimientoChange(tipo: String) {
        if (_uiState.value.tipoMovimiento == tipo) return
        _uiState.value = _uiState.value.copy(tipoMovimiento = tipo, categoriaId = null, categorias = emptyList(), errorMovimiento = null)
        cargarCategorias()
    }

    fun abrirForm() {
        if (!_uiState.value.esMesActual) return // defensa extra: el mes en pantalla ya cerró
        // Si se está mirando solo ingresos, lo natural es que el "+" registre un ingreso.
        val tipo = if (_uiState.value.filtroMovimientos == TiposMovimientoCaja.INGRESO) TiposMovimientoCaja.INGRESO else TiposMovimientoCaja.EGRESO
        _uiState.value = _uiState.value.copy(
            tipoMovimiento = tipo,
            categoriaId = null,
            mostrarForm = true,
            montoMovimiento = "",
            descripcionMovimiento = "",
            errorMovimiento = null,
        )
        cargarCategorias()
    }

    fun cerrarForm() { _uiState.value = _uiState.value.copy(mostrarForm = false) }
    fun mostrarNuevaCategoria() { _uiState.value = _uiState.value.copy(mostrandoNuevaCategoria = true) }
    fun ocultarNuevaCategoria() { _uiState.value = _uiState.value.copy(mostrandoNuevaCategoria = false, nombreNuevaCategoria = "") }
    fun onNombreNuevaCategoriaChange(v: String) { _uiState.value = _uiState.value.copy(nombreNuevaCategoria = v) }

    fun crearCategoria() {
        val nombre = _uiState.value.nombreNuevaCategoria.trim()
        if (nombre.isBlank()) return
        cajaRepository.crearCategoria(nombre).onSuccess { categoria ->
            _uiState.value = _uiState.value.copy(
                categorias = (_uiState.value.categorias + categoria).distinctBy { it.id },
                categoriaId = categoria.id,
                creandoCategoria = false,
                mostrandoNuevaCategoria = false,
                nombreNuevaCategoria = "",
            )
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
                    categoria = estado.categoriaId ?: "Otros",
                    descripcion = estado.descripcionMovimiento,
                ),
            )
                .onSuccess {
                    _uiState.value = _uiState.value.copy(guardandoMovimiento = false, mostrarForm = false)
                    cargar()
                    cargarTurno() // un ingreso/egreso en efectivo cambia el monto esperado del turno
                }
                .onFailure { e -> _uiState.value = _uiState.value.copy(guardandoMovimiento = false, errorMovimiento = e.message ?: "No se pudo registrar") }
        }
    }
}
