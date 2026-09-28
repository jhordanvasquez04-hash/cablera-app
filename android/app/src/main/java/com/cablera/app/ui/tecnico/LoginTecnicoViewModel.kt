package com.cablera.app.ui.tecnico

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.repository.TecnicoAuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class LoginTecnicoUiState(
    val email: String = "",
    val password: String = "",
    val cargando: Boolean = false,
    val error: String? = null,
)

/** Mismo shape/flujo que LoginViewModel — a propósito no comparten código: son formularios
 * triviales, y forzar una base común solo complicaría el día que uno de los dos cambie solo. */
class LoginTecnicoViewModel(
    private val tecnicoAuthRepository: TecnicoAuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(LoginTecnicoUiState())
    val uiState: StateFlow<LoginTecnicoUiState> = _uiState.asStateFlow()

    fun onEmailChange(value: String) {
        _uiState.value = _uiState.value.copy(email = value, error = null)
    }

    fun onPasswordChange(value: String) {
        _uiState.value = _uiState.value.copy(password = value, error = null)
    }

    fun login(onSuccess: () -> Unit) {
        val estado = _uiState.value
        if (estado.email.isBlank() || estado.password.isBlank()) {
            _uiState.value = estado.copy(error = "Ingresa tu correo y contraseña")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(cargando = true, error = null)
            tecnicoAuthRepository.login(estado.email.trim(), estado.password)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(cargando = false)
                    onSuccess()
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(cargando = false, error = e.message ?: "No se pudo iniciar sesión")
                }
        }
    }
}
