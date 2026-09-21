package com.cablera.app.ui.servicios

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.ClienteDto
import com.cablera.app.data.remote.dto.CreateServicioTecnicoRequest
import com.cablera.app.data.remote.dto.TipoServicioTecnicoDto
import com.cablera.app.data.repository.ClientesRepository
import com.cablera.app.data.repository.ServiciosTecnicosRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ServicioNuevoUiState(
    val tipos: List<TipoServicioTecnicoDto> = emptyList(),
    val tipoSeleccionadoId: String? = null,
    val clienteId: String? = null,
    val clienteNombre: String = "",
    val clienteFijo: Boolean = false,
    val busquedaCliente: String = "",
    val resultadosClientes: List<ClienteDto> = emptyList(),
    val tecnico: String = "",
    val fechaProgramada: String = "",
    val comentario: String = "",
    val datosPropios: Map<String, String> = emptyMap(),
    val guardando: Boolean = false,
    val error: String? = null,
    val buscandoClientes: Boolean = false,
    val errorBusquedaCliente: String? = null,
)

class ServicioNuevoViewModel(
    clienteIdFijo: String?,
    private val serviciosRepository: ServiciosTecnicosRepository,
    private val clientesRepository: ClientesRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ServicioNuevoUiState(clienteId = clienteIdFijo, clienteFijo = clienteIdFijo != null))
    val uiState: StateFlow<ServicioNuevoUiState> = _uiState.asStateFlow()

    private var buscarJob: Job? = null

    init {
        viewModelScope.launch {
            serviciosRepository.listarTipos().onSuccess { tipos ->
                val primerTipo = tipos.firstOrNull()
                _uiState.value = _uiState.value.copy(
                    tipos = tipos,
                    tipoSeleccionadoId = _uiState.value.tipoSeleccionadoId ?: primerTipo?.id,
                    datosPropios = primerTipo?.camposDefinicion?.associateWith { "" } ?: emptyMap(),
                )
            }
        }
        if (clienteIdFijo != null) {
            viewModelScope.launch {
                clientesRepository.obtener(clienteIdFijo).onSuccess { cliente ->
                    _uiState.value = _uiState.value.copy(clienteNombre = cliente.nombreCompleto)
                }
            }
        }
    }

    fun onTipoChange(tipoId: String) {
        val campos = _uiState.value.tipos.firstOrNull { it.id == tipoId }?.camposDefinicion ?: emptyList()
        _uiState.value = _uiState.value.copy(tipoSeleccionadoId = tipoId, datosPropios = campos.associateWith { "" })
    }

    fun onCampoPropioChange(nombre: String, valor: String) {
        _uiState.value = _uiState.value.copy(datosPropios = _uiState.value.datosPropios + (nombre to valor))
    }

    fun onBusquedaClienteChange(valor: String) {
        _uiState.value = _uiState.value.copy(busquedaCliente = valor, errorBusquedaCliente = null)
        buscarJob?.cancel()
        if (valor.isBlank()) {
            _uiState.value = _uiState.value.copy(resultadosClientes = emptyList(), buscandoClientes = false)
            return
        }
        buscarJob = viewModelScope.launch {
            delay(300)
            _uiState.value = _uiState.value.copy(buscandoClientes = true)
            clientesRepository.listar(zonaId = null, estado = null, busqueda = valor)
                .onSuccess { clientes ->
                    _uiState.value = _uiState.value.copy(resultadosClientes = clientes.take(15), buscandoClientes = false)
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(buscandoClientes = false, errorBusquedaCliente = e.message ?: "No se pudo buscar clientes")
                }
        }
    }

    fun onSeleccionarCliente(cliente: ClienteDto) {
        _uiState.value = _uiState.value.copy(clienteId = cliente.id, clienteNombre = cliente.nombreCompleto, resultadosClientes = emptyList(), busquedaCliente = "")
    }

    fun onTecnicoChange(v: String) { _uiState.value = _uiState.value.copy(tecnico = v) }
    fun onFechaProgramadaChange(v: String) { _uiState.value = _uiState.value.copy(fechaProgramada = v) }
    fun onComentarioChange(v: String) { _uiState.value = _uiState.value.copy(comentario = v) }

    fun guardar(onSuccess: (String) -> Unit) {
        val estado = _uiState.value
        if (estado.clienteId == null || estado.tipoSeleccionadoId == null) {
            _uiState.value = estado.copy(error = "Elige un cliente y un tipo de servicio")
            return
        }
        val fechaIso = estado.fechaProgramada.takeIf { it.isNotBlank() }?.let { "${it}T00:00:00Z" }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(guardando = true, error = null)
            serviciosRepository.crear(
                CreateServicioTecnicoRequest(
                    tipoServicioTecnicoId = estado.tipoSeleccionadoId,
                    clienteId = estado.clienteId,
                    tecnico = estado.tecnico.ifBlank { null },
                    fechaProgramada = fechaIso,
                    comentario = estado.comentario.ifBlank { null },
                    datosPropios = estado.datosPropios.filterValues { it.isNotBlank() },
                ),
            )
                .onSuccess { servicio -> onSuccess(servicio.id) }
                .onFailure { e -> _uiState.value = _uiState.value.copy(guardando = false, error = e.message ?: "No se pudo crear el servicio") }
        }
    }
}
