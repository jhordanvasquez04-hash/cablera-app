package com.cablera.app.ui.clientes

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.ClienteDto
import com.cablera.app.data.remote.dto.CreateClienteRequest
import com.cablera.app.data.repository.ClientesRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

// Un cliente es ÚNICAMENTE sus datos — identificación, contacto, ubicación. El servicio real (tipo,
// plan, costo, dirección de instalación) se crea aparte, en "Nuevo contrato" (ver ContratoNuevoScreen).
data class ClienteNuevoUiState(
    val dni: String = "",
    val nombreCompleto: String = "",
    val telefono: String = "",
    val email: String = "",
    val direccion: String = "",
    val latitud: String = "",
    val longitud: String = "",
    val guardando: Boolean = false,
    val error: String? = null,
    /** Si ya existe un cliente con ese DNI/RUC: no se crea otro; se ofrece crearle un contrato. */
    val duplicado: ClienteDto? = null,
)

class ClienteNuevoViewModel(
    private val clientesRepository: ClientesRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ClienteNuevoUiState())
    val uiState: StateFlow<ClienteNuevoUiState> = _uiState.asStateFlow()

    private var verificacionDni: Job? = null

    /** Al escribir el DNI/RUC completo se comprueba de inmediato si ya está registrado (sin esperar a "Registrar"). */
    fun onDniChange(v: String) {
        val dni = v.filter(Char::isDigit).take(11)
        _uiState.value = _uiState.value.copy(dni = dni, error = null, duplicado = null)
        verificacionDni?.cancel()
        if (dni.length == 8 || dni.length == 11) {
            verificacionDni = viewModelScope.launch {
                val existente = buscarPorDni(dni)
                // Si mientras tanto cambió el DNI, este resultado ya no aplica.
                if (existente != null && _uiState.value.dni == dni) _uiState.value = _uiState.value.copy(duplicado = existente)
            }
        }
    }
    fun onNombreChange(v: String) { _uiState.value = _uiState.value.copy(nombreCompleto = v, error = null) }
    fun onTelefonoChange(v: String) { _uiState.value = _uiState.value.copy(telefono = v) }
    fun onEmailChange(v: String) { _uiState.value = _uiState.value.copy(email = v) }
    fun onDireccionChange(v: String) { _uiState.value = _uiState.value.copy(direccion = v) }
    fun onLatitudChange(v: String) { _uiState.value = _uiState.value.copy(latitud = v) }
    fun onLongitudChange(v: String) { _uiState.value = _uiState.value.copy(longitud = v) }

    fun cerrarDuplicado() { _uiState.value = _uiState.value.copy(duplicado = null) }

    /** El cliente de esa empresa con exactamente ese DNI/RUC, si existe. */
    private suspend fun buscarPorDni(dni: String): ClienteDto? =
        clientesRepository.listar(busqueda = dni, sector = null, offset = 0).getOrNull()?.items?.firstOrNull { it.dni == dni }

    fun guardar(onSuccess: (String) -> Unit) {
        val estado = _uiState.value
        if (estado.nombreCompleto.isBlank()) {
            _uiState.value = estado.copy(error = "Completa el nombre")
            return
        }
        if (estado.dni.length != 8 && estado.dni.length != 11) {
            _uiState.value = estado.copy(error = "El DNI debe tener 8 dígitos o el RUC 11")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(guardando = true, error = null)
            // Antes de crear: ¿ya existe alguien con ese DNI/RUC? Si sí, no se duplica.
            buscarPorDni(estado.dni)?.let { existente ->
                _uiState.value = _uiState.value.copy(guardando = false, duplicado = existente)
                return@launch
            }
            clientesRepository.crear(
                CreateClienteRequest(
                    dni = estado.dni,
                    nombreCompleto = estado.nombreCompleto.trim(),
                    telefono = estado.telefono.ifBlank { null },
                    email = estado.email.ifBlank { null },
                    direccion = estado.direccion.ifBlank { null },
                    latitud = estado.latitud.toDoubleOrNull(),
                    longitud = estado.longitud.toDoubleOrNull(),
                ),
            )
                .onSuccess { cliente ->
                    _uiState.value = _uiState.value.copy(guardando = false)
                    onSuccess(cliente.id)
                }
                .onFailure { e ->
                    // Red de seguridad: si el servidor rechaza por DNI repetido (otro dispositivo lo creó justo antes).
                    val existente = if (e.message?.contains("Ya existe", ignoreCase = true) == true) buscarPorDni(estado.dni) else null
                    _uiState.value = _uiState.value.copy(
                        guardando = false,
                        duplicado = existente,
                        error = if (existente == null) e.message ?: "No se pudo crear el cliente" else null,
                    )
                }
        }
    }
}
