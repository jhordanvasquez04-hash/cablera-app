package com.cablera.app.ui.tecnico

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.OrdenServicioDto
import com.cablera.app.data.repository.OrdenesTecnicoRepository
import com.cablera.app.ui.common.UiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class OrdenesTecnicoListUiState(
    val ordenes: UiState<List<OrdenServicioDto>> = UiState.Loading,
    val filtroEstado: String? = null,
)

class OrdenesTecnicoListViewModel(private val repo: OrdenesTecnicoRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(OrdenesTecnicoListUiState())
    val uiState: StateFlow<OrdenesTecnicoListUiState> = _uiState.asStateFlow()

    init { cargar() }

    fun cargar() {
        viewModelScope.launch {
            val estado = _uiState.value.filtroEstado
            val guardado = repo.listarEnCache(estado)
            _uiState.value = _uiState.value.copy(ordenes = if (guardado != null) UiState.Success(guardado) else UiState.Loading)
            repo.listar(estado)
                .onSuccess { data -> _uiState.value = _uiState.value.copy(ordenes = UiState.Success(data)) }
                .onFailure { e -> _uiState.value = _uiState.value.copy(ordenes = UiState.Error(e.message ?: "No se pudieron cargar tus órdenes")) }
        }
    }

    fun onFiltroEstadoChange(valor: String?) {
        _uiState.value = _uiState.value.copy(filtroEstado = valor)
        cargar()
    }
}
