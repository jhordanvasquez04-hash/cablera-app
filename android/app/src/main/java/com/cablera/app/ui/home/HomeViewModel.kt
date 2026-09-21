package com.cablera.app.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.ResumenCobranzaDto
import com.cablera.app.data.remote.dto.ZonaDto
import com.cablera.app.data.repository.AuthRepository
import com.cablera.app.data.repository.CobranzaRepository
import com.cablera.app.data.repository.ZonasRepository
import com.cablera.app.data.remote.dto.Roles
import com.cablera.app.ui.common.UiState
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class HomeUiState(
    val resumen: UiState<ResumenCobranzaDto> = UiState.Loading,
    val zonas: List<ZonaDto> = emptyList(),
    val filtroZonaId: String? = null,
    val busqueda: String = "",
    val rolGestor: Boolean = false,
)

class HomeViewModel (
    private val cobranzaRepository: CobranzaRepository,
    private val zonasRepository: ZonasRepository,
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null

    init {
        viewModelScope.launch {
            val sesion = authRepository.currentSession()
            _uiState.value = _uiState.value.copy(rolGestor = sesion?.usuario?.rol == Roles.GESTOR)
        }
        viewModelScope.launch {
            zonasRepository.enCache()?.let { zonas -> _uiState.value = _uiState.value.copy(zonas = zonas) }
            zonasRepository.listar().onSuccess { zonas ->
                _uiState.value = _uiState.value.copy(zonas = zonas)
            }
        }
        cargarResumen()
    }

    fun cargarResumen() {
        viewModelScope.launch {
            val zonaId = _uiState.value.filtroZonaId
            val busqueda = _uiState.value.busqueda
            // Lo último conocido se pinta al instante; recién si no hay nada se muestra el spinner.
            val guardado = cobranzaRepository.resumenEnCache(zonaId, busqueda)
            _uiState.value = _uiState.value.copy(resumen = if (guardado != null) UiState.Success(guardado) else UiState.Loading)
            cobranzaRepository.resumen(zonaId, busqueda)
                .onSuccess { data -> _uiState.value = _uiState.value.copy(resumen = UiState.Success(data)) }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(resumen = UiState.Error(e.message ?: "No se pudo cargar la cobranza"))
                }
        }
    }

    fun onFiltroZonaChange(zonaId: String?) {
        _uiState.value = _uiState.value.copy(filtroZonaId = zonaId)
        cargarResumen()
    }

    fun onBusquedaChange(valor: String) {
        _uiState.value = _uiState.value.copy(busqueda = valor)
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(300)
            cargarResumen()
        }
    }
}
