package com.cablera.app.ui.clientes

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.CreateClienteRequest
import com.cablera.app.data.remote.dto.ServicioContratadoInput
import com.cablera.app.data.remote.dto.TipoServicioDto
import com.cablera.app.data.remote.dto.ZonaDto
import com.cablera.app.data.repository.ClientesRepository
import com.cablera.app.data.repository.ConfiguracionRepository
import com.cablera.app.data.repository.ZonasRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ServicioFormRow(
    val tipoServicioId: String? = null,
    val montoBase: String = "",
    val facturacionPropia: Boolean = false,
    val diaFacturacion: String = "1",
)

data class ClienteNuevoUiState(
    val zonas: List<ZonaDto> = emptyList(),
    val tipos: List<TipoServicioDto> = emptyList(),
    val dni: String = "",
    val nombreCompleto: String = "",
    val telefono: String = "",
    val direccion: String = "",
    val zonaId: String? = null,
    val servicios: List<ServicioFormRow> = listOf(ServicioFormRow()),
    val guardando: Boolean = false,
    val error: String? = null,
)

class ClienteNuevoViewModel(
    private val clientesRepository: ClientesRepository,
    private val zonasRepository: ZonasRepository,
    private val configuracionRepository: ConfiguracionRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ClienteNuevoUiState())
    val uiState: StateFlow<ClienteNuevoUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            zonasRepository.listar().onSuccess { zonas ->
                _uiState.value = _uiState.value.copy(zonas = zonas, zonaId = _uiState.value.zonaId ?: zonas.firstOrNull()?.id)
            }
        }
        viewModelScope.launch {
            configuracionRepository.listarTiposServicio().onSuccess { tipos ->
                val actual = _uiState.value
                val servicios = actual.servicios.map { fila ->
                    if (fila.tipoServicioId == null) fila.copy(tipoServicioId = tipos.firstOrNull()?.id) else fila
                }
                _uiState.value = actual.copy(tipos = tipos, servicios = servicios)
            }
        }
    }

    fun onDniChange(v: String) { _uiState.value = _uiState.value.copy(dni = v) }
    fun onNombreChange(v: String) { _uiState.value = _uiState.value.copy(nombreCompleto = v, error = null) }
    fun onTelefonoChange(v: String) { _uiState.value = _uiState.value.copy(telefono = v) }
    fun onDireccionChange(v: String) { _uiState.value = _uiState.value.copy(direccion = v) }
    fun onZonaChange(v: String) { _uiState.value = _uiState.value.copy(zonaId = v) }

    fun agregarServicio() {
        val estado = _uiState.value
        val fila = ServicioFormRow(tipoServicioId = estado.tipos.firstOrNull()?.id)
        _uiState.value = estado.copy(servicios = estado.servicios + fila)
    }

    fun quitarServicio(index: Int) {
        val estado = _uiState.value
        if (estado.servicios.size <= 1) return
        _uiState.value = estado.copy(servicios = estado.servicios.filterIndexed { i, _ -> i != index })
    }

    private fun actualizarFila(index: Int, transformar: (ServicioFormRow) -> ServicioFormRow) {
        val estado = _uiState.value
        _uiState.value = estado.copy(
            servicios = estado.servicios.mapIndexed { i, fila -> if (i == index) transformar(fila) else fila },
            error = null,
        )
    }

    fun onServicioTipoChange(index: Int, tipoServicioId: String) = actualizarFila(index) { it.copy(tipoServicioId = tipoServicioId) }
    fun onServicioMontoChange(index: Int, monto: String) = actualizarFila(index) { it.copy(montoBase = monto) }
    fun onServicioFacturacionPropiaChange(index: Int, v: Boolean) = actualizarFila(index) { it.copy(facturacionPropia = v) }
    fun onServicioDiaChange(index: Int, v: String) = actualizarFila(index) { it.copy(diaFacturacion = v.filter(Char::isDigit).take(2)) }

    fun guardar(onSuccess: (String) -> Unit) {
        val estado = _uiState.value
        if (estado.nombreCompleto.isBlank() || estado.dni.isBlank() || estado.zonaId == null) {
            _uiState.value = estado.copy(error = "Completa nombre, DNI y zona")
            return
        }
        val filasValidas = estado.servicios.isNotEmpty() && estado.servicios.all { fila ->
            fila.tipoServicioId != null && (fila.montoBase.toDoubleOrNull()?.let { it >= 0 } == true)
        }
        if (!filasValidas) {
            _uiState.value = estado.copy(error = "Completa el tipo de servicio y un monto válido en cada servicio")
            return
        }
        val servicios = estado.servicios.map { fila ->
            ServicioContratadoInput(
                tipoServicioId = fila.tipoServicioId!!,
                montoBase = fila.montoBase.toDouble(),
                fechaFacturacionOverride = if (fila.facturacionPropia) fila.diaFacturacion.toIntOrNull()?.coerceIn(1, 28) else null,
            )
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(guardando = true, error = null)
            clientesRepository.crear(
                CreateClienteRequest(
                    dni = estado.dni.trim(),
                    nombreCompleto = estado.nombreCompleto.trim(),
                    telefono = estado.telefono.ifBlank { null },
                    direccion = estado.direccion.ifBlank { null },
                    zonaId = estado.zonaId,
                    servicios = servicios,
                ),
            )
                .onSuccess { cliente -> onSuccess(cliente.id) }
                .onFailure { e -> _uiState.value = _uiState.value.copy(guardando = false, error = e.message ?: "No se pudo crear el cliente") }
        }
    }
}
