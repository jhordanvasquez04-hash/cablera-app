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
    val boletas: UiState<List<BoletaResumenDto>> = UiState.Loading,
    val busqueda: String = "",
)

class BoletasListViewModel (
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
            val guardado = boletasRepository.listarEnCache(busqueda)
            _uiState.value = _uiState.value.copy(boletas = if (guardado != null) UiState.Success(guardado) else UiState.Loading)
            boletasRepository.listar(busqueda)
                .onSuccess { data -> _uiState.value = _uiState.value.copy(boletas = UiState.Success(data)) }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(boletas = UiState.Error(e.message ?: "No se pudo cargar las boletas"))
                }
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
