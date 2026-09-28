package com.cablera.app.ui.tecnico

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.cablera.app.LocalAppContainer
import com.cablera.app.data.remote.dto.EstadosOrdenServicio
import com.cablera.app.data.remote.dto.OrdenServicioDto
import com.cablera.app.ui.common.AppHeader
import com.cablera.app.ui.common.EstadoChip
import com.cablera.app.ui.common.LambdaViewModelFactory
import com.cablera.app.ui.common.StateContent
import com.cablera.app.ui.common.coloresEstadoOrden
import com.cablera.app.util.formatFechaHora

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrdenTecnicoDetalleScreen(
    navController: NavHostController,
    ordenId: String,
    viewModel: OrdenTecnicoDetalleViewModel = run {
        val container = LocalAppContainer.current
        viewModel(factory = LambdaViewModelFactory { OrdenTecnicoDetalleViewModel(ordenId, container.ordenesTecnicoRepository) })
    },
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(topBar = { AppHeader(titulo = "Detalle de orden", onBack = { navController.popBackStack() }) }) { padding ->
        StateContent(state = uiState.orden, modifier = Modifier.padding(padding), onRetry = viewModel::cargar) { orden ->
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                CabeceraOrden(orden)
                DatosCliente(orden)
                if (orden.fechaAsignacion != null || orden.fechaInicio != null || orden.fechaFin != null) {
                    LineaDeTiempo(orden)
                }

                if (uiState.error != null) {
                    Text(uiState.error ?: "", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
                }

                when (orden.estado) {
                    EstadosOrdenServicio.ASIGNADA -> Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        if (orden.fechaAceptacion == null) {
                            OutlinedButton(onClick = viewModel::aceptar, enabled = !uiState.procesando) { Text("Aceptar") }
                        }
                        Button(onClick = viewModel::iniciar, enabled = !uiState.procesando) { Text("Iniciar trabajo") }
                    }
                    EstadosOrdenServicio.EN_PROCESO -> {
                        if (!uiState.mostrarFormularioCompletar) {
                            Button(onClick = viewModel::abrirFormularioCompletar, enabled = !uiState.procesando) { Text("Completar orden") }
                        } else {
                            FormularioCompletar(uiState = uiState, viewModel = viewModel)
                        }
                    }
                    else -> {} // completada / cancelada: sin acciones
                }
            }
        }
    }
}

@Composable
private fun CabeceraOrden(orden: OrdenServicioDto) {
    Card {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text(orden.nServicio, style = MaterialTheme.typography.titleLarge)
                EstadoChip(texto = orden.estado.replace("_", " "), colores = coloresEstadoOrden(orden.estado))
            }
            Text(orden.tipoOrden.replace("_", " ").replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.bodyMedium)
            Text(
                "Servicio: ${orden.tipoServicio}" + (orden.plan?.let { " · Plan: ${it.nombre}" } ?: ""),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun DatosCliente(orden: OrdenServicioDto) {
    Card {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("Cliente", style = MaterialTheme.typography.labelLarge)
            Text(orden.abonado, style = MaterialTheme.typography.bodyMedium)
            if (!orden.dni.isNullOrBlank()) Text("DNI: ${orden.dni}", style = MaterialTheme.typography.bodySmall)
            Text(orden.direccion, style = MaterialTheme.typography.bodySmall)
            if (!orden.referencia.isNullOrBlank()) Text("Ref: ${orden.referencia}", style = MaterialTheme.typography.bodySmall)
            if (!orden.celular.isNullOrBlank()) Text("Cel: ${orden.celular}", style = MaterialTheme.typography.bodySmall)
            if (!orden.observacion.isNullOrBlank()) {
                HorizontalDivider(modifier = Modifier.padding(vertical = 6.dp))
                Text("Observación: ${orden.observacion}", style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun LineaDeTiempo(orden: OrdenServicioDto) {
    Card {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("Seguimiento", style = MaterialTheme.typography.labelLarge)
            orden.fechaAsignacion?.let { Text("Asignada: ${formatFechaHora(it)}", style = MaterialTheme.typography.bodySmall) }
            orden.fechaAceptacion?.let { Text("Aceptada: ${formatFechaHora(it)}", style = MaterialTheme.typography.bodySmall) }
            orden.fechaInicio?.let { Text("Iniciada: ${formatFechaHora(it)}", style = MaterialTheme.typography.bodySmall) }
            orden.fechaFin?.let { Text("Completada: ${formatFechaHora(it)}", style = MaterialTheme.typography.bodySmall) }
            orden.tiempoInstalacionMin?.let { Text("Duración: $it min", style = MaterialTheme.typography.bodySmall) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FormularioCompletar(uiState: OrdenTecnicoDetalleUiState, viewModel: OrdenTecnicoDetalleViewModel) {
    Card {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Completar orden", style = MaterialTheme.typography.titleMedium)

            OutlinedTextField(
                value = uiState.observacionFinal,
                onValueChange = viewModel::onObservacionFinalChange,
                label = { Text("Observación final") },
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = uiState.precinto,
                onValueChange = viewModel::onPrecintoChange,
                label = { Text("Precinto (opcional)") },
                modifier = Modifier.fillMaxWidth(),
            )

            HorizontalDivider()
            Text("Materiales usados", style = MaterialTheme.typography.labelLarge)

            var menuAbierto by remember { mutableStateOf(false) }
            val disponibles = uiState.productos.filter { p -> uiState.consumos.none { it.productoId == p.id } }
            Row {
                OutlinedButton(onClick = { menuAbierto = true }, enabled = disponibles.isNotEmpty()) { Text("+ Agregar material") }
                DropdownMenu(expanded = menuAbierto, onDismissRequest = { menuAbierto = false }) {
                    disponibles.forEach { producto ->
                        DropdownMenuItem(
                            text = { Text(if (producto.esMedible) "${producto.nombre} (${producto.metrosDisponibles ?: 0} m)" else "${producto.nombre} (${producto.stockTotal} u)") },
                            onClick = {
                                viewModel.agregarConsumo(producto)
                                menuAbierto = false
                            },
                        )
                    }
                }
            }

            uiState.consumos.forEach { consumo ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    Text(consumo.nombre, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                    OutlinedTextField(
                        value = consumo.cantidadTexto,
                        onValueChange = { viewModel.onCantidadConsumoChange(consumo.productoId, it) },
                        label = { Text("Cant.") },
                        modifier = Modifier.width(90.dp),
                    )
                    OutlinedButton(onClick = { viewModel.quitarConsumo(consumo.productoId) }) { Text("Quitar") }
                }
            }

            if (uiState.error != null) {
                Text(uiState.error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(onClick = viewModel::completar, enabled = !uiState.procesando) {
                    Text(if (uiState.procesando) "Guardando..." else "Guardar y completar")
                }
                OutlinedButton(onClick = viewModel::cerrarFormularioCompletar, enabled = !uiState.procesando) { Text("Cancelar") }
            }
        }
    }
}
