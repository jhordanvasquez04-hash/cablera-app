package com.cablera.app.ui.contratos

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.ContratoDto
import com.cablera.app.data.repository.ContratosRepository
import com.cablera.app.ui.common.UiState
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ContratosListUiState(
    /** Contratos cargados hasta ahora: de a 10, y "Ver más" agrega los siguientes. */
    val contratos: UiState<List<ContratoDto>> = UiState.Loading,
    val hayMas: Boolean = false,
    val cargandoMas: Boolean = false,
    val busqueda: String = "",
    val filtroSector: String? = null,
    /** Zonas que usa la empresa; vacío = no usa zonas y el filtro no se muestra. */
    val sectores: List<String> = emptyList(),
)

class ContratosListViewModel(private val repo: ContratosRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(ContratosListUiState())
    val uiState: StateFlow<ContratosListUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null

    init { cargar() }

    fun cargar() {
        viewModelScope.launch {
            repo.sectores().onSuccess { sectores -> _uiState.value = _uiState.value.copy(sectores = sectores) }
        }
        viewModelScope.launch {
            val estado = _uiState.value
            val guardada = repo.listarEnCache(estado.busqueda, estado.filtroSector, 0)
            _uiState.value = _uiState.value.copy(
                contratos = if (guardada != null) UiState.Success(guardada.items) else UiState.Loading,
                hayMas = guardada?.hayMas ?: false,
            )
            repo.listar(estado.busqueda, estado.filtroSector, 0)
                .onSuccess { pagina -> _uiState.value = _uiState.value.copy(contratos = UiState.Success(pagina.items), hayMas = pagina.hayMas) }
                .onFailure { e -> _uiState.value = _uiState.value.copy(contratos = UiState.Error(e.message ?: "No se pudieron cargar los contratos")) }
        }
    }

    fun verMas() {
        val estado = _uiState.value
        val actuales = (estado.contratos as? UiState.Success)?.data ?: return
        if (estado.cargandoMas || !estado.hayMas) return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(cargandoMas = true)
            repo.listar(estado.busqueda, estado.filtroSector, actuales.size)
                .onSuccess { pagina ->
                    _uiState.value = _uiState.value.copy(
                        contratos = UiState.Success((actuales + pagina.items).distinctBy { it.id }),
                        hayMas = pagina.hayMas,
                        cargandoMas = false,
                    )
                }
                .onFailure { _uiState.value = _uiState.value.copy(cargandoMas = false) }
        }
    }

    fun onFiltroSectorChange(sector: String?) {
        _uiState.value = _uiState.value.copy(filtroSector = sector)
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
