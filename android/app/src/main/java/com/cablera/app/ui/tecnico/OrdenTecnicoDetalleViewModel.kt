package com.cablera.app.ui.tecnico

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.CompletarOrdenRequest
import com.cablera.app.data.remote.dto.ConsumoItemRequest
import com.cablera.app.data.remote.dto.OrdenServicioDto
import com.cablera.app.data.remote.dto.ProductoPortalDto
import com.cablera.app.data.repository.OrdenesTecnicoRepository
import com.cablera.app.ui.common.UiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ConsumoUi(val productoId: String, val nombre: String, val cantidadTexto: String)

data class OrdenTecnicoDetalleUiState(
    val orden: UiState<OrdenServicioDto> = UiState.Loading,
    val productos: List<ProductoPortalDto> = emptyList(),
    val procesando: Boolean = false,
    val error: String? = null,
    val mostrarFormularioCompletar: Boolean = false,
    val observacionFinal: String = "",
    val precinto: String = "",
    val consumos: List<ConsumoUi> = emptyList(),
)

class OrdenTecnicoDetalleViewModel(
    private val ordenId: String,
    private val repo: OrdenesTecnicoRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(OrdenTecnicoDetalleUiState())
    val uiState: StateFlow<OrdenTecnicoDetalleUiState> = _uiState.asStateFlow()

    init {
        cargar()
        viewModelScope.launch {
            repo.listarProductos().onSuccess { productos -> _uiState.value = _uiState.value.copy(productos = productos) }
        }
    }

    fun cargar() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(orden = UiState.Loading)
            repo.obtener(ordenId)
                .onSuccess { data -> _uiState.value = _uiState.value.copy(orden = UiState.Success(data)) }
                .onFailure { e -> _uiState.value = _uiState.value.copy(orden = UiState.Error(e.message ?: "No se pudo cargar la orden")) }
        }
    }

    fun aceptar() = ejecutar { repo.aceptar(ordenId) }

    fun iniciar() = ejecutar { repo.iniciar(ordenId) }

    fun abrirFormularioCompletar() {
        _uiState.value = _uiState.value.copy(mostrarFormularioCompletar = true)
    }

    fun cerrarFormularioCompletar() {
        _uiState.value = _uiState.value.copy(mostrarFormularioCompletar = false)
    }

    fun onObservacionFinalChange(v: String) { _uiState.value = _uiState.value.copy(observacionFinal = v) }
    fun onPrecintoChange(v: String) { _uiState.value = _uiState.value.copy(precinto = v) }

    fun agregarConsumo(producto: ProductoPortalDto) {
        val actuales = _uiState.value.consumos
        if (actuales.any { it.productoId == producto.id }) return
        _uiState.value = _uiState.value.copy(consumos = actuales + ConsumoUi(producto.id, producto.nombre, ""))
    }

    fun quitarConsumo(productoId: String) {
        _uiState.value = _uiState.value.copy(consumos = _uiState.value.consumos.filterNot { it.productoId == productoId })
    }

    fun onCantidadConsumoChange(productoId: String, cantidad: String) {
        _uiState.value = _uiState.value.copy(
            consumos = _uiState.value.consumos.map { if (it.productoId == productoId) it.copy(cantidadTexto = cantidad) else it },
        )
    }

    fun completar() {
        val estado = _uiState.value
        val consumosValidos = estado.consumos.mapNotNull { c ->
            val cantidad = c.cantidadTexto.toDoubleOrNull()
            if (cantidad != null && cantidad > 0) ConsumoItemRequest(c.productoId, cantidad) else null
        }
        if (consumosValidos.size != estado.consumos.size) {
            _uiState.value = estado.copy(error = "Revisa las cantidades de los materiales — todas deben ser mayores a 0")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(procesando = true, error = null)
            repo.completar(
                ordenId,
                CompletarOrdenRequest(
                    observacionFinal = estado.observacionFinal.trim().ifBlank { null },
                    precinto = estado.precinto.trim().ifBlank { null },
                    consumos = consumosValidos.ifEmpty { null },
                ),
            )
                .onSuccess { data ->
                    _uiState.value = _uiState.value.copy(
                        procesando = false,
                        orden = UiState.Success(data),
                        mostrarFormularioCompletar = false,
                    )
                }
                .onFailure { e -> _uiState.value = _uiState.value.copy(procesando = false, error = e.message ?: "No se pudo completar la orden") }
        }
    }

    private fun ejecutar(accion: suspend () -> Result<OrdenServicioDto>) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(procesando = true, error = null)
            accion()
                .onSuccess { data -> _uiState.value = _uiState.value.copy(procesando = false, orden = UiState.Success(data)) }
                .onFailure { e -> _uiState.value = _uiState.value.copy(procesando = false, error = e.message ?: "No se pudo actualizar la orden") }
        }
    }
}
