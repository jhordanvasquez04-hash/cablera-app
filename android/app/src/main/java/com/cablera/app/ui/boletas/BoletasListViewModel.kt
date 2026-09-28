package com.cablera.app.ui.boletas

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.BoletaResumenDto
import com.cablera.app.data.repository.BoletasRepository
import com.cablera.app.ui.common.UiState
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class BoletasListUiState(
    /** Pagos cargados hasta ahora: de a 10 (los más recientes primero), y "Ver más" agrega los siguientes. */
    val boletas: UiState<List<BoletaResumenDto>> = UiState.Loading,
    val hayMas: Boolean = false,
    val cargandoMas: Boolean = false,
    val busqueda: String = "",
)

class BoletasListViewModel(
    private val boletasRepository: BoletasRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(BoletasListUiState())
    val uiState: StateFlow<BoletasListUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null

    init {
        cargar()
    }

    fun cargar() {
        viewModelScope.launch {
            val busqueda = _uiState.value.busqueda
            val guardada = boletasRepository.listarEnCache(busqueda, 0)
            _uiState.value = _uiState.value.copy(
                boletas = if (guardada != null) UiState.Success(guardada.items) else UiState.Loading,
                hayMas = guardada?.hayMas ?: false,
            )
            boletasRepository.listar(busqueda, 0)
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
            boletasRepository.listar(estado.busqueda, actuales.size)
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
}
