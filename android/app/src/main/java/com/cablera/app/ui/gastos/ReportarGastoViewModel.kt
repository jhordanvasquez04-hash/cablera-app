package com.cablera.app.ui.gastos

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.repository.GastosRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ReportarGastoUiState(
    val monto: String = "",
    val descripcion: String = "",
    val enviando: Boolean = false,
    val error: String? = null,
)

class ReportarGastoViewModel (
    private val gastosRepository: GastosRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ReportarGastoUiState())
    val uiState: StateFlow<ReportarGastoUiState> = _uiState.asStateFlow()

    fun onMontoChange(valor: String) {
        _uiState.value = _uiState.value.copy(monto = valor, error = null)
    }

    fun onDescripcionChange(valor: String) {
        _uiState.value = _uiState.value.copy(descripcion = valor, error = null)
    }

    fun enviar(onSuccess: () -> Unit) {
        val estado = _uiState.value
        val monto = estado.monto.toDoubleOrNull()
        if (monto == null || monto <= 0.0 || estado.descripcion.isBlank()) {
            _uiState.value = estado.copy(error = "Ingresa un monto y una descripción válidos")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(enviando = true, error = null)
            gastosRepository.reportar(monto, estado.descripcion)
                .onSuccess {
                    _uiState.value = ReportarGastoUiState()
                    onSuccess()
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(enviando = false, error = e.message ?: "No se pudo enviar el reporte")
                }
        }
    }
}
