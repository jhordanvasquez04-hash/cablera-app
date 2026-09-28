package com.cablera.app.ui.ordenes

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.ClienteDto
import com.cablera.app.data.remote.dto.ContratoDto
import com.cablera.app.data.remote.dto.CreateOrdenRequest
import com.cablera.app.data.remote.dto.EstadosContrato
import com.cablera.app.data.remote.dto.TecnicoResumenDto
import com.cablera.app.data.remote.dto.TiposOrdenPorServicio
import com.cablera.app.data.repository.ClientesRepository
import com.cablera.app.data.repository.ContratosRepository
import com.cablera.app.data.repository.OrdenesServicioRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

// Servicio técnico = orden de servicio de Keysls. Se crea sobre un CONTRATO: primero se elige el
// cliente y su contrato (o ya viene fijo si se abrió desde el detalle del contrato), luego el tipo
// de orden (depende del servicio del contrato) y los datos de la visita.
data class NuevaOrdenUiState(
    val contratoFijo: Boolean = false,
    val cargandoContrato: Boolean = false,
    // Cliente y contrato
    val busquedaCliente: String = "",
    val resultadosBusqueda: List<ClienteDto> = emptyList(),
    val buscandoClientes: Boolean = false,
    val clienteSeleccionado: ClienteDto? = null,
    val contratoSeleccionado: ContratoDto? = null,
    // Datos de la orden
    val tipoOrden: String? = null,
    val abonado: String = "",
    val dni: String = "",
    val direccion: String = "",
    val referencia: String = "",
    val celular: String = "",
    val observacion: String = "",
    val tecnicos: List<TecnicoResumenDto> = emptyList(),
    val tecnicoId: String? = null,
    val guardando: Boolean = false,
    val error: String? = null,
) {
    /** Contratos del cliente elegido sobre los que aún tiene sentido abrir una orden. */
    val contratosDisponibles: List<ContratoDto>
        get() = clienteSeleccionado?.contratos.orEmpty().filter { it.estado != EstadosContrato.BAJA }

    val tiposDisponibles: List<String>
        get() = contratoSeleccionado?.let { TiposOrdenPorServicio.de(it.tipoServicio) }.orEmpty()
}

class NuevaOrdenViewModel(
    private val contratoIdFijo: String?,
    private val clienteIdFijo: String?,
    private val clientesRepository: ClientesRepository,
    private val contratosRepository: ContratosRepository,
    private val ordenesRepository: OrdenesServicioRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(NuevaOrdenUiState())
    val uiState: StateFlow<NuevaOrdenUiState> = _uiState.asStateFlow()

    private var busquedaJob: Job? = null

    init {
        viewModelScope.launch {
            ordenesRepository.listarTecnicos().onSuccess { tecnicos ->
                _uiState.value = _uiState.value.copy(tecnicos = tecnicos.filter { it.activo })
            }
        }
        // Desde la ficha de un cliente: llega con el cliente ya elegido (y su contrato, si tiene uno solo).
        if (clienteIdFijo != null && contratoIdFijo == null) {
            viewModelScope.launch {
                clientesRepository.obtener(clienteIdFijo).onSuccess { cliente -> seleccionarCliente(cliente) }
            }
        }
        if (contratoIdFijo != null) {
            viewModelScope.launch {
                _uiState.value = _uiState.value.copy(contratoFijo = true, cargandoContrato = true)
                contratosRepository.obtener(contratoIdFijo)
                    .onSuccess { contrato -> elegirContrato(contrato) }
                    .onFailure { e ->
                        _uiState.value = _uiState.value.copy(cargandoContrato = false, error = e.message ?: "No se pudo cargar el contrato")
                    }
            }
        }
    }

    // --- Cliente y contrato ---
    fun onBusquedaClienteChange(v: String) {
        _uiState.value = _uiState.value.copy(busquedaCliente = v)
        busquedaJob?.cancel()
        if (v.isBlank()) {
            _uiState.value = _uiState.value.copy(resultadosBusqueda = emptyList(), buscandoClientes = false)
            return
        }
        busquedaJob = viewModelScope.launch {
            delay(350)
            _uiState.value = _uiState.value.copy(buscandoClientes = true)
            clientesRepository.listar(busqueda = v, sector = null, offset = 0)
                .onSuccess { pagina -> _uiState.value = _uiState.value.copy(resultadosBusqueda = pagina.items, buscandoClientes = false) }
                .onFailure { _uiState.value = _uiState.value.copy(buscandoClientes = false) }
        }
    }

    fun seleccionarCliente(cliente: ClienteDto) {
        _uiState.value = _uiState.value.copy(
            clienteSeleccionado = cliente,
            busquedaCliente = "",
            resultadosBusqueda = emptyList(),
            contratoSeleccionado = null,
            tipoOrden = null,
            error = null,
        )
        // Con un solo contrato vigente no hay nada que elegir.
        _uiState.value.contratosDisponibles.singleOrNull()?.let { elegirContrato(it) }
    }

    fun quitarCliente() {
        if (_uiState.value.contratoFijo) return
        _uiState.value = _uiState.value.copy(clienteSeleccionado = null, contratoSeleccionado = null, tipoOrden = null)
    }

    fun elegirContrato(contrato: ContratoDto) {
        val actual = _uiState.value
        _uiState.value = actual.copy(
            cargandoContrato = false,
            contratoSeleccionado = contrato,
            // El tipo elegido solo sigue valiendo si también existe para el servicio de este contrato.
            tipoOrden = actual.tipoOrden?.takeIf { it in TiposOrdenPorServicio.de(contrato.tipoServicio) },
            abonado = contrato.clienteNombre,
            dni = contrato.clienteDni.orEmpty(),
            celular = contrato.clienteTelefono.orEmpty(),
            direccion = contrato.direccion.orEmpty(),
            referencia = contrato.referencia.orEmpty(),
            error = null,
        )
    }

    // --- Datos de la orden ---
    fun onTipoOrdenChange(v: String) { _uiState.value = _uiState.value.copy(tipoOrden = v, error = null) }
    fun onAbonadoChange(v: String) { _uiState.value = _uiState.value.copy(abonado = v, error = null) }
    fun onDniChange(v: String) { _uiState.value = _uiState.value.copy(dni = v) }
    fun onDireccionChange(v: String) { _uiState.value = _uiState.value.copy(direccion = v, error = null) }
    fun onReferenciaChange(v: String) { _uiState.value = _uiState.value.copy(referencia = v) }
    fun onCelularChange(v: String) { _uiState.value = _uiState.value.copy(celular = v) }
    fun onObservacionChange(v: String) { _uiState.value = _uiState.value.copy(observacion = v) }
    fun onTecnicoChange(v: String?) { _uiState.value = _uiState.value.copy(tecnicoId = v) }

    fun guardar(onSuccess: (String) -> Unit) {
        val estado = _uiState.value
        val contrato = estado.contratoSeleccionado
        if (contrato == null) {
            _uiState.value = estado.copy(error = "Elige el cliente y su contrato")
            return
        }
        if (estado.tipoOrden == null) {
            _uiState.value = estado.copy(error = "Elige el tipo de servicio técnico")
            return
        }
        if (estado.abonado.isBlank() || estado.direccion.isBlank()) {
            _uiState.value = estado.copy(error = "El nombre del abonado y la dirección son obligatorios")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(guardando = true, error = null)
            ordenesRepository.crear(
                CreateOrdenRequest(
                    contratoId = contrato.id,
                    tipoOrden = estado.tipoOrden,
                    tipoServicio = contrato.tipoServicio,
                    abonado = estado.abonado.trim(),
                    dni = estado.dni.ifBlank { null },
                    direccion = estado.direccion.trim(),
                    referencia = estado.referencia.ifBlank { null },
                    sector = contrato.sector,
                    celular = estado.celular.ifBlank { null },
                    observacion = estado.observacion.ifBlank { null },
                    tecnicoId = estado.tecnicoId,
                ),
            )
                .onSuccess { orden ->
                    _uiState.value = _uiState.value.copy(guardando = false)
                    onSuccess(orden.id)
                }
                .onFailure { e -> _uiState.value = _uiState.value.copy(guardando = false, error = e.message ?: "No se pudo crear la orden") }
        }
    }
}
