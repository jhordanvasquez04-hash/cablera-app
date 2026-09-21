package com.cablera.app.ui.clientes

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.ClienteDto
import com.cablera.app.data.remote.dto.ZonaDto
import com.cablera.app.data.repository.ClientesRepository
import com.cablera.app.data.repository.ZonasRepository
import com.cablera.app.ui.common.UiState
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ClientesListUiState(
    val clientes: UiState<List<ClienteDto>> = UiState.Loading,
    val zonas: List<ZonaDto> = emptyList(),
    val filtroZonaId: String? = null,
    val busqueda: String = "",
)

class ClientesListViewModel (
    private val clientesRepository: ClientesRepository,
    private val zonasRepository: ZonasRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ClientesListUiState())
    val uiState: StateFlow<ClientesListUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null

    init {
        viewModelScope.launch {
            zonasRepository.enCache()?.let { zonas -> _uiState.value = _uiState.value.copy(zonas = zonas) }
            zonasRepository.listar().onSuccess { zonas ->
                _uiState.value = _uiState.value.copy(zonas = zonas)
            }
        }
        cargarClientes()
    }

    fun cargarClientes() {
        viewModelScope.launch {
            val zonaId = _uiState.value.filtroZonaId
            val busqueda = _uiState.value.busqueda
            val guardado = clientesRepository.listarEnCache(zonaId, estado = null, busqueda = busqueda)
            _uiState.value = _uiState.value.copy(clientes = if (guardado != null) UiState.Success(guardado) else UiState.Loading)
            clientesRepository.listar(zonaId, estado = null, busqueda = busqueda)
                .onSuccess { data -> _uiState.value = _uiState.value.copy(clientes = UiState.Success(data)) }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(clientes = UiState.Error(e.message ?: "No se pudo cargar la lista de clientes"))
                }
        }
    }

    fun onFiltroZonaChange(zonaId: String?) {
        _uiState.value = _uiState.value.copy(filtroZonaId = zonaId)
        cargarClientes()
    }

    fun onBusquedaChange(valor: String) {
        _uiState.value = _uiState.value.copy(busqueda = valor)
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(300)
            cargarClientes()
        }
    }
}
