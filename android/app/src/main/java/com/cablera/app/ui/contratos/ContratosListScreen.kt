package com.cablera.app.ui.contratos

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Article
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.cablera.app.LocalAppContainer
import com.cablera.app.data.remote.dto.ContratoDto
import com.cablera.app.ui.common.AppHeader
import com.cablera.app.ui.common.EmptyState
import com.cablera.app.ui.common.EstadoChip
import com.cablera.app.ui.common.FiltroZonas
import com.cablera.app.ui.common.HeaderSearchField
import com.cablera.app.ui.common.LambdaViewModelFactory
import com.cablera.app.ui.common.StateContent
import com.cablera.app.ui.common.coloresEstadoOrden
import com.cablera.app.ui.common.pieDeLista
import com.cablera.app.ui.navigation.CableraBottomBar
import com.cablera.app.ui.navigation.Routes

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContratosListScreen(
    navController: NavHostController,
    viewModel: ContratosListViewModel = run {
        val container = LocalAppContainer.current
        viewModel(factory = LambdaViewModelFactory { ContratosListViewModel(container.contratosRepository) })
    },
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        viewModel.cargar()
    }

    Scaffold(
        topBar = {
            AppHeader(
                titulo = "Contratos",
                contenidoExtra = {
                    HeaderSearchField(
                        value = uiState.busqueda,
                        onValueChange = viewModel::onBusquedaChange,
                        placeholder = "Buscar por cliente, DNI, contrato o dirección",
                    )
                },
            )
        },
        bottomBar = { CableraBottomBar(navController) },
        floatingActionButton = {
            ExtendedFloatingActionButton(onClick = { navController.navigate(Routes.CONTRATO_NUEVO) }) {
                Icon(Icons.Filled.Add, contentDescription = null)
                Text("Nuevo contrato", modifier = Modifier.padding(start = 8.dp))
            }
        },
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            // El filtro por zonas solo aparece si la empresa usa sectores en sus contratos.
            if (uiState.sectores.isNotEmpty()) {
                FiltroZonas(
                    sectores = uiState.sectores,
                    seleccionado = uiState.filtroSector,
                    onSeleccionar = viewModel::onFiltroSectorChange,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                )
            }
            StateContent(state = uiState.contratos, onRetry = viewModel::cargar) { contratos ->
                LazyColumn(
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 88.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    if (contratos.isEmpty()) {
                        item { EmptyState(mensaje = "No hay contratos que coincidan.", icon = Icons.AutoMirrored.Filled.Article) }
                    }
                    items(contratos, key = { it.id }) { contrato ->
                        ContratoCard(contrato = contrato, onClick = { navController.navigate(Routes.contratoDetalle(contrato.id)) })
                    }
                    pieDeLista(hayMas = uiState.hayMas, cargandoMas = uiState.cargandoMas, onVerMas = viewModel::verMas)
                }
            }
        }
    }
}

@Composable
private fun ContratoCard(contrato: ContratoDto, onClick: () -> Unit) {
    Card(onClick = onClick) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text(contrato.clienteNombre, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f).padding(end = 8.dp))
                EstadoChip(texto = contrato.estado, colores = coloresEstadoOrden(if (contrato.estado == "activo") "completada" else contrato.estado))
            }
            Text("Contrato ${contrato.numero}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(contrato.tipoServicio.replaceFirstChar(Char::uppercase), style = MaterialTheme.typography.bodyMedium)
            if (!contrato.direccion.isNullOrBlank()) {
                Text(contrato.direccion, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
