package com.cablera.app.ui.servicios

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.cablera.app.LocalAppContainer
import com.cablera.app.ui.common.AppHeader
import com.cablera.app.ui.common.LambdaViewModelFactory
import com.cablera.app.util.formatFechaCorta
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneOffset

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ServicioNuevoScreen(
    navController: NavHostController,
    clienteIdFijo: String? = null,
    viewModel: ServicioNuevoViewModel = run {
        val container = LocalAppContainer.current
        viewModel(
            factory = LambdaViewModelFactory { ServicioNuevoViewModel(clienteIdFijo, container.serviciosTecnicosRepository, container.clientesRepository) },
        )
    },
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var mostrarDatePicker by remember { mutableStateOf(false) }

    Scaffold(
        topBar = { AppHeader(titulo = "Nuevo servicio", onBack = { navController.popBackStack() }) },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(13.dp),
        ) {
            item {
                var desplegado by remember { mutableStateOf(false) }
                val tipoSeleccionado = uiState.tipos.firstOrNull { it.id == uiState.tipoSeleccionadoId }
                ExposedDropdownMenuBox(expanded = desplegado, onExpandedChange = { desplegado = it }) {
                    OutlinedTextField(
                        value = tipoSeleccionado?.nombre ?: "",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Tipo de servicio") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = desplegado) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable),
                    )
                    ExposedDropdownMenu(expanded = desplegado, onDismissRequest = { desplegado = false }) {
                        uiState.tipos.forEach { tipo ->
                            DropdownMenuItem(
                                text = { Text(tipo.nombre) },
                                onClick = {
                                    viewModel.onTipoChange(tipo.id)
                                    desplegado = false
                                },
                            )
                        }
                    }
                }
            }

            item {
                if (uiState.clienteFijo) {
                    OutlinedTextField(
                        value = uiState.clienteNombre,
                        onValueChange = {},
                        label = { Text("Cliente") },
                        enabled = false,
                        modifier = Modifier.fillMaxWidth(),
                    )
                } else {
                    Column {
                        OutlinedTextField(
                            value = if (uiState.clienteId != null) uiState.clienteNombre else uiState.busquedaCliente,
                            onValueChange = viewModel::onBusquedaClienteChange,
                            label = { Text("Buscar por nombre, DNI, N° de contrato o teléfono") },
                            singleLine = true,
                            trailingIcon = { if (uiState.buscandoClientes) CircularProgressIndicator(modifier = Modifier.padding(8.dp)) },
                            modifier = Modifier.fillMaxWidth(),
                        )
                        if (uiState.errorBusquedaCliente != null) {
                            Text(uiState.errorBusquedaCliente ?: "", color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 6.dp))
                        }
                        if (uiState.clienteId == null && uiState.busquedaCliente.isNotBlank() && !uiState.buscandoClientes && uiState.resultadosClientes.isEmpty() && uiState.errorBusquedaCliente == null) {
                            Text("Sin resultados para \"${uiState.busquedaCliente}\".", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 6.dp))
                        }
                        uiState.resultadosClientes.forEach { cliente ->
                            Card(onClick = { viewModel.onSeleccionarCliente(cliente) }, modifier = Modifier.fillMaxWidth().padding(top = 6.dp)) {
                                Column(modifier = Modifier.padding(10.dp)) {
                                    Text(cliente.nombreCompleto)
                                    Text(
                                        "${cliente.numeroContrato}${cliente.dni?.let { " · DNI $it" } ?: ""}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                    }
                }
            }

            item {
                OutlinedTextField(
                    value = formatFechaCorta(OffsetDateTime.now().toString()),
                    onValueChange = {},
                    label = { Text("Fecha de creación") },
                    enabled = false,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            item {
                OutlinedTextField(
                    value = uiState.fechaProgramada,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Fecha programada (opcional)") },
                    trailingIcon = {
                        IconButton(onClick = { mostrarDatePicker = true }) {
                            Icon(Icons.Filled.CalendarMonth, contentDescription = "Elegir fecha")
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            item {
                OutlinedTextField(
                    value = uiState.tecnico,
                    onValueChange = viewModel::onTecnicoChange,
                    label = { Text("Técnico") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            if (uiState.datosPropios.isNotEmpty()) {
                item { Text("Datos propios del tipo", style = MaterialTheme.typography.labelSmall) }
                items(uiState.datosPropios.keys.toList()) { campo ->
                    OutlinedTextField(
                        value = uiState.datosPropios[campo] ?: "",
                        onValueChange = { viewModel.onCampoPropioChange(campo, it) },
                        label = { Text(campo) },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }

            item {
                OutlinedTextField(
                    value = uiState.comentario,
                    onValueChange = viewModel::onComentarioChange,
                    label = { Text("Comentario al iniciar (opcional)") },
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            if (uiState.error != null) {
                item { Text(uiState.error ?: "", color = MaterialTheme.colorScheme.error) }
            }

            item {
                Button(
                    onClick = { viewModel.guardar { navController.popBackStack() } },
                    enabled = !uiState.guardando,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(if (uiState.guardando) "Guardando..." else "Crear servicio")
                }
            }
        }
    }

    if (mostrarDatePicker) {
        val datePickerState = rememberDatePickerState()
        DatePickerDialog(
            onDismissRequest = { mostrarDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    datePickerState.selectedDateMillis?.let { millis ->
                        val fecha = Instant.ofEpochMilli(millis).atZone(ZoneOffset.UTC).toLocalDate()
                        viewModel.onFechaProgramadaChange(fecha.toString())
                    }
                    mostrarDatePicker = false
                }) { Text("Aceptar") }
            },
            dismissButton = {
                TextButton(onClick = { mostrarDatePicker = false }) { Text("Cancelar") }
            },
        ) {
            DatePicker(state = datePickerState)
        }
    }
}
