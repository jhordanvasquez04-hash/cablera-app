package com.cablera.app.ui.tecnico

import androidx.compose.runtime.remember
import com.cablera.app.ui.common.ItemAnimado
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
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
import com.cablera.app.data.remote.dto.EstadosOrdenServicio
import com.cablera.app.data.remote.dto.OrdenServicioDto
import com.cablera.app.ui.common.AppHeader
import com.cablera.app.ui.common.EmptyState
import com.cablera.app.ui.common.EstadoChip
import com.cablera.app.ui.common.ETIQUETAS_TIPO_ORDEN
import com.cablera.app.ui.common.LambdaViewModelFactory
import com.cablera.app.ui.common.StateContent
import com.cablera.app.ui.common.coloresEstadoOrden
import com.cablera.app.ui.navigation.Routes
import com.cablera.app.ui.navigation.TecnicoBottomBar
import com.cablera.app.util.formatFechaCorta

private val filtros = listOf(
    EstadosOrdenServicio.ASIGNADA to "Asignadas",
    EstadosOrdenServicio.EN_PROCESO to "En proceso",
    EstadosOrdenServicio.COMPLETADA to "Completadas",
    EstadosOrdenServicio.CANCELADA to "Canceladas",
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrdenesTecnicoListScreen(
    navController: NavHostController,
    viewModel: OrdenesTecnicoListViewModel = run {
        val container = LocalAppContainer.current
        viewModel(factory = LambdaViewModelFactory { OrdenesTecnicoListViewModel(container.ordenesTecnicoRepository) })
    },
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    // Al volver de completar/aceptar una orden, refresca para que el cambio de estado se vea
    // sin salir y reentrar a la pestaña.
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        viewModel.cargar()
    }

    Scaffold(
        topBar = { AppHeader(titulo = "Mis órdenes") },
        bottomBar = { TecnicoBottomBar(navController) },
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp)) {
                item {
                    FilterChip(selected = uiState.filtroEstado == null, onClick = { viewModel.onFiltroEstadoChange(null) }, label = { Text("Todas") })
                }
                items(filtros) { (valor, etiqueta) ->
                    FilterChip(selected = uiState.filtroEstado == valor, onClick = { viewModel.onFiltroEstadoChange(valor) }, label = { Text(etiqueta) })
                }
            }

            StateContent(state = uiState.ordenes, onRetry = viewModel::cargar) { ordenes ->
                LazyColumn(
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 6.dp, bottom = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    if (ordenes.isEmpty()) {
                        item { EmptyState(mensaje = "No tienes órdenes con este filtro.", icon = Icons.Filled.Assignment) }
                    }
                    items(ordenes, key = { it.id }) { orden -> ItemAnimado {
                        OrdenCard(orden = orden, onClick = { navController.navigate(Routes.ordenTecnicoDetalle(orden.id)) })
                    }
                    }
                }
            }
        }
    }
}

@Composable
private fun OrdenCard(orden: OrdenServicioDto, onClick: () -> Unit) {
    Card(onClick = onClick, colors = CardDefaults.cardColors()) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text(orden.nServicio, style = MaterialTheme.typography.titleMedium)
                EstadoChip(texto = orden.estado.replace("_", " "), colores = coloresEstadoOrden(orden.estado))
            }
            Text(ETIQUETAS_TIPO_ORDEN[orden.tipoOrden] ?: orden.tipoOrden, style = MaterialTheme.typography.bodyMedium)
            Text(orden.abonado, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(orden.direccion, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(
                "Programada para ${formatFechaCorta(orden.fechaServicio)}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
    }
}
