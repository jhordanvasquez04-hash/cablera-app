package com.cablera.app.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.ContratoConDeudaDto
import com.cablera.app.data.remote.dto.ResumenCobranzaDto
import com.cablera.app.data.remote.dto.Roles
import com.cablera.app.data.repository.AuthRepository
import com.cablera.app.data.repository.CobranzaRepository
import com.cablera.app.ui.common.UiState
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class HomeUiState(
    /** Indicadores (cobrado del mes, deudas, contratos activos). */
    val resumen: UiState<ResumenCobranzaDto> = UiState.Loading,
    /** Contratos con deuda: de a 10, con buscador y filtro por zona; "Ver más" trae los siguientes. */
    val contratos: UiState<List<ContratoConDeudaDto>> = UiState.Loading,
    val hayMas: Boolean = false,
    val cargandoMas: Boolean = false,
    val busqueda: String = "",
    val filtroSector: String? = null,
    val rolGestor: Boolean = false,
)

class HomeViewModel(
    private val cobranzaRepository: CobranzaRepository,
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
        cargar()
    }

    /** Recarga todo desde la primera página (al entrar y al volver de registrar un pago). */
    fun cargar() {
        cargarResumen()
        cargarLista()
    }

    private fun cargarResumen() {
        viewModelScope.launch {
            // Lo último conocido se pinta al instante; recién si no hay nada se muestra el spinner.
            val guardado = cobranzaRepository.resumenEnCache()
            _uiState.value = _uiState.value.copy(resumen = if (guardado != null) UiState.Success(guardado) else UiState.Loading)
            cobranzaRepository.resumen()
                .onSuccess { data -> _uiState.value = _uiState.value.copy(resumen = UiState.Success(data)) }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(resumen = UiState.Error(e.message ?: "No se pudo cargar la cobranza"))
                }
        }
    }

    private fun cargarLista() {
        viewModelScope.launch {
            val estado = _uiState.value
            val guardada = cobranzaRepository.contratosConDeudaEnCache(estado.busqueda, estado.filtroSector, 0)
            _uiState.value = _uiState.value.copy(
                contratos = if (guardada != null) UiState.Success(guardada.items) else UiState.Loading,
                hayMas = guardada?.hayMas ?: false,
            )
            cobranzaRepository.contratosConDeuda(estado.busqueda, estado.filtroSector, 0)
                .onSuccess { pagina -> _uiState.value = _uiState.value.copy(contratos = UiState.Success(pagina.items), hayMas = pagina.hayMas) }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(contratos = UiState.Error(e.message ?: "No se pudo cargar la lista"))
                }
        }
    }

    fun verMas() {
        val estado = _uiState.value
        val actuales = (estado.contratos as? UiState.Success)?.data ?: return
        if (estado.cargandoMas || !estado.hayMas) return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(cargandoMas = true)
            cobranzaRepository.contratosConDeuda(estado.busqueda, estado.filtroSector, actuales.size)
                .onSuccess { pagina ->
                    _uiState.value = _uiState.value.copy(
                        contratos = UiState.Success((actuales + pagina.items).distinctBy { it.contratoId }),
                        hayMas = pagina.hayMas,
                        cargandoMas = false,
                    )
                }
                .onFailure { _uiState.value = _uiState.value.copy(cargandoMas = false) }
        }
    }

    fun onFiltroSectorChange(sector: String?) {
        _uiState.value = _uiState.value.copy(filtroSector = sector)
        cargarLista()
    }

    fun onBusquedaChange(valor: String) {
        _uiState.value = _uiState.value.copy(busqueda = valor)
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(300)
            cargarLista()
        }
    }
}
