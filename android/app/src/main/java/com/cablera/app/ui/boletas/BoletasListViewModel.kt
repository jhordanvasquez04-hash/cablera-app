package com.cablera.app.ui.boletas

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.BoletaResumenDto
import com.cablera.app.data.repository.BoletasRepository
import com.cablera.app.ui.common.UiState
import com.cablera.app.util.ZONA_PERU
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.temporal.TemporalAdjusters

/** Atajos del filtro de fechas; PERSONALIZADO es el rango elegido en el calendario. */
enum class PeriodoBoletas { TODAS, HOY, SEMANA, MES, PERSONALIZADO }

data class BoletasListUiState(
    /** Pagos cargados hasta ahora: de a 10 (los más recientes primero), y "Ver más" agrega los siguientes. */
    val boletas: UiState<List<BoletaResumenDto>> = UiState.Loading,
    val hayMas: Boolean = false,
    val cargandoMas: Boolean = false,
    val busqueda: String = "",
    val periodo: PeriodoBoletas = PeriodoBoletas.TODAS,
    /** Rango vigente (inclusive); ambos null = sin filtro de fecha. */
    val desde: LocalDate? = null,
    val hasta: LocalDate? = null,
)

class BoletasListViewModel(
    private val boletasRepository: BoletasRepository,
    private val hoy: () -> LocalDate = { LocalDate.now(ZONA_PERU) },
) : ViewModel() {

    private val _uiState = MutableStateFlow(BoletasListUiState())
    val uiState: StateFlow<BoletasListUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null

    init {
        cargar()
    }

    fun cargar() {
        viewModelScope.launch {
            val estado = _uiState.value
            val guardada = boletasRepository.listarEnCache(estado.busqueda, 0, estado.desde, estado.hasta)
            _uiState.value = _uiState.value.copy(
                boletas = if (guardada != null) UiState.Success(guardada.items) else UiState.Loading,
                hayMas = guardada?.hayMas ?: false,
            )
            boletasRepository.listar(estado.busqueda, 0, estado.desde, estado.hasta)
                .onSuccess { pagina -> _uiState.value = _uiState.value.copy(boletas = UiState.Success(pagina.items), hayMas = pagina.hayMas) }
                .onFailure { e -> _uiState.value = _uiState.value.copy(boletas = UiState.Error(e.message ?: "No se pudo cargar los pagos")) }
        }
    }

    fun verMas() {
        val estado = _uiState.value
        val actuales = (estado.boletas as? UiState.Success)?.data ?: return
        if (estado.cargandoMas || !estado.hayMas) return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(cargandoMas = true)
            boletasRepository.listar(estado.busqueda, actuales.size, estado.desde, estado.hasta)
                .onSuccess { pagina ->
                    _uiState.value = _uiState.value.copy(
                        boletas = UiState.Success((actuales + pagina.items).distinctBy { it.id }),
                        hayMas = pagina.hayMas,
                        cargandoMas = false,
                    )
                }
                .onFailure { _uiState.value = _uiState.value.copy(cargandoMas = false) }
        }
    }

    fun onBusquedaChange(valor: String) {
        _uiState.value = _uiState.value.copy(busqueda = valor)
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(300)
            cargar()
        }
    }

    /** Atajo del filtro (Todas, Hoy, Esta semana, Este mes). La semana empieza el lunes. */
    fun onPeriodoChange(periodo: PeriodoBoletas) {
        val dia = hoy()
        val (desde, hasta) = when (periodo) {
            PeriodoBoletas.TODAS, PeriodoBoletas.PERSONALIZADO -> null to null
            PeriodoBoletas.HOY -> dia to dia
            PeriodoBoletas.SEMANA -> dia.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)) to dia
            PeriodoBoletas.MES -> dia.withDayOfMonth(1) to dia
        }
        aplicarFiltro(if (periodo == PeriodoBoletas.PERSONALIZADO) PeriodoBoletas.TODAS else periodo, desde, hasta)
    }

    /** Rango elegido en el calendario (inclusive en ambos extremos). */
    fun onRangoPersonalizado(desde: LocalDate, hasta: LocalDate) {
        aplicarFiltro(PeriodoBoletas.PERSONALIZADO, minOf(desde, hasta), maxOf(desde, hasta))
    }

    private fun aplicarFiltro(periodo: PeriodoBoletas, desde: LocalDate?, hasta: LocalDate?) {
        val estado = _uiState.value
        if (estado.periodo == periodo && estado.desde == desde && estado.hasta == hasta) return
        _uiState.value = estado.copy(periodo = periodo, desde = desde, hasta = hasta, hayMas = false)
        searchJob?.cancel()
        cargar()
    }
}
