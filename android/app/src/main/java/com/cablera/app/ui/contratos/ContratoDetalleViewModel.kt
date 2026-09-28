package com.cablera.app.ui.contratos

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.ContratoDto
import com.cablera.app.data.repository.ContratosRepository
import com.cablera.app.ui.common.UiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class ContratoDetalleViewModel(
    private val contratoId: String,
    private val repo: ContratosRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow<UiState<ContratoDto>>(UiState.Loading)
    val uiState: StateFlow<UiState<ContratoDto>> = _uiState.asStateFlow()

    init { cargar() }

    fun cargar() {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            repo.obtener(contratoId)
                .onSuccess { data -> _uiState.value = UiState.Success(data) }
                .onFailure { e -> _uiState.value = UiState.Error(e.message ?: "No se pudo cargar el contrato") }
        }
    }
}
