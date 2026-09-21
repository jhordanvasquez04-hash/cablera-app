package com.cablera.app.ui.servicios

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.ServicioTecnicoDto
import com.cablera.app.data.repository.ServiciosTecnicosRepository
import com.cablera.app.ui.common.UiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

enum class AccionServicio { COMENTAR, LIQUIDAR }

data class ServiciosListUiState(
    val servicios: UiState<List<ServicioTecnicoDto>> = UiState.Loading,
    val filtroEstado: String? = null,
    val dialogoId: String? = null,
    val dialogoAccion: AccionServicio? = null,
    val textoDialogo: String = "",
    val enviandoDialogo: Boolean = false,
    val errorDialogo: String? = null,
)

class ServiciosListViewModel(private val repo: ServiciosTecnicosRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(ServiciosListUiState())
    val uiState: StateFlow<ServiciosListUiState> = _uiState.asStateFlow()

    init { cargar() }

    fun cargar() {
        viewModelScope.launch {
            val estado = _uiState.value.filtroEstado
            val guardado = repo.listarEnCache(estado, null, null)
            _uiState.value = _uiState.value.copy(servicios = if (guardado != null) UiState.Success(guardado) else UiState.Loading)
            repo.listar(estado, null, null)
                .onSuccess { data -> _uiState.value = _uiState.value.copy(servicios = UiState.Success(data)) }
                .onFailure { e -> _uiState.value = _uiState.value.copy(servicios = UiState.Error(e.message ?: "No se pudo cargar servicios técnicos")) }
        }
    }

    fun onFiltroEstadoChange(valor: String?) {
        _uiState.value = _uiState.value.copy(filtroEstado = valor)
        cargar()
    }

    fun abrirComentar(id: String) {
        _uiState.value = _uiState.value.copy(dialogoId = id, dialogoAccion = AccionServicio.COMENTAR, textoDialogo = "", errorDialogo = null)
    }

    fun abrirLiquidar(id: String) {
        _uiState.value = _uiState.value.copy(dialogoId = id, dialogoAccion = AccionServicio.LIQUIDAR, textoDialogo = "", errorDialogo = null)
    }

    fun cerrarDialogo() {
        _uiState.value = _uiState.value.copy(dialogoId = null, dialogoAccion = null)
    }

    fun onTextoDialogoChange(valor: String) {
        _uiState.value = _uiState.value.copy(textoDialogo = valor)
    }

    fun confirmar() {
        val estado = _uiState.value
        val id = estado.dialogoId ?: return
        val accion = estado.dialogoAccion ?: return
        if (accion == AccionServicio.COMENTAR && estado.textoDialogo.isBlank()) return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(enviandoDialogo = true, errorDialogo = null)
            val resultado = when (accion) {
                AccionServicio.COMENTAR -> repo.comentar(id, estado.textoDialogo)
                AccionServicio.LIQUIDAR -> repo.liquidar(id, estado.textoDialogo.ifBlank { null })
            }
            resultado
                .onSuccess {
                    _uiState.value = _uiState.value.copy(enviandoDialogo = false, dialogoId = null, dialogoAccion = null)
                    cargar()
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(enviandoDialogo = false, errorDialogo = e.message ?: "No se pudo guardar")
                }
        }
    }
}
