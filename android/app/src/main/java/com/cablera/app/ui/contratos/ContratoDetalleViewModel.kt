package com.cablera.app.ui.contratos

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.CargoPendienteDto
import com.cablera.app.data.remote.dto.ContratoDto
import com.cablera.app.data.remote.dto.OrdenServicioDto
import com.cablera.app.data.repository.ClientesRepository
import com.cablera.app.data.repository.ContratosRepository
import com.cablera.app.ui.common.UiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** Lo que muestra la ficha del contrato: el contrato + sus cargos y servicios técnicos. */
data class FichaContrato(
    val contrato: ContratoDto,
    /** Meses que este contrato debe (pendientes o parciales), del más antiguo al más reciente. */
    val cargosPendientes: List<CargoPendienteDto> = emptyList(),
    val serviciosTecnicos: List<OrdenServicioDto> = emptyList(),
    /** false mientras se cargan (o si fallaron) cargos y servicios: la ficha se muestra igual. */
    val detalleCargado: Boolean = false,
)

class ContratoDetalleViewModel(
    private val contratoId: String,
    private val repo: ContratosRepository,
    private val clientesRepository: ClientesRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow<UiState<FichaContrato>>(UiState.Loading)
    val uiState: StateFlow<UiState<FichaContrato>> = _uiState.asStateFlow()

    init { cargar() }

    fun cargar() {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            repo.obtener(contratoId)
                .onSuccess { contrato ->
                    _uiState.value = UiState.Success(FichaContrato(contrato))
                    // Cargos y servicios técnicos vienen en la ficha del cliente: se filtran los de
                    // este contrato. Si falla, la ficha del contrato ya está en pantalla igual.
                    clientesRepository.ficha(contrato.clienteId).onSuccess { ficha ->
                        _uiState.value = UiState.Success(
                            FichaContrato(
                                contrato = contrato,
                                cargosPendientes = ficha.cargosMesAMes
                                    .filter { it.contratoId == contrato.id && it.estado in setOf("pendiente", "parcial") }
                                    .sortedWith(compareBy({ it.anio }, { it.mes })),
                                serviciosTecnicos = ficha.serviciosTecnicos.filter { it.contratoId == contrato.id },
                                detalleCargado = true,
                            ),
                        )
                    }
                }
                .onFailure { e -> _uiState.value = UiState.Error(e.message ?: "No se pudo cargar el contrato") }
        }
    }
}
