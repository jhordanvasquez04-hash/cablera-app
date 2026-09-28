package com.cablera.app.ui.ordenes

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.OrdenServicioDto
import com.cablera.app.data.repository.OrdenesServicioRepository
import com.cablera.app.ui.common.UiState
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class OrdenesServicioListUiState(
    /** Servicios técnicos cargados hasta ahora: de a 10, y "Ver más" agrega los siguientes. */
    val ordenes: UiState<List<OrdenServicioDto>> = UiState.Loading,
    val hayMas: Boolean = false,
    val cargandoMas: Boolean = false,
    val filtroEstado: String? = null,
    val busqueda: String = "",
)

class OrdenesServicioListViewModel(private val repo: OrdenesServicioRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(OrdenesServicioListUiState())
    val uiState: StateFlow<OrdenesServicioListUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null

    init { cargar() }

    fun cargar() {
        viewModelScope.launch {
            val estado = _uiState.value
            val guardada = repo.listarEnCache(estado.filtroEstado, estado.busqueda, 0)
            _uiState.value = _uiState.value.copy(
                ordenes = if (guardada != null) UiState.Success(guardada.items) else UiState.Loading,
                hayMas = guardada?.hayMas ?: false,
            )
            repo.listar(estado.filtroEstado, estado.busqueda, 0)
                .onSuccess { pagina -> _uiState.value = _uiState.value.copy(ordenes = UiState.Success(pagina.items), hayMas = pagina.hayMas) }
                .onFailure { e -> _uiState.value = _uiState.value.copy(ordenes = UiState.Error(e.message ?: "No se pudieron cargar los servicios técnicos")) }
        }
    }

    fun verMas() {
        val estado = _uiState.value
        val actuales = (estado.ordenes as? UiState.Success)?.data ?: return
        if (estado.cargandoMas || !estado.hayMas) return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(cargandoMas = true)
            repo.listar(estado.filtroEstado, estado.busqueda, actuales.size)
                .onSuccess { pagina ->
                    _uiState.value = _uiState.value.copy(
                        ordenes = UiState.Success((actuales + pagina.items).distinctBy { it.id }),
                        hayMas = pagina.hayMas,
                        cargandoMas = false,
                    )
                }
                .onFailure { _uiState.value = _uiState.value.copy(cargandoMas = false) }
        }
    }

    fun onFiltroEstadoChange(estado: String?) {
        _uiState.value = _uiState.value.copy(filtroEstado = estado)
        cargar()
    }

    fun onBusquedaChange(valor: String) {
        _uiState.value = _uiState.value.copy(busqueda = valor)
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(300)
            cargar()
        }
    }
}
