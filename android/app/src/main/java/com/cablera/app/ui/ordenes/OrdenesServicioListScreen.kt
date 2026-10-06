package com.cablera.app.ui.ordenes

import com.cablera.app.ui.common.ItemAnimado
import androidx.compose.foundation.layout.Arrangement
import com.cablera.app.ui.theme.MonoStyles
import com.cablera.app.ui.theme.CableraNeutral
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material.icons.filled.Engineering
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.background
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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
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
import com.cablera.app.ui.common.ETIQUETAS_TIPO_ORDEN
import com.cablera.app.ui.common.EstadoChip
import com.cablera.app.ui.common.HeaderSearchField
import com.cablera.app.ui.common.pieDeLista
import com.cablera.app.ui.common.LambdaViewModelFactory
import com.cablera.app.ui.common.StateContent
import com.cablera.app.ui.common.coloresEstadoOrden
import com.cablera.app.ui.navigation.Routes
import com.cablera.app.util.formatFechaCorta

private val filtros = listOf(
    EstadosOrdenServicio.PENDIENTE to "Pendientes",
    EstadosOrdenServicio.ASIGNADA to "Asignadas",
    EstadosOrdenServicio.EN_PROCESO to "En proceso",
    EstadosOrdenServicio.COMPLETADA to "Completadas",
    EstadosOrdenServicio.CANCELADA to "Canceladas",
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrdenesServicioListScreen(
    navController: NavHostController,
    onBack: () -> Unit,
    viewModel: OrdenesServicioListViewModel = run {
        val container = LocalAppContainer.current
        viewModel(factory = LambdaViewModelFactory { OrdenesServicioListViewModel(container.ordenesServicioRepository) })
    },
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        viewModel.cargar()
    }

    Scaffold(
        topBar = {
            AppHeader(
                titulo = "Servicios técnicos",
                onBack = onBack,
                contenidoExtra = {
                    HeaderSearchField(
                        value = uiState.busqueda,
                        onValueChange = viewModel::onBusquedaChange,
                        placeholder = "Buscar por número, abonado, DNI o dirección",
                    )
                },
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(onClick = { navController.navigate(Routes.nuevaOrden()) }) {
                Icon(Icons.Filled.Add, contentDescription = null)
                Text("Nuevo servicio", modifier = Modifier.padding(start = 8.dp))
            }
        },
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
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 6.dp, bottom = 88.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    if (ordenes.isEmpty()) {
                        item { EmptyState(mensaje = "No hay servicios técnicos con este filtro.", icon = Icons.Filled.Assignment) }
                    }
                    items(ordenes, key = { it.id }) { orden -> ItemAnimado {
                        OrdenCard(orden = orden, onClick = { navController.navigate(Routes.ordenServicioDetalle(orden.id)) })
                    }
                    }
                    pieDeLista(hayMas = uiState.hayMas, cargandoMas = uiState.cargandoMas, onVerMas = viewModel::verMas)
                }
            }
        }
    }
}

@Composable
private fun OrdenCard(orden: OrdenServicioDto, onClick: () -> Unit) {
    val colores = coloresEstadoOrden(orden.estado)
    Card(onClick = onClick, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
        Row(modifier = Modifier.height(IntrinsicSize.Min)) {
            // Franja con el color del estado: se distingue de un vistazo qué está pendiente, en marcha o cerrado.
            Box(modifier = Modifier.width(6.dp).fillMaxHeight().background(colores.texto))
            Column(modifier = Modifier.weight(1f).padding(14.dp)) {
                Row(horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                    Text(orden.nServicio, style = MonoStyles.Body, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    EstadoChip(texto = orden.estado.replace("_", " "), colores = colores)
                }
                Text(
                    ETIQUETAS_TIPO_ORDEN[orden.tipoOrden] ?: orden.tipoOrden,
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(top = 6.dp),
                )
                Text(orden.abonado, style = MaterialTheme.typography.bodyMedium)
                Text(
                    orden.direccion,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                HorizontalDivider(modifier = Modifier.padding(vertical = 10.dp), color = MaterialTheme.colorScheme.outlineVariant)
                Row(horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                        Icon(Icons.Filled.Engineering, contentDescription = null, tint = CableraNeutral, modifier = Modifier.size(16.dp))
                        Text(
                            orden.tecnico?.let { "${it.nombre} ${it.apellido}" } ?: "Sin asignar",
                            style = MaterialTheme.typography.bodySmall,
                            color = if (orden.tecnico == null) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.padding(start = 6.dp),
                        )
                    }
                    Text(formatFechaCorta(orden.fechaServicio), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}
