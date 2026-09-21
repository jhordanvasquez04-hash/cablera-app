package com.cablera.app.ui.servicios

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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Build
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import com.cablera.app.data.remote.dto.EstadosServicioTecnico
import com.cablera.app.data.remote.dto.ServicioTecnicoDto
import com.cablera.app.ui.common.AppHeader
import com.cablera.app.ui.common.EmptyState
import com.cablera.app.ui.common.EstadoChip
import com.cablera.app.ui.common.LambdaViewModelFactory
import com.cablera.app.ui.common.StateContent
import com.cablera.app.ui.common.coloresEstadoCargo
import com.cablera.app.ui.navigation.CableraBottomBar
import com.cablera.app.ui.navigation.Routes
import com.cablera.app.util.formatFechaCorta

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ServiciosListScreen(
    navController: NavHostController,
    viewModel: ServiciosListViewModel = run {
        val container = LocalAppContainer.current
        viewModel(factory = LambdaViewModelFactory { ServiciosListViewModel(container.serviciosTecnicosRepository) })
    },
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    // Al volver de "Nuevo servicio" (o de cualquier pantalla empujada encima), refresca la lista
    // para que el servicio recién creado aparezca sin tener que salir y reentrar a esta pestaña.
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        viewModel.cargar()
    }

    Scaffold(
        topBar = { AppHeader(titulo = "Servicios técnicos") },
        bottomBar = { CableraBottomBar(navController) },
        floatingActionButton = {
            FloatingActionButton(onClick = { navController.navigate(Routes.SERVICIO_NUEVO) }) {
                Icon(Icons.Filled.Add, contentDescription = "Nuevo servicio")
            }
        },
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp)) {
                item {
                    FilterChip(selected = uiState.filtroEstado == null, onClick = { viewModel.onFiltroEstadoChange(null) }, label = { Text("Todos") })
                }
                items(EstadosServicioTecnico.OPCIONES) { (valor, etiqueta) ->
                    FilterChip(selected = uiState.filtroEstado == valor, onClick = { viewModel.onFiltroEstadoChange(valor) }, label = { Text(etiqueta) })
                }
            }

            StateContent(state = uiState.servicios, onRetry = viewModel::cargar) { servicios ->
                LazyColumn(
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 96.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    if (servicios.isEmpty()) {
                        item { EmptyState(mensaje = "No hay servicios técnicos con este filtro.", icon = Icons.Filled.Build) }
                    }
                    items(servicios, key = { it.id }) { servicio ->
                        ServicioCard(
                            servicio = servicio,
                            procesando = uiState.dialogoId == servicio.id && uiState.enviandoDialogo,
                            onComentar = { viewModel.abrirComentar(servicio.id) },
                            onLiquidar = { viewModel.abrirLiquidar(servicio.id) },
                        )
                    }
                }
            }
        }
    }

    if (uiState.dialogoAccion != null) {
        val esLiquidar = uiState.dialogoAccion == AccionServicio.LIQUIDAR
        AlertDialog(
            onDismissRequest = viewModel::cerrarDialogo,
            title = { Text(if (esLiquidar) "Liquidar servicio" else "Comentar", style = MaterialTheme.typography.titleLarge) },
            text = {
                Column {
                    OutlinedTextField(
                        value = uiState.textoDialogo,
                        onValueChange = viewModel::onTextoDialogoChange,
                        label = { Text(if (esLiquidar) "Comentario al terminar (opcional)" else "Comentario") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    val errorDialogo = uiState.errorDialogo
                    if (errorDialogo != null) {
                        Text(
                            errorDialogo,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(top = 8.dp),
                        )
                    }
                }
            },
            confirmButton = {
                Button(onClick = viewModel::confirmar, enabled = !uiState.enviandoDialogo) {
                    Text(if (uiState.enviandoDialogo) "Guardando..." else if (esLiquidar) "Liquidar" else "Guardar")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = viewModel::cerrarDialogo) { Text("Cancelar") }
            },
        )
    }
}

@Composable
private fun ServicioCard(servicio: ServicioTecnicoDto, procesando: Boolean, onComentar: () -> Unit, onLiquidar: () -> Unit) {
    Card {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text(servicio.folio, style = MaterialTheme.typography.titleMedium)
                EstadoChip(texto = servicio.estado.replace("_", " "), colores = coloresEstadoCargo(if (servicio.estado == "liquidado") "pagado" else "pendiente"))
            }
            Text(servicio.tipo, style = MaterialTheme.typography.bodyMedium)
            Text(servicio.cliente.nombreCompleto, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(
                "Creado ${formatFechaCorta(servicio.fechaCreacion)}" +
                    (servicio.fechaLiquidacion?.let { " · Liquidado ${formatFechaCorta(it)}" } ?: ""),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (!servicio.comentario.isNullOrBlank()) {
                Text("Al iniciar: ${servicio.comentario}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
            }
            if (!servicio.comentarioFinal.isNullOrBlank()) {
                Text("Al terminar: ${servicio.comentarioFinal}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 2.dp))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 10.dp)) {
                OutlinedButton(onClick = onComentar, enabled = !procesando) { Text("Comentar") }
                if (servicio.estado != EstadosServicioTecnico.LIQUIDADO) {
                    Button(onClick = onLiquidar, enabled = !procesando) { Text("Liquidar") }
                }
            }
        }
    }
}
