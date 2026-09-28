package com.cablera.app.ui.configuracion

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.ConfiguracionDto
import com.cablera.app.data.remote.dto.UpdateConfiguracionRequest
import com.cablera.app.data.repository.ConfiguracionRepository
import com.cablera.app.ui.common.UiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

// Ajustes en el celular = los datos de la empresa (Keysls: /empresa). Métodos de pago, planes,
// técnicos y demás catálogos se administran solo desde la web.
data class ConfiguracionUiState(
    val config: UiState<ConfiguracionDto> = UiState.Loading,
    val nombre: String = "",
    val ruc: String = "",
    val telefono: String = "",
    val direccion: String = "",
    val agencia: String = "",
    val guardando: Boolean = false,
    val error: String? = null,
    val guardadoOk: Boolean = false,
)

class ConfiguracionViewModel(
    private val configuracionRepository: ConfiguracionRepository,
    private val configuracionState: MutableStateFlow<ConfiguracionDto?>,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ConfiguracionUiState())
    val uiState: StateFlow<ConfiguracionUiState> = _uiState.asStateFlow()

    init {
        cargar()
    }

    fun cargar() {
        viewModelScope.launch {
            configuracionRepository.enCache()?.let { aplicar(it) }
            configuracionRepository.obtener()
                .onSuccess { aplicar(it) }
                .onFailure { e ->
                    if (_uiState.value.config !is UiState.Success) {
                        _uiState.value = _uiState.value.copy(config = UiState.Error(e.message ?: "No se pudo cargar la empresa"))
                    }
                }
        }
    }

    private fun aplicar(config: ConfiguracionDto) {
        configuracionState.value = config
        _uiState.value = _uiState.value.copy(
            config = UiState.Success(config),
            nombre = config.nombreEmpresa,
            ruc = config.ruc.orEmpty(),
            telefono = config.telefonoContacto.orEmpty(),
            direccion = config.direccionContacto.orEmpty(),
            agencia = config.agencia.orEmpty(),
        )
    }

    fun onNombreChange(v: String) { _uiState.value = _uiState.value.copy(nombre = v, error = null, guardadoOk = false) }
    fun onRucChange(v: String) { _uiState.value = _uiState.value.copy(ruc = v, guardadoOk = false) }
    fun onTelefonoChange(v: String) { _uiState.value = _uiState.value.copy(telefono = v, guardadoOk = false) }
    fun onDireccionChange(v: String) { _uiState.value = _uiState.value.copy(direccion = v, guardadoOk = false) }
    fun onAgenciaChange(v: String) { _uiState.value = _uiState.value.copy(agencia = v, guardadoOk = false) }

    fun guardar() {
        val estado = _uiState.value
        if (estado.nombre.isBlank()) {
            _uiState.value = estado.copy(error = "El nombre de la empresa es obligatorio")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(guardando = true, error = null, guardadoOk = false)
            configuracionRepository.actualizar(
                UpdateConfiguracionRequest(
                    nombreEmpresa = estado.nombre.trim(),
                    ruc = estado.ruc.trim().ifBlank { null },
                    telefonoContacto = estado.telefono.trim().ifBlank { null },
                    direccionContacto = estado.direccion.trim().ifBlank { null },
                    agencia = estado.agencia.trim().ifBlank { null },
                ),
            )
                .onSuccess { config ->
                    aplicar(config)
                    _uiState.value = _uiState.value.copy(guardando = false, guardadoOk = true)
                }
                .onFailure { e -> _uiState.value = _uiState.value.copy(guardando = false, error = e.message ?: "No se pudo guardar") }
        }
    }
}
