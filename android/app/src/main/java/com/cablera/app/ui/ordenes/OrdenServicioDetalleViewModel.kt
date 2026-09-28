package com.cablera.app.ui.ordenes

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.ClienteDto
import com.cablera.app.data.remote.dto.CompletarOrdenPanelRequest
import com.cablera.app.data.remote.dto.OrdenServicioDto
import com.cablera.app.data.remote.dto.PuntoRedResumenDto
import com.cablera.app.data.remote.dto.TecnicoResumenDto
import com.cablera.app.data.repository.ClientesRepository
import com.cablera.app.data.repository.ContratosRepository
import com.cablera.app.data.repository.OrdenesServicioRepository
import com.cablera.app.ui.common.UiState
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class OrdenServicioDetalleUiState(
    val orden: UiState<OrdenServicioDto> = UiState.Loading,
    val tecnicos: List<TecnicoResumenDto> = emptyList(),
    val procesando: Boolean = false,
    val error: String? = null,
    val mostrarSelectorTecnico: Boolean = false,
    // Completar la orden (como en la web: se puede aunque no haya técnico asignado)
    val mostrarCompletar: Boolean = false,
    val puntosRed: List<PuntoRedResumenDto> = emptyList(),
    val puntoRedId: String? = null,
    val equipoSerie: String = "",
    val busquedaTitular: String = "",
    val resultadosTitular: List<ClienteDto> = emptyList(),
    val nuevoTitular: ClienteDto? = null,
    val errorCompletar: String? = null,
)

class OrdenServicioDetalleViewModel(
    private val ordenId: String,
    private val repo: OrdenesServicioRepository,
    private val contratosRepository: ContratosRepository,
    private val clientesRepository: ClientesRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(OrdenServicioDetalleUiState())
    val uiState: StateFlow<OrdenServicioDetalleUiState> = _uiState.asStateFlow()

    private var busquedaJob: Job? = null

    init { cargar() }

    fun cargar() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(orden = UiState.Loading)
            repo.obtener(ordenId)
                .onSuccess { data -> _uiState.value = _uiState.value.copy(orden = UiState.Success(data)) }
                .onFailure { e -> _uiState.value = _uiState.value.copy(orden = UiState.Error(e.message ?: "No se pudo cargar la orden")) }
        }
    }

    fun abrirSelectorTecnico() {
        _uiState.value = _uiState.value.copy(mostrarSelectorTecnico = true)
        if (_uiState.value.tecnicos.isEmpty()) {
            viewModelScope.launch {
                repo.listarTecnicos().onSuccess { tecnicos -> _uiState.value = _uiState.value.copy(tecnicos = tecnicos.filter { it.activo }) }
            }
        }
    }

    fun cerrarSelectorTecnico() {
        _uiState.value = _uiState.value.copy(mostrarSelectorTecnico = false)
    }

    fun asignarTecnico(tecnicoId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(procesando = true, error = null)
            repo.asignarTecnico(ordenId, tecnicoId)
                .onSuccess { data ->
                    _uiState.value = _uiState.value.copy(procesando = false, orden = UiState.Success(data), mostrarSelectorTecnico = false)
                }
                .onFailure { e -> _uiState.value = _uiState.value.copy(procesando = false, error = e.message ?: "No se pudo asignar el técnico") }
        }
    }

    /** "Iniciar trabajo": la orden pasa a en proceso. */
    fun iniciar() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(procesando = true, error = null)
            repo.iniciar(ordenId)
                .onSuccess { data -> _uiState.value = _uiState.value.copy(procesando = false, orden = UiState.Success(data)) }
                .onFailure { e -> _uiState.value = _uiState.value.copy(procesando = false, error = e.message ?: "No se pudo iniciar la orden") }
        }
    }

    fun cancelar() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(procesando = true, error = null)
            repo.cancelar(ordenId)
                .onSuccess { data -> _uiState.value = _uiState.value.copy(procesando = false, orden = UiState.Success(data)) }
                .onFailure { e -> _uiState.value = _uiState.value.copy(procesando = false, error = e.message ?: "No se pudo cancelar la orden") }
        }
    }

    // --- Completar ---

    fun abrirCompletar() {
        _uiState.value = _uiState.value.copy(
            mostrarCompletar = true,
            puntoRedId = null,
            equipoSerie = "",
            busquedaTitular = "",
            resultadosTitular = emptyList(),
            nuevoTitular = null,
            errorCompletar = null,
        )
        if (_uiState.value.puntosRed.isEmpty()) {
            viewModelScope.launch {
                contratosRepository.listarPuntosRed().onSuccess { puntos -> _uiState.value = _uiState.value.copy(puntosRed = puntos) }
            }
        }
    }

    fun cerrarCompletar() { _uiState.value = _uiState.value.copy(mostrarCompletar = false) }
    fun onPuntoRedChange(id: String?) { _uiState.value = _uiState.value.copy(puntoRedId = id, errorCompletar = null) }
    fun onEquipoSerieChange(v: String) { _uiState.value = _uiState.value.copy(equipoSerie = v) }

    fun onBusquedaTitularChange(v: String) {
        _uiState.value = _uiState.value.copy(busquedaTitular = v)
        busquedaJob?.cancel()
        if (v.isBlank()) {
            _uiState.value = _uiState.value.copy(resultadosTitular = emptyList())
            return
        }
        busquedaJob = viewModelScope.launch {
            delay(350)
            clientesRepository.listar(busqueda = v, sector = null, offset = 0)
                .onSuccess { pagina -> _uiState.value = _uiState.value.copy(resultadosTitular = pagina.items) }
        }
    }

    fun elegirTitular(cliente: ClienteDto?) {
        _uiState.value = _uiState.value.copy(nuevoTitular = cliente, busquedaTitular = "", resultadosTitular = emptyList(), errorCompletar = null)
    }

    /**
     * Completa la orden. Igual que la web: una instalación exige el punto de red y un cambio de titular
     * exige el nuevo titular; nada más (en particular, NO exige técnico asignado).
     */
    fun confirmarCompletar() {
        val estado = _uiState.value
        val orden = (estado.orden as? UiState.Success)?.data ?: return
        val esInstalacion = orden.tipoOrden.startsWith("instalacion") && orden.contratoId != null
        val esCambioTitular = orden.tipoOrden == "cambio_titular" && orden.contratoId != null
        if (esInstalacion && estado.puntoRedId == null) {
            _uiState.value = estado.copy(errorCompletar = "Selecciona el punto de red")
            return
        }
        if (esCambioTitular && estado.nuevoTitular == null) {
            _uiState.value = estado.copy(errorCompletar = "Elige el nuevo titular")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(procesando = true, errorCompletar = null, error = null)
            repo.completar(
                ordenId,
                CompletarOrdenPanelRequest(
                    puntoRedId = if (esInstalacion) estado.puntoRedId else null,
                    equipoSerie = if (esInstalacion) estado.equipoSerie.trim().ifBlank { null } else null,
                    nuevoClienteId = if (esCambioTitular) estado.nuevoTitular?.id else null,
                    celular = if (esCambioTitular) estado.nuevoTitular?.telefono else null,
                ),
            )
                .onSuccess { data ->
                    _uiState.value = _uiState.value.copy(procesando = false, orden = UiState.Success(data), mostrarCompletar = false)
                }
                .onFailure { e -> _uiState.value = _uiState.value.copy(procesando = false, errorCompletar = e.message ?: "No se pudo completar la orden") }
        }
    }
}
