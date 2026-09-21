package com.cablera.app.ui.boletas

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.BoletaDetalleDto
import com.cablera.app.data.remote.dto.Roles
import com.cablera.app.data.repository.AuthRepository
import com.cablera.app.data.repository.BoletasRepository
import com.cablera.app.ui.common.UiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class BoletaDetalleUiState(
    val boleta: UiState<BoletaDetalleDto> = UiState.Loading,
    val rolGestor: Boolean = false,
    val anulando: Boolean = false,
    val errorAnular: String? = null,
)

class BoletaDetalleViewModel(
    val boletaId: String,
    private val boletasRepository: BoletasRepository,
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(BoletaDetalleUiState())
    val uiState: StateFlow<BoletaDetalleUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            val sesion = authRepository.currentSession()
            _uiState.value = _uiState.value.copy(rolGestor = sesion?.usuario?.rol == Roles.GESTOR)
        }
        cargar()
    }

    fun cargar() {
        viewModelScope.launch {
            val guardada = boletasRepository.obtenerEnCache(boletaId)
            _uiState.value = _uiState.value.copy(boleta = if (guardada != null) UiState.Success(guardada) else UiState.Loading)
            boletasRepository.obtener(boletaId)
                .onSuccess { data -> _uiState.value = _uiState.value.copy(boleta = UiState.Success(data)) }
                .onFailure { e -> _uiState.value = _uiState.value.copy(boleta = UiState.Error(e.message ?: "No se pudo cargar la boleta")) }
        }
    }

    fun anular() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(anulando = true, errorAnular = null)
            boletasRepository.anular(boletaId)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(anulando = false, boleta = UiState.Success(it))
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(anulando = false, errorAnular = e.message ?: "No se pudo anular la boleta")
                }
        }
    }
}
