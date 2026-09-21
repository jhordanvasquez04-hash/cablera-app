package com.cablera.app.ui.clientes

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.ClienteFichaDto
import com.cablera.app.data.remote.dto.CreateDescuentoRequest
import com.cablera.app.data.remote.dto.MetodosPago
import com.cablera.app.data.remote.dto.ServicioContratadoInput
import com.cablera.app.data.remote.dto.ServicioTecnicoDto
import com.cablera.app.data.remote.dto.TipoServicioDto
import com.cablera.app.data.remote.dto.UpdateClienteRequest
import com.cablera.app.data.remote.dto.UpdateServicioContratadoRequest
import com.cablera.app.data.repository.BoletasRepository
import com.cablera.app.data.repository.ClientesRepository
import com.cablera.app.data.repository.ConfiguracionRepository
import com.cablera.app.data.repository.ServiciosTecnicosRepository
import com.cablera.app.ui.common.UiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ClienteFichaUiState(
    val ficha: UiState<ClienteFichaDto> = UiState.Loading,
    val tabSeleccionada: Int = 0,
    // Cobro rápido
    val mostrarCobroRapido: Boolean = false,
    val montoCobroRapido: String = "",
    val metodoCobroRapido: String = MetodosPago.EFECTIVO,
    val enviandoCobro: Boolean = false,
    val errorCobro: String? = null,
    // Editar datos (solo datos del cliente; el monto vive en cada servicio)
    val mostrarEditar: Boolean = false,
    val editNombre: String = "",
    val editTelefono: String = "",
    val editDireccion: String = "",
    val guardandoEdicion: Boolean = false,
    val errorEdicion: String? = null,
    // Dar de baja (cliente completo)
    val mostrarBaja: Boolean = false,
    val motivoBaja: String? = null,
    val enviandoBaja: Boolean = false,
    val errorBaja: String? = null,
    // Servicios técnicos del cliente
    val serviciosTecnicos: UiState<List<ServicioTecnicoDto>> = UiState.Loading,
    // Catálogo de tipos de servicio (para agregar/editar servicios contratados)
    val tiposServicio: List<TipoServicioDto> = emptyList(),
    // Agregar servicio contratado
    val mostrarAgregarServicio: Boolean = false,
    val nuevoServicioTipoId: String? = null,
    val nuevoServicioMonto: String = "",
    val nuevoServicioFacturacionPropia: Boolean = false,
    val nuevoServicioDia: String = "1",
    val guardandoServicio: Boolean = false,
    val errorServicio: String? = null,
    // Editar servicio contratado (monto / facturación)
    val servicioEditandoId: String? = null,
    val editServicioMonto: String = "",
    val editServicioFacturacionPropia: Boolean = false,
    val editServicioDia: String = "1",
    val guardandoEditarServicio: Boolean = false,
    val errorEditarServicio: String? = null,
    // Aplicar descuento a un servicio
    val servicioDescuentoId: String? = null,
    val descuentoPorcentaje: String = "",
    val descuentoCantidadMeses: String = "1",
    val guardandoDescuento: Boolean = false,
    val errorDescuento: String? = null,
    // Dar de baja un servicio puntual
    val servicioBajaId: String? = null,
    val motivoBajaServicio: String? = null,
    val enviandoBajaServicio: Boolean = false,
    val errorBajaServicio: String? = null,
)

val MOTIVOS_BAJA = listOf("Mudanza", "No pagó", "Cambio de proveedor", "Otro")

class ClienteFichaViewModel(
    val clienteId: String,
    private val clientesRepository: ClientesRepository,
    private val boletasRepository: BoletasRepository,
    private val serviciosTecnicosRepository: ServiciosTecnicosRepository,
    private val configuracionRepository: ConfiguracionRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ClienteFichaUiState())
    val uiState: StateFlow<ClienteFichaUiState> = _uiState.asStateFlow()

    init {
        cargar()
        cargarServiciosTecnicos()
        viewModelScope.launch {
            configuracionRepository.listarTiposServicio().onSuccess { tipos ->
                _uiState.value = _uiState.value.copy(tiposServicio = tipos)
            }
        }
    }

    fun cargarServiciosTecnicos() {
        viewModelScope.launch {
            val guardados = serviciosTecnicosRepository.listarEnCache(estado = null, tipoServicioTecnicoId = null, clienteId = clienteId)
            _uiState.value = _uiState.value.copy(serviciosTecnicos = if (guardados != null) UiState.Success(guardados) else UiState.Loading)
            serviciosTecnicosRepository.listar(estado = null, tipoServicioTecnicoId = null, clienteId = clienteId)
                .onSuccess { data -> _uiState.value = _uiState.value.copy(serviciosTecnicos = UiState.Success(data)) }
                .onFailure { e -> _uiState.value = _uiState.value.copy(serviciosTecnicos = UiState.Error(e.message ?: "No se pudo cargar servicios técnicos")) }
        }
    }

    fun cargar() {
        viewModelScope.launch {
            val guardada = clientesRepository.fichaEnCache(clienteId)
            _uiState.value = _uiState.value.copy(ficha = if (guardada != null) UiState.Success(guardada) else UiState.Loading)
            clientesRepository.ficha(clienteId)
                .onSuccess { ficha ->
                    _uiState.value = _uiState.value.copy(
                        ficha = UiState.Success(ficha),
                        editNombre = ficha.cliente.nombreCompleto,
                        editTelefono = ficha.cliente.telefono ?: "",
                        editDireccion = ficha.cliente.direccion ?: "",
                    )
                }
                .onFailure { e -> _uiState.value = _uiState.value.copy(ficha = UiState.Error(e.message ?: "No se pudo cargar el cliente")) }
        }
    }

    fun onTabChange(index: Int) { _uiState.value = _uiState.value.copy(tabSeleccionada = index) }

    // --- Cobro rápido ---
    fun abrirCobroRapido() {
        val ficha = (_uiState.value.ficha as? UiState.Success)?.data ?: return
        val pendientes = ficha.cargosMesAMes.filter { it.estado != "pagado" }
        val sugerido = pendientes.sumOf { it.saldo }
        _uiState.value = _uiState.value.copy(mostrarCobroRapido = true, montoCobroRapido = "%.2f".format(sugerido), errorCobro = null)
    }

    fun cerrarCobroRapido() { _uiState.value = _uiState.value.copy(mostrarCobroRapido = false) }

    fun onMontoCobroRapidoTodo() {
        val ficha = (_uiState.value.ficha as? UiState.Success)?.data ?: return
        val total = ficha.cargosMesAMes.filter { it.estado != "pagado" }.sumOf { it.saldo }
        _uiState.value = _uiState.value.copy(montoCobroRapido = "%.2f".format(total))
    }

    fun onMontoCobroRapidoUnMes() {
        val ficha = (_uiState.value.ficha as? UiState.Success)?.data ?: return
        val primero = ficha.cargosMesAMes.filter { it.estado != "pagado" }.firstOrNull()?.saldo ?: 0.0
        _uiState.value = _uiState.value.copy(montoCobroRapido = "%.2f".format(primero))
    }

    fun onMontoCobroRapidoChange(v: String) { _uiState.value = _uiState.value.copy(montoCobroRapido = v) }
    fun onMetodoCobroRapidoChange(v: String) { _uiState.value = _uiState.value.copy(metodoCobroRapido = v) }

    fun confirmarCobroRapido(onSuccess: (String) -> Unit) {
        val ficha = (_uiState.value.ficha as? UiState.Success)?.data ?: return
        val estado = _uiState.value
        val monto = estado.montoCobroRapido.toDoubleOrNull()
        val pendientes = ficha.cargosMesAMes.filter { it.estado != "pagado" }
        if (monto == null || monto <= 0.0 || pendientes.isEmpty()) {
            _uiState.value = estado.copy(errorCobro = "Ingresa un monto válido")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(enviandoCobro = true, errorCobro = null)
            boletasRepository.registrarPago(
                clienteId = clienteId,
                cargoIds = pendientes.map { it.id },
                montoPagado = monto,
                metodoPago = estado.metodoCobroRapido,
            ).onSuccess { boletaId ->
                _uiState.value = _uiState.value.copy(enviandoCobro = false, mostrarCobroRapido = false)
                cargar()
                onSuccess(boletaId)
            }.onFailure { e ->
                _uiState.value = _uiState.value.copy(enviandoCobro = false, errorCobro = e.message ?: "No se pudo registrar el cobro")
            }
        }
    }

    // --- Editar datos del cliente ---
    fun abrirEditar() { _uiState.value = _uiState.value.copy(mostrarEditar = true, errorEdicion = null) }
    fun cerrarEditar() { _uiState.value = _uiState.value.copy(mostrarEditar = false) }
    fun onEditNombreChange(v: String) { _uiState.value = _uiState.value.copy(editNombre = v) }
    fun onEditTelefonoChange(v: String) { _uiState.value = _uiState.value.copy(editTelefono = v) }
    fun onEditDireccionChange(v: String) { _uiState.value = _uiState.value.copy(editDireccion = v) }

    fun guardarEdicion() {
        val estado = _uiState.value
        if (estado.editNombre.isBlank()) {
            _uiState.value = estado.copy(errorEdicion = "Verifica el nombre")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(guardandoEdicion = true, errorEdicion = null)
            clientesRepository.actualizar(
                clienteId,
                UpdateClienteRequest(
                    nombreCompleto = estado.editNombre.trim(),
                    telefono = estado.editTelefono.ifBlank { null },
                    direccion = estado.editDireccion.ifBlank { null },
                ),
            ).onSuccess {
                _uiState.value = _uiState.value.copy(guardandoEdicion = false, mostrarEditar = false)
                cargar()
            }.onFailure { e ->
                _uiState.value = _uiState.value.copy(guardandoEdicion = false, errorEdicion = e.message ?: "No se pudo guardar")
            }
        }
    }

    // --- Dar de baja (cliente completo) ---
    fun abrirBaja() { _uiState.value = _uiState.value.copy(mostrarBaja = true, motivoBaja = null, errorBaja = null) }
    fun cerrarBaja() { _uiState.value = _uiState.value.copy(mostrarBaja = false) }
    fun onMotivoBajaChange(v: String) { _uiState.value = _uiState.value.copy(motivoBaja = v) }

    fun confirmarBaja(onSuccess: () -> Unit) {
        val motivo = _uiState.value.motivoBaja
        if (motivo.isNullOrBlank()) {
            _uiState.value = _uiState.value.copy(errorBaja = "Elige un motivo")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(enviandoBaja = true, errorBaja = null)
            clientesRepository.darDeBaja(clienteId, motivo)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(enviandoBaja = false, mostrarBaja = false)
                    cargar()
                    onSuccess()
                }
                .onFailure { e -> _uiState.value = _uiState.value.copy(enviandoBaja = false, errorBaja = e.message ?: "No se pudo dar de baja") }
        }
    }

    // --- Agregar servicio contratado ---
    fun abrirAgregarServicio() {
        val estado = _uiState.value
        _uiState.value = estado.copy(
            mostrarAgregarServicio = true,
            nuevoServicioTipoId = estado.tiposServicio.firstOrNull()?.id,
            nuevoServicioMonto = "",
            nuevoServicioFacturacionPropia = false,
            nuevoServicioDia = "1",
            errorServicio = null,
        )
    }
    fun cerrarAgregarServicio() { _uiState.value = _uiState.value.copy(mostrarAgregarServicio = false) }
    fun onNuevoServicioTipoChange(v: String) { _uiState.value = _uiState.value.copy(nuevoServicioTipoId = v) }
    fun onNuevoServicioMontoChange(v: String) { _uiState.value = _uiState.value.copy(nuevoServicioMonto = v) }
    fun onNuevoServicioFacturacionPropiaChange(v: Boolean) { _uiState.value = _uiState.value.copy(nuevoServicioFacturacionPropia = v) }
    fun onNuevoServicioDiaChange(v: String) { _uiState.value = _uiState.value.copy(nuevoServicioDia = v.filter(Char::isDigit).take(2)) }

    fun confirmarAgregarServicio() {
        val estado = _uiState.value
        val monto = estado.nuevoServicioMonto.toDoubleOrNull()
        if (estado.nuevoServicioTipoId == null || monto == null || monto < 0) {
            _uiState.value = estado.copy(errorServicio = "Completa el tipo de servicio y un monto válido")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(guardandoServicio = true, errorServicio = null)
            clientesRepository.agregarServicio(
                clienteId,
                ServicioContratadoInput(
                    tipoServicioId = estado.nuevoServicioTipoId,
                    montoBase = monto,
                    fechaFacturacionOverride = if (estado.nuevoServicioFacturacionPropia) estado.nuevoServicioDia.toIntOrNull()?.coerceIn(1, 28) else null,
                ),
            ).onSuccess {
                _uiState.value = _uiState.value.copy(guardandoServicio = false, mostrarAgregarServicio = false)
                cargar()
            }.onFailure { e ->
                _uiState.value = _uiState.value.copy(guardandoServicio = false, errorServicio = e.message ?: "No se pudo agregar el servicio")
            }
        }
    }

    // --- Editar servicio contratado ---
    fun abrirEditarServicio(servicioId: String) {
        val ficha = (_uiState.value.ficha as? UiState.Success)?.data ?: return
        val servicio = ficha.cliente.serviciosContratados.find { it.id == servicioId } ?: return
        _uiState.value = _uiState.value.copy(
            servicioEditandoId = servicioId,
            editServicioMonto = servicio.montoBase.toString(),
            editServicioFacturacionPropia = servicio.fechaFacturacionOverride != null,
            editServicioDia = (servicio.fechaFacturacionOverride ?: 1).toString(),
            errorEditarServicio = null,
        )
    }
    fun cerrarEditarServicio() { _uiState.value = _uiState.value.copy(servicioEditandoId = null) }
    fun onEditServicioMontoChange(v: String) { _uiState.value = _uiState.value.copy(editServicioMonto = v) }
    fun onEditServicioFacturacionPropiaChange(v: Boolean) { _uiState.value = _uiState.value.copy(editServicioFacturacionPropia = v) }
    fun onEditServicioDiaChange(v: String) { _uiState.value = _uiState.value.copy(editServicioDia = v.filter(Char::isDigit).take(2)) }

    fun confirmarEditarServicio() {
        val estado = _uiState.value
        val servicioId = estado.servicioEditandoId ?: return
        val monto = estado.editServicioMonto.toDoubleOrNull()
        if (monto == null || monto < 0) {
            _uiState.value = estado.copy(errorEditarServicio = "Ingresa un monto válido")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(guardandoEditarServicio = true, errorEditarServicio = null)
            clientesRepository.actualizarServicio(
                clienteId,
                servicioId,
                UpdateServicioContratadoRequest(
                    montoBase = monto,
                    fechaFacturacionOverride = if (estado.editServicioFacturacionPropia) estado.editServicioDia.toIntOrNull()?.coerceIn(1, 28) else null,
                ),
            ).onSuccess {
                _uiState.value = _uiState.value.copy(guardandoEditarServicio = false, servicioEditandoId = null)
                cargar()
            }.onFailure { e ->
                _uiState.value = _uiState.value.copy(guardandoEditarServicio = false, errorEditarServicio = e.message ?: "No se pudo guardar")
            }
        }
    }

    // --- Suspender / activar un servicio ---
    fun suspenderServicio(servicioId: String) {
        viewModelScope.launch {
            clientesRepository.suspenderServicio(clienteId, servicioId).onSuccess { cargar() }
        }
    }

    fun activarServicio(servicioId: String) {
        viewModelScope.launch {
            clientesRepository.activarServicio(clienteId, servicioId).onSuccess { cargar() }
        }
    }

    // --- Dar de baja un servicio puntual ---
    fun abrirBajaServicio(servicioId: String) { _uiState.value = _uiState.value.copy(servicioBajaId = servicioId, motivoBajaServicio = null, errorBajaServicio = null) }
    fun cerrarBajaServicio() { _uiState.value = _uiState.value.copy(servicioBajaId = null) }
    fun onMotivoBajaServicioChange(v: String) { _uiState.value = _uiState.value.copy(motivoBajaServicio = v) }

    fun confirmarBajaServicio() {
        val estado = _uiState.value
        val servicioId = estado.servicioBajaId ?: return
        val motivo = estado.motivoBajaServicio
        if (motivo.isNullOrBlank()) {
            _uiState.value = estado.copy(errorBajaServicio = "Elige un motivo")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(enviandoBajaServicio = true, errorBajaServicio = null)
            clientesRepository.darDeBajaServicio(clienteId, servicioId, motivo)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(enviandoBajaServicio = false, servicioBajaId = null)
                    cargar()
                }
                .onFailure { e -> _uiState.value = _uiState.value.copy(enviandoBajaServicio = false, errorBajaServicio = e.message ?: "No se pudo dar de baja el servicio") }
        }
    }

    // --- Aplicar descuento a un servicio ---
    fun abrirDescuento(servicioId: String) {
        _uiState.value = _uiState.value.copy(
            servicioDescuentoId = servicioId,
            descuentoPorcentaje = "",
            descuentoCantidadMeses = "1",
            errorDescuento = null,
        )
    }
    fun cerrarDescuento() { _uiState.value = _uiState.value.copy(servicioDescuentoId = null) }
    fun onDescuentoPorcentajeChange(v: String) { _uiState.value = _uiState.value.copy(descuentoPorcentaje = v.filter(Char::isDigit).take(3)) }
    fun onDescuentoCantidadMesesChange(v: String) { _uiState.value = _uiState.value.copy(descuentoCantidadMeses = v.filter(Char::isDigit).take(2)) }

    fun confirmarDescuento() {
        val estado = _uiState.value
        val servicioId = estado.servicioDescuentoId ?: return
        val porcentaje = estado.descuentoPorcentaje.toIntOrNull()
        val meses = estado.descuentoCantidadMeses.toIntOrNull()
        if (porcentaje == null || porcentaje !in 0..100 || meses == null || meses < 1) {
            _uiState.value = estado.copy(errorDescuento = "Ingresa un porcentaje (0-100) y una cantidad de meses válida")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(guardandoDescuento = true, errorDescuento = null)
            clientesRepository.aplicarDescuento(clienteId, servicioId, CreateDescuentoRequest(porcentaje = porcentaje, cantidadMeses = meses))
                .onSuccess {
                    _uiState.value = _uiState.value.copy(guardandoDescuento = false, servicioDescuentoId = null)
                    cargar()
                }
                .onFailure { e -> _uiState.value = _uiState.value.copy(guardandoDescuento = false, errorDescuento = e.message ?: "No se pudo aplicar el descuento") }
        }
    }
}
