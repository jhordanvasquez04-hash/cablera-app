package com.cablera.app.ui.contratos

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.ClienteDto
import com.cablera.app.data.remote.dto.CreateClienteRequest
import com.cablera.app.data.remote.dto.CreateContratoRequest
import com.cablera.app.data.remote.dto.PlanDto
import com.cablera.app.data.remote.dto.TiposServicioRed
import com.cablera.app.data.repository.ClientesRepository
import com.cablera.app.data.repository.ContratosRepository
import com.cablera.app.data.repository.PlanesRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

// Fusión con Keysls, tal cual Contratos.jsx: acá es donde se cobra de verdad — un CONTRATO es un
// tipo de servicio + un plan/monto + su propia dirección de instalación (el cliente puede sacar
// contratos para casas distintas, así que la dirección vive acá, no en el cliente). Primero se
// busca al cliente en la base (o se crea uno nuevo al toque, sin salir de esta pantalla — igual
// que BuscadorCliente en la web), y recién ahí se completan los datos del servicio.
data class ContratoNuevoUiState(
    // Si se abrió desde la ficha de un cliente ya no se puede cambiar (clienteFijo = true).
    val clienteFijo: Boolean = false,
    val clienteSeleccionado: ClienteDto? = null,
    val busquedaCliente: String = "",
    val resultadosBusqueda: List<ClienteDto> = emptyList(),
    val buscandoClientes: Boolean = false,
    // Crear cliente al toque (si la búsqueda no encontró a nadie)
    val mostrarCrearCliente: Boolean = false,
    val nuevoClienteDni: String = "",
    val nuevoClienteNombre: String = "",
    val nuevoClienteTelefono: String = "",
    val guardandoCliente: Boolean = false,
    /** DNI/RUC ya registrado: se ofrece usar ese cliente en vez de crear otro. */
    val clienteDuplicado: ClienteDto? = null,
    val errorCliente: String? = null,
    // Catálogos
    val planes: List<PlanDto> = emptyList(),
    // Datos del servicio
    val tipoServicio: String = TiposServicioRed.INTERNET,
    val planId: String? = null,
    val montoBase: String = "",
    val diaCorte: String = "1",
    // Ubicación del servicio — propia de este contrato, no del cliente
    val direccion: String = "",
    val referencia: String = "",
    val sector: String = "",
    val latitud: String = "",
    val longitud: String = "",
    val guardando: Boolean = false,
    val error: String? = null,
) {
    val planesFiltrados: List<PlanDto>
        get() = planes.filter { it.tipoServicio == tipoServicio }
}

class ContratoNuevoViewModel(
    private val clienteIdFijo: String?,
    private val clientesRepository: ClientesRepository,
    private val contratosRepository: ContratosRepository,
    private val planesRepository: PlanesRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ContratoNuevoUiState())
    val uiState: StateFlow<ContratoNuevoUiState> = _uiState.asStateFlow()

    private var busquedaJob: kotlinx.coroutines.Job? = null

    init {
        viewModelScope.launch {
            planesRepository.listar(soloActivos = true).onSuccess { planes -> _uiState.value = _uiState.value.copy(planes = planes) }
        }
        if (clienteIdFijo != null) {
            viewModelScope.launch {
                clientesRepository.obtener(clienteIdFijo).onSuccess { cliente ->
                    _uiState.value = _uiState.value.copy(clienteFijo = true, clienteSeleccionado = cliente)
                }
            }
        }
    }

    // --- Búsqueda / selección de cliente ---
    fun onBusquedaClienteChange(v: String) {
        _uiState.value = _uiState.value.copy(busquedaCliente = v, mostrarCrearCliente = false)
        busquedaJob?.cancel()
        if (v.isBlank()) {
            _uiState.value = _uiState.value.copy(resultadosBusqueda = emptyList(), buscandoClientes = false)
            return
        }
        busquedaJob = viewModelScope.launch {
            kotlinx.coroutines.delay(350)
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
            mostrarCrearCliente = false,
        )
    }

    fun quitarClienteSeleccionado() {
        if (_uiState.value.clienteFijo) return
        _uiState.value = _uiState.value.copy(clienteSeleccionado = null)
    }

    // --- Crear cliente al toque, sin salir de "Nuevo contrato" (igual que FormNuevoCliente en la web) ---
    fun abrirCrearCliente() {
        _uiState.value = _uiState.value.copy(
            mostrarCrearCliente = true,
            nuevoClienteNombre = _uiState.value.busquedaCliente,
            nuevoClienteDni = "",
            nuevoClienteTelefono = "",
            errorCliente = null,
        )
    }
    fun cerrarDuplicado() { _uiState.value = _uiState.value.copy(clienteDuplicado = null) }

    fun usarClienteDuplicado() {
        val existente = _uiState.value.clienteDuplicado ?: return
        _uiState.value = _uiState.value.copy(clienteDuplicado = null)
        seleccionarCliente(existente)
    }

    fun cerrarCrearCliente() { _uiState.value = _uiState.value.copy(mostrarCrearCliente = false) }
    private var verificacionDni: Job? = null

    /** Al completar el DNI/RUC se comprueba de inmediato si ya existe ese cliente. */
    fun onNuevoClienteDniChange(v: String) {
        val dni = v.filter(Char::isDigit).take(11)
        _uiState.value = _uiState.value.copy(nuevoClienteDni = dni, errorCliente = null, clienteDuplicado = null)
        verificacionDni?.cancel()
        if (dni.length == 8 || dni.length == 11) {
            verificacionDni = viewModelScope.launch {
                val existente = clientesRepository.listar(busqueda = dni, sector = null, offset = 0)
                    .getOrNull()?.items?.firstOrNull { it.dni == dni }
                if (existente != null && _uiState.value.nuevoClienteDni == dni) _uiState.value = _uiState.value.copy(clienteDuplicado = existente)
            }
        }
    }
    fun onNuevoClienteNombreChange(v: String) { _uiState.value = _uiState.value.copy(nuevoClienteNombre = v, errorCliente = null) }
    fun onNuevoClienteTelefonoChange(v: String) { _uiState.value = _uiState.value.copy(nuevoClienteTelefono = v) }

    fun confirmarCrearCliente() {
        val estado = _uiState.value
        if (estado.nuevoClienteNombre.isBlank() || (estado.nuevoClienteDni.length != 8 && estado.nuevoClienteDni.length != 11)) {
            _uiState.value = estado.copy(errorCliente = "Completa el nombre y un DNI de 8 dígitos (o RUC de 11)")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(guardandoCliente = true, errorCliente = null)
            val existente = clientesRepository.listar(busqueda = estado.nuevoClienteDni, sector = null, offset = 0)
                .getOrNull()?.items?.firstOrNull { it.dni == estado.nuevoClienteDni }
            if (existente != null) {
                _uiState.value = _uiState.value.copy(guardandoCliente = false, clienteDuplicado = existente)
                return@launch
            }
            clientesRepository.crear(
                CreateClienteRequest(
                    dni = estado.nuevoClienteDni,
                    nombreCompleto = estado.nuevoClienteNombre.trim(),
                    telefono = estado.nuevoClienteTelefono.ifBlank { null },
                ),
            ).onSuccess { cliente ->
                _uiState.value = _uiState.value.copy(guardandoCliente = false)
                seleccionarCliente(cliente)
            }.onFailure { e ->
                _uiState.value = _uiState.value.copy(guardandoCliente = false, errorCliente = e.message ?: "No se pudo crear el cliente")
            }
        }
    }

    // --- Datos del servicio ---
    fun onTipoServicioChange(v: String) { _uiState.value = _uiState.value.copy(tipoServicio = v, planId = null, error = null) }

    fun onPlanChange(planId: String?) {
        val estado = _uiState.value
        val plan = estado.planes.find { it.id == planId }
        _uiState.value = estado.copy(planId = planId, montoBase = plan?.let { formatearMonto(it.precio) } ?: estado.montoBase, error = null)
    }

    fun onMontoChange(v: String) { _uiState.value = _uiState.value.copy(montoBase = v, error = null) }
    fun onDiaCorteChange(v: String) { _uiState.value = _uiState.value.copy(diaCorte = v.filter(Char::isDigit).take(2)) }
    fun onDireccionChange(v: String) { _uiState.value = _uiState.value.copy(direccion = v, error = null) }
    fun onReferenciaChange(v: String) { _uiState.value = _uiState.value.copy(referencia = v) }
    fun onSectorChange(v: String) { _uiState.value = _uiState.value.copy(sector = v) }
    fun onLatitudChange(v: String) { _uiState.value = _uiState.value.copy(latitud = v) }
    fun onLongitudChange(v: String) { _uiState.value = _uiState.value.copy(longitud = v) }

    fun guardar(onSuccess: (String) -> Unit) {
        val estado = _uiState.value
        val cliente = estado.clienteSeleccionado
        if (cliente == null) {
            _uiState.value = estado.copy(error = "Busca o crea un cliente primero")
            return
        }
        if (estado.direccion.isBlank()) {
            _uiState.value = estado.copy(error = "La dirección del servicio es obligatoria")
            return
        }
        val monto = estado.montoBase.toDoubleOrNull()
        if (monto == null || monto < 0) {
            _uiState.value = estado.copy(error = "Ingresa un monto mensual válido")
            return
        }
        val diaCorte = estado.diaCorte.toIntOrNull()
        if (diaCorte == null || diaCorte !in 1..31) {
            _uiState.value = estado.copy(error = "El día de corte debe estar entre 1 y 31")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(guardando = true, error = null)
            // Un solo paso: en Keysls el contrato ES el servicio y su ficha (además de crear el
            // contrato, el backend genera solo la orden de instalación).
            contratosRepository.crear(
                CreateContratoRequest(
                    clienteId = cliente.id,
                    tipoServicio = estado.tipoServicio,
                    direccion = estado.direccion.trim(),
                    diaCorte = diaCorte,
                    planId = estado.planId,
                    costoMensual = monto,
                    referencia = estado.referencia.ifBlank { null },
                    sector = estado.sector.ifBlank { null },
                    latitud = estado.latitud.toDoubleOrNull(),
                    longitud = estado.longitud.toDoubleOrNull(),
                ),
            ).onSuccess {
                _uiState.value = _uiState.value.copy(guardando = false)
                onSuccess(cliente.id)
            }.onFailure { e ->
                _uiState.value = _uiState.value.copy(guardando = false, error = e.message ?: "No se pudo crear el contrato")
            }
        }
    }

    private fun formatearMonto(valor: Double): String =
        if (valor == valor.toLong().toDouble()) valor.toLong().toString() else valor.toString()
}
