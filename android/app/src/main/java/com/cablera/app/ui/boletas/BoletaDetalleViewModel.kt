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
    // Anular el pago (solo gestor): pide el motivo; el pago queda en el historial como anulado.
    val mostrarAnular: Boolean = false,
    val motivoAnulacion: String = "",
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
                .onFailure { e -> _uiState.value = _uiState.value.copy(boleta = UiState.Error(e.message ?: "No se pudo cargar el comprobante")) }
        }
    }

    fun abrirAnular() { _uiState.value = _uiState.value.copy(mostrarAnular = true, motivoAnulacion = "", errorAnular = null) }
    fun cerrarAnular() { _uiState.value = _uiState.value.copy(mostrarAnular = false) }
    fun onMotivoAnulacionChange(v: String) { _uiState.value = _uiState.value.copy(motivoAnulacion = v, errorAnular = null) }

    fun confirmarAnular() {
        val motivo = _uiState.value.motivoAnulacion.trim()
        if (motivo.length < 3) {
            _uiState.value = _uiState.value.copy(errorAnular = "Indica el motivo de la anulación")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(anulando = true, errorAnular = null)
            boletasRepository.anular(boletaId, motivo)
                .onSuccess { data ->
                    _uiState.value = _uiState.value.copy(anulando = false, mostrarAnular = false, boleta = UiState.Success(data))
                }
                .onFailure { e -> _uiState.value = _uiState.value.copy(anulando = false, errorAnular = e.message ?: "No se pudo anular el pago") }
        }
    }
}
