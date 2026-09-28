package com.cablera.app.ui.clientes

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.ClienteFichaDto
import com.cablera.app.data.remote.dto.EstadosCargo
import com.cablera.app.data.remote.dto.MetodosPago
import com.cablera.app.data.remote.dto.PuntoRedResumenDto
import com.cablera.app.data.remote.dto.TecnicoResumenDto
import com.cablera.app.data.remote.dto.UpdateClienteRequest
import com.cablera.app.data.remote.dto.UpdateContratoRequest
import com.cablera.app.data.repository.BoletasRepository
import com.cablera.app.data.repository.ClientesRepository
import com.cablera.app.data.repository.ContratosRepository
import com.cablera.app.data.repository.OrdenesServicioRepository
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
    // Editar datos del cliente (el monto y la ficha técnica viven en cada contrato)
    val mostrarEditar: Boolean = false,
    val editNombre: String = "",
    val editTelefono: String = "",
    val editDireccion: String = "",
    val guardandoEdicion: Boolean = false,
    val errorEdicion: String? = null,
    // Dar de baja (cliente completo: todos sus contratos vigentes)
    val mostrarBaja: Boolean = false,
    val motivoBaja: String? = null,
    val enviandoBaja: Boolean = false,
    val errorBaja: String? = null,
    // Editar un contrato: lo que se cobra (costo y día de corte) y su ficha técnica
    val puntosRed: List<PuntoRedResumenDto> = emptyList(),
    val tecnicos: List<TecnicoResumenDto> = emptyList(),
    val contratoEditandoId: String? = null,
    val ecCostoMensual: String = "",
    val ecDiaCorte: String = "1",
    val ecDireccion: String = "",
    val ecReferencia: String = "",
    val ecSector: String = "",
    val ecIpWan: String = "",
    val ecPppoeUsuario: String = "",
    val ecPppoePassword: String = "",
    val ecPrecinto: String = "",
    val ecEquipoSerie: String = "",
    val ecPuntoRedId: String? = null,
    val ecTecnicoInstaladorId: String? = null,
    val guardandoContrato: Boolean = false,
    val errorContrato: String? = null,
    // Dar de baja un contrato puntual
    val contratoBajaId: String? = null,
    val motivoBajaContrato: String? = null,
    val enviandoBajaContrato: Boolean = false,
    val errorBajaContrato: String? = null,
)

val MOTIVOS_BAJA = listOf("Mudanza", "No pagó", "Cambio de proveedor", "Otro")

class ClienteFichaViewModel(
    val clienteId: String,
    private val clientesRepository: ClientesRepository,
    private val boletasRepository: BoletasRepository,
    private val contratosRepository: ContratosRepository,
    private val ordenesServicioRepository: OrdenesServicioRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ClienteFichaUiState())
    val uiState: StateFlow<ClienteFichaUiState> = _uiState.asStateFlow()

    init {
        cargar()
        viewModelScope.launch {
            contratosRepository.listarPuntosRed().onSuccess { puntos -> _uiState.value = _uiState.value.copy(puntosRed = puntos) }
        }
        viewModelScope.launch {
            ordenesServicioRepository.listarTecnicos().onSuccess { tecnicos ->
                _uiState.value = _uiState.value.copy(tecnicos = tecnicos.filter { it.activo })
            }
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

    private fun cargosPendientes() =
        (( _uiState.value.ficha as? UiState.Success)?.data?.cargosMesAMes ?: emptyList()).filter { it.estado != EstadosCargo.PAGADO }

    // --- Cobro rápido ---
    fun abrirCobroRapido() {
        if (_uiState.value.ficha !is UiState.Success) return
        val sugerido = cargosPendientes().sumOf { it.saldo }
        _uiState.value = _uiState.value.copy(mostrarCobroRapido = true, montoCobroRapido = "%.2f".format(sugerido), errorCobro = null)
    }

    fun cerrarCobroRapido() { _uiState.value = _uiState.value.copy(mostrarCobroRapido = false) }

    fun onMontoCobroRapidoTodo() {
        _uiState.value = _uiState.value.copy(montoCobroRapido = "%.2f".format(cargosPendientes().sumOf { it.saldo }))
    }

    fun onMontoCobroRapidoUnMes() {
        // El cargo más antiguo primero: es el que se cubre antes al aplicar el pago.
        val primero = cargosPendientes().minWithOrNull(compareBy({ it.anio }, { it.mes }))?.saldo ?: 0.0
        _uiState.value = _uiState.value.copy(montoCobroRapido = "%.2f".format(primero))
    }

    fun onMontoCobroRapidoChange(v: String) { _uiState.value = _uiState.value.copy(montoCobroRapido = v) }
    fun onMetodoCobroRapidoChange(v: String) { _uiState.value = _uiState.value.copy(metodoCobroRapido = v) }

    fun confirmarCobroRapido(onSuccess: (String) -> Unit) {
        val estado = _uiState.value
        val monto = estado.montoCobroRapido.toDoubleOrNull()
        val pendientes = cargosPendientes()
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

    // Nuevo contrato: ver ContratoNuevoScreen (navegación desde "+ Nuevo contrato" en
    // ClienteFichaScreen, con este cliente ya fijo).

    // --- Editar un contrato (costo, día de corte y ficha técnica) ---
    fun abrirEditarContrato(contratoId: String) {
        val ficha = (_uiState.value.ficha as? UiState.Success)?.data ?: return
        val contrato = ficha.cliente.contratos.find { it.id == contratoId } ?: return
        _uiState.value = _uiState.value.copy(
            contratoEditandoId = contratoId,
            ecCostoMensual = contrato.costoMensual.let { if (it == it.toLong().toDouble()) it.toLong().toString() else it.toString() },
            ecDiaCorte = (contrato.diaCorte ?: 1).toString(),
            ecDireccion = contrato.direccion ?: "",
            ecReferencia = contrato.referencia ?: "",
            ecSector = contrato.sector ?: "",
            ecIpWan = contrato.ipWan ?: "",
            ecPppoeUsuario = contrato.pppoeUsuario ?: "",
            ecPppoePassword = contrato.pppoePassword ?: "",
            ecPrecinto = contrato.precinto ?: "",
            ecEquipoSerie = contrato.equipoSerie ?: "",
            ecPuntoRedId = contrato.puntoRedId,
            ecTecnicoInstaladorId = contrato.tecnicoInstaladorId,
            errorContrato = null,
        )
    }
    fun cerrarEditarContrato() { _uiState.value = _uiState.value.copy(contratoEditandoId = null) }
    fun onEcCostoMensualChange(v: String) { _uiState.value = _uiState.value.copy(ecCostoMensual = v) }
    fun onEcDiaCorteChange(v: String) { _uiState.value = _uiState.value.copy(ecDiaCorte = v.filter(Char::isDigit).take(2)) }
    fun onEcDireccionChange(v: String) { _uiState.value = _uiState.value.copy(ecDireccion = v) }
    fun onEcReferenciaChange(v: String) { _uiState.value = _uiState.value.copy(ecReferencia = v) }
    fun onEcSectorChange(v: String) { _uiState.value = _uiState.value.copy(ecSector = v) }
    fun onEcIpWanChange(v: String) { _uiState.value = _uiState.value.copy(ecIpWan = v) }
    fun onEcPppoeUsuarioChange(v: String) { _uiState.value = _uiState.value.copy(ecPppoeUsuario = v) }
    fun onEcPppoePasswordChange(v: String) { _uiState.value = _uiState.value.copy(ecPppoePassword = v) }
    fun onEcPrecintoChange(v: String) { _uiState.value = _uiState.value.copy(ecPrecinto = v) }
    fun onEcEquipoSerieChange(v: String) { _uiState.value = _uiState.value.copy(ecEquipoSerie = v) }
    fun onEcPuntoRedChange(v: String?) { _uiState.value = _uiState.value.copy(ecPuntoRedId = v) }
    fun onEcTecnicoChange(v: String?) { _uiState.value = _uiState.value.copy(ecTecnicoInstaladorId = v) }

    fun guardarContrato() {
        val estado = _uiState.value
        val contratoId = estado.contratoEditandoId ?: return
        val costo = estado.ecCostoMensual.toDoubleOrNull()
        val diaCorte = estado.ecDiaCorte.toIntOrNull()
        if (costo == null || costo < 0 || diaCorte == null || diaCorte !in 1..31) {
            _uiState.value = estado.copy(errorContrato = "Ingresa un costo válido y un día de corte entre 1 y 31")
            return
        }
        if (estado.ecDireccion.isBlank()) {
            _uiState.value = estado.copy(errorContrato = "La dirección del servicio es obligatoria")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(guardandoContrato = true, errorContrato = null)
            contratosRepository.actualizar(
                contratoId,
                UpdateContratoRequest(
                    direccion = estado.ecDireccion.trim(),
                    referencia = estado.ecReferencia.ifBlank { null },
                    sector = estado.ecSector.ifBlank { null },
                    ipWan = estado.ecIpWan.ifBlank { null },
                    pppoeUsuario = estado.ecPppoeUsuario.ifBlank { null },
                    pppoePassword = estado.ecPppoePassword.ifBlank { null },
                    precinto = estado.ecPrecinto.ifBlank { null },
                    equipoSerie = estado.ecEquipoSerie.ifBlank { null },
                    puntoRedId = estado.ecPuntoRedId,
                    tecnicoInstaladorId = estado.ecTecnicoInstaladorId,
                    costoMensual = costo,
                    diaCorte = diaCorte,
                ),
            )
                .onSuccess {
                    _uiState.value = _uiState.value.copy(guardandoContrato = false, contratoEditandoId = null)
                    cargar()
                }
                .onFailure { e -> _uiState.value = _uiState.value.copy(guardandoContrato = false, errorContrato = e.message ?: "No se pudo guardar el contrato") }
        }
    }

    fun suspenderContrato(contratoId: String) {
        viewModelScope.launch { contratosRepository.suspender(contratoId).onSuccess { cargar() } }
    }

    fun activarContrato(contratoId: String) {
        viewModelScope.launch { contratosRepository.activar(contratoId).onSuccess { cargar() } }
    }

    fun cortarContrato(contratoId: String) {
        viewModelScope.launch { contratosRepository.cortar(contratoId).onSuccess { cargar() } }
    }

    fun abrirBajaContrato(contratoId: String) { _uiState.value = _uiState.value.copy(contratoBajaId = contratoId, motivoBajaContrato = null, errorBajaContrato = null) }
    fun cerrarBajaContrato() { _uiState.value = _uiState.value.copy(contratoBajaId = null) }
    fun onMotivoBajaContratoChange(v: String) { _uiState.value = _uiState.value.copy(motivoBajaContrato = v) }

    fun confirmarBajaContrato() {
        val estado = _uiState.value
        val contratoId = estado.contratoBajaId ?: return
        val motivo = estado.motivoBajaContrato
        if (motivo.isNullOrBlank()) {
            _uiState.value = estado.copy(errorBajaContrato = "Elige un motivo")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(enviandoBajaContrato = true, errorBajaContrato = null)
            contratosRepository.darDeBaja(contratoId, motivo)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(enviandoBajaContrato = false, contratoBajaId = null)
                    cargar()
                }
                .onFailure { e -> _uiState.value = _uiState.value.copy(enviandoBajaContrato = false, errorBajaContrato = e.message ?: "No se pudo dar de baja el contrato") }
        }
    }
}
