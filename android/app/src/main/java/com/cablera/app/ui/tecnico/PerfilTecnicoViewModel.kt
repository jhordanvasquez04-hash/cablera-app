package com.cablera.app.ui.tecnico

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.PerfilTecnicoDto
import com.cablera.app.data.repository.OrdenesTecnicoRepository
import com.cablera.app.ui.common.UiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class PerfilTecnicoViewModel(private val repo: OrdenesTecnicoRepository) : ViewModel() {

    private val _uiState = MutableStateFlow<UiState<PerfilTecnicoDto>>(UiState.Loading)
    val uiState: StateFlow<UiState<PerfilTecnicoDto>> = _uiState.asStateFlow()

    init { cargar() }

    fun cargar() {
        viewModelScope.launch {
            repo.perfil()
                .onSuccess { _uiState.value = UiState.Success(it) }
                .onFailure { e -> _uiState.value = UiState.Error(e.message ?: "No se pudo cargar tu perfil") }
        }
    }
}
