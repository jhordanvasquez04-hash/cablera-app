package com.cablera.app.ui.clientes

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
import androidx.compose.material.icons.filled.People
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.cablera.app.LocalAppContainer
import com.cablera.app.data.remote.dto.ClienteDto
import com.cablera.app.ui.common.AppHeader
import com.cablera.app.ui.common.EmptyState
import com.cablera.app.ui.common.EstadoChip
import com.cablera.app.ui.common.HeaderSearchField
import com.cablera.app.ui.common.LambdaViewModelFactory
import com.cablera.app.ui.common.StateContent
import com.cablera.app.ui.common.coloresEstadoServicio
import com.cablera.app.ui.navigation.CableraBottomBar
import com.cablera.app.ui.navigation.Routes
import com.cablera.app.ui.theme.MonoStyles
import com.cablera.app.util.formatMoney

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientesListScreen(
    navController: NavHostController,
    viewModel: ClientesListViewModel = run {
        val container = LocalAppContainer.current
        viewModel(
            factory = LambdaViewModelFactory {
                ClientesListViewModel(container.clientesRepository, container.zonasRepository)
            },
        )
    },
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    // Refresca al volver de la ficha de un cliente (ej. tras editarlo o darlo de baja), para que
    // esta lista no quede mostrando datos viejos.
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        viewModel.cargarClientes()
    }

    Scaffold(
        topBar = {
            AppHeader(
                titulo = "Clientes",
                contenidoExtra = {
                    HeaderSearchField(
                        value = uiState.busqueda,
                        onValueChange = viewModel::onBusquedaChange,
                        placeholder = "Nombre, DNI, teléfono o caserío",
                    )
                },
            )
        },
        bottomBar = { CableraBottomBar(navController) },
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
            ) {
                item {
                    FilterChip(
                        selected = uiState.filtroZonaId == null,
                        onClick = { viewModel.onFiltroZonaChange(null) },
                        label = { Text("Todas las zonas") },
                    )
                }
                items(uiState.zonas) { zona ->
                    FilterChip(
                        selected = uiState.filtroZonaId == zona.id,
                        onClick = { viewModel.onFiltroZonaChange(zona.id) },
                        label = { Text(zona.nombre) },
                    )
                }
            }

            StateContent(state = uiState.clientes, onRetry = viewModel::cargarClientes) { clientes ->
                LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    if (clientes.isEmpty()) {
                        item { EmptyState(mensaje = "No hay clientes que coincidan.", icon = Icons.Filled.People) }
                    }
                    items(clientes, key = { it.id }) { cliente ->
                        ClienteRow(cliente = cliente, onClick = { navController.navigate(Routes.clienteFicha(cliente.id)) })
                    }
                }
            }
        }
    }
}

@Composable
private fun ClienteRow(cliente: ClienteDto, onClick: () -> Unit) {
    Card(onClick = onClick) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Text(
                    cliente.nombreCompleto,
                    style = MaterialTheme.typography.titleLarge,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f).padding(end = 8.dp),
                )
                EstadoChip(texto = cliente.estadoServicio, colores = coloresEstadoServicio(cliente.estadoServicio))
            }
            Text(
                "${cliente.zona.nombre}${cliente.direccion?.let { " · $it" } ?: ""}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth().padding(top = 6.dp)) {
                Text(formatMoney(cliente.montoEfectivo), style = MonoStyles.Body)
                if (cliente.deudaTotal > 0) {
                    Text("Deuda: ${formatMoney(cliente.deudaTotal)}", style = MonoStyles.Body, color = MaterialTheme.colorScheme.error)
                }
            }
        }
    }
}
