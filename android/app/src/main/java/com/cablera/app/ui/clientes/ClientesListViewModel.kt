package com.cablera.app.ui.clientes

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.ClienteDto
import com.cablera.app.data.remote.dto.Roles
import com.cablera.app.data.repository.AuthRepository
import com.cablera.app.data.repository.ClientesRepository
import com.cablera.app.data.repository.ContratosRepository
import com.cablera.app.ui.common.UiState
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ClientesListUiState(
    /** Clientes cargados hasta ahora: de a 10, y "Ver más" agrega los siguientes. */
    val clientes: UiState<List<ClienteDto>> = UiState.Loading,
    val hayMas: Boolean = false,
    val cargandoMas: Boolean = false,
    val busqueda: String = "",
    val filtroSector: String? = null,
    /** Zonas que usa la empresa; vacío = no usa zonas y el filtro no se muestra. */
    val sectores: List<String> = emptyList(),
    val rolGestor: Boolean = false,
)

class ClientesListViewModel(
    private val clientesRepository: ClientesRepository,
    private val contratosRepository: ContratosRepository,
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ClientesListUiState())
    val uiState: StateFlow<ClientesListUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null

    init {
        viewModelScope.launch {
            val sesion = authRepository.currentSession()
            _uiState.value = _uiState.value.copy(rolGestor = sesion?.usuario?.rol == Roles.GESTOR)
        }
        cargarClientes()
    }

    /** Vuelve a la primera página (al entrar, al buscar, al cambiar de zona y al volver de una ficha). */
    fun cargarClientes() {
        viewModelScope.launch {
            contratosRepository.sectores().onSuccess { sectores -> _uiState.value = _uiState.value.copy(sectores = sectores) }
        }
        viewModelScope.launch {
            val estado = _uiState.value
            val guardada = clientesRepository.listarEnCache(estado.busqueda, estado.filtroSector, 0)
            _uiState.value = _uiState.value.copy(
                clientes = if (guardada != null) UiState.Success(guardada.items) else UiState.Loading,
                hayMas = guardada?.hayMas ?: false,
            )
            clientesRepository.listar(estado.busqueda, estado.filtroSector, 0)
                .onSuccess { pagina -> _uiState.value = _uiState.value.copy(clientes = UiState.Success(pagina.items), hayMas = pagina.hayMas) }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(clientes = UiState.Error(e.message ?: "No se pudo cargar la lista de clientes"))
                }
        }
    }

    fun verMas() {
        val estado = _uiState.value
        val actuales = (estado.clientes as? UiState.Success)?.data ?: return
        if (estado.cargandoMas || !estado.hayMas) return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(cargandoMas = true)
            clientesRepository.listar(estado.busqueda, estado.filtroSector, actuales.size)
                .onSuccess { pagina ->
                    _uiState.value = _uiState.value.copy(
                        clientes = UiState.Success((actuales + pagina.items).distinctBy { it.id }),
                        hayMas = pagina.hayMas,
                        cargandoMas = false,
                    )
                }
                .onFailure { _uiState.value = _uiState.value.copy(cargandoMas = false) }
        }
    }

    fun onFiltroSectorChange(sector: String?) {
        _uiState.value = _uiState.value.copy(filtroSector = sector)
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
