package com.cablera.app.ui.pagos

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.CargoPendienteDto
import com.cablera.app.data.remote.dto.ClienteDto
import com.cablera.app.data.remote.dto.MetodosPago
import com.cablera.app.data.repository.BoletasRepository
import com.cablera.app.data.repository.ClientesRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class RegistrarPagoUiState(
    val cargando: Boolean = true,
    val error: String? = null,
    val cliente: ClienteDto? = null,
    val cargos: List<CargoPendienteDto> = emptyList(),
    val seleccionados: Set<String> = emptySet(),
    val monto: String = "",
    val metodoPago: String = MetodosPago.EFECTIVO,
    val enviando: Boolean = false,
    val errorEnvio: String? = null,
)

class RegistrarPagoViewModel(
    val clienteId: String,
    private val clientesRepository: ClientesRepository,
    private val boletasRepository: BoletasRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(RegistrarPagoUiState())
    val uiState: StateFlow<RegistrarPagoUiState> = _uiState.asStateFlow()

    init {
        cargar()
    }

    private fun cargar() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(cargando = true, error = null)
            val clienteDeferred = async { clientesRepository.obtener(clienteId) }
            val cargosDeferred = async { clientesRepository.cargosPendientes(clienteId) }
            val clienteResult = clienteDeferred.await()
            val cargosResult = cargosDeferred.await()
            if (clienteResult.isFailure || cargosResult.isFailure) {
                _uiState.value = _uiState.value.copy(
                    cargando = false,
                    error = clienteResult.exceptionOrNull()?.message
                        ?: cargosResult.exceptionOrNull()?.message
                        ?: "No se pudo cargar el cliente",
                )
                return@launch
            }
            val cargos = cargosResult.getOrThrow()
            val todos = cargos.map { it.id }.toSet()
            _uiState.value = _uiState.value.copy(
                cargando = false,
                cliente = clienteResult.getOrThrow(),
                cargos = cargos,
                seleccionados = todos,
                monto = "%.2f".format(cargos.sumOf { it.saldo }),
            )
        }
    }

    fun toggleCargo(cargoId: String) {
        val estado = _uiState.value
        val nuevo = estado.seleccionados.toMutableSet()
        if (!nuevo.add(cargoId)) nuevo.remove(cargoId)
        val nuevoMonto = estado.cargos.filter { it.id in nuevo }.sumOf { it.saldo }
        _uiState.value = estado.copy(seleccionados = nuevo, monto = "%.2f".format(nuevoMonto))
    }

    fun onMontoChange(valor: String) {
        _uiState.value = _uiState.value.copy(monto = valor)
    }

    fun onMetodoChange(valor: String) {
        _uiState.value = _uiState.value.copy(metodoPago = valor)
    }

    fun registrar(onSuccess: (String) -> Unit) {
        val estado = _uiState.value
        val monto = estado.monto.toDoubleOrNull()
        if (monto == null || monto <= 0.0 || estado.seleccionados.isEmpty()) {
            _uiState.value = estado.copy(errorEnvio = "Selecciona al menos un cargo e ingresa un monto válido")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(enviando = true, errorEnvio = null)
            boletasRepository.registrarPago(
                clienteId = clienteId,
                cargoIds = estado.seleccionados.toList(),
                montoPagado = monto,
                metodoPago = estado.metodoPago,
            ).onSuccess { boletaId ->
                _uiState.value = _uiState.value.copy(enviando = false)
                onSuccess(boletaId)
            }.onFailure { e ->
                _uiState.value = _uiState.value.copy(enviando = false, errorEnvio = e.message ?: "No se pudo registrar el pago")
            }
        }
    }
}
