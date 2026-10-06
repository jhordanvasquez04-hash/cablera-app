package com.cablera.app.ui.contratos

import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.cablera.app.ui.common.ClienteExistenteDialog
import com.cablera.app.LocalAppContainer
import com.cablera.app.data.remote.dto.ClienteDto
import com.cablera.app.data.remote.dto.TiposServicioRed
import com.cablera.app.ui.common.AppHeader
import com.cablera.app.ui.common.LambdaViewModelFactory
import com.cablera.app.ui.navigation.Routes

@Composable
fun ContratoNuevoScreen(
    navController: NavHostController,
    clienteIdFijo: String? = null,
    viewModel: ContratoNuevoViewModel = run {
        val container = LocalAppContainer.current
        viewModel(
            factory = LambdaViewModelFactory {
                ContratoNuevoViewModel(
                    clienteIdFijo,
                    container.clientesRepository,
                    container.contratosRepository,
                    container.planesRepository,
                )
            },
        )
    },
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            AppHeader(
                titulo = "Nuevo contrato",
                onBack = { navController.popBackStack() },
                actions = {
                    // Si se vino de "Crear cliente" (clienteIdFijo), esta es la única forma de
                    // salir sin crear un contrato ahora mismo — el back arrow iría a Home.
                    if (clienteIdFijo != null) {
                        TextButton(onClick = { navController.navigate(Routes.clienteFicha(clienteIdFijo)) { popUpTo(Routes.HOME) } }) {
                            Text("Omitir por ahora", color = Color.White)
                        }
                    }
                },
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(13.dp),
        ) {
            item { SeccionLabel("Datos del cliente") }
            item {
                val cliente = uiState.clienteSeleccionado
                if (cliente != null) {
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer), shape = RoundedCornerShape(10.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(12.dp)) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(cliente.nombreCompleto, style = MaterialTheme.typography.titleMedium)
                                Text(
                                    "${cliente.dni ?: "Sin DNI"} · ${cliente.contratos.size} contrato(s)",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSecondaryContainer,
                                )
                            }
                            if (!uiState.clienteFijo) {
                                IconButton(onClick = viewModel::quitarClienteSeleccionado) {
                                    Icon(Icons.Filled.Close, contentDescription = "Quitar")
                                }
                            }
                        }
                    }
                } else {
                    Column {
                        OutlinedTextField(
                            value = uiState.busquedaCliente,
                            onValueChange = viewModel::onBusquedaClienteChange,
                            label = { Text("Buscar por nombre, DNI o correo...") },
                            singleLine = true,
                            trailingIcon = { if (uiState.buscandoClientes) CircularProgressIndicator(modifier = Modifier.padding(8.dp)) },
                            modifier = Modifier.fillMaxWidth(),
                        )
                        if (uiState.resultadosBusqueda.isNotEmpty()) {
                            Card(modifier = Modifier.padding(top = 6.dp)) {
                                Column {
                                    uiState.resultadosBusqueda.forEach { resultado ->
                                        ResultadoClienteRow(resultado, onClick = { viewModel.seleccionarCliente(resultado) })
                                    }
                                }
                            }
                        } else if (uiState.busquedaCliente.isNotBlank() && !uiState.buscandoClientes) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween,
                                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                            ) {
                                Text("Sin resultados para \"${uiState.busquedaCliente}\"", style = MaterialTheme.typography.bodySmall)
                                TextButton(onClick = viewModel::abrirCrearCliente) { Text("Crear cliente") }
                            }
                        }
                        if (uiState.mostrarCrearCliente) {
                            CrearClienteInlineCard(uiState = uiState, viewModel = viewModel)
                        }
                    }
                }
            }

            if (uiState.clienteSeleccionado != null) {
                item { HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp)) }
                item { SeccionLabel("Datos del servicio") }
                item {
                    OutlinedTextField(
                        value = uiState.direccion,
                        onValueChange = viewModel::onDireccionChange,
                        label = { Text("Dirección") },
                        placeholder = { Text("Av. Larco 123") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                item {
                    OutlinedTextField(
                        value = uiState.referencia,
                        onValueChange = viewModel::onReferenciaChange,
                        label = { Text("Referencia") },
                        placeholder = { Text("Frente al parque") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                item {
                    OutlinedTextField(
                        value = uiState.sector,
                        onValueChange = viewModel::onSectorChange,
                        label = { Text("Sector") },
                        placeholder = { Text("Sector 4") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(
                            value = uiState.latitud,
                            onValueChange = viewModel::onLatitudChange,
                            label = { Text("Latitud (opcional)") },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            modifier = Modifier.weight(1f),
                        )
                        OutlinedTextField(
                            value = uiState.longitud,
                            onValueChange = viewModel::onLongitudChange,
                            label = { Text("Longitud (opcional)") },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
                item {
                    Column {
                        Text("Tipo de servicio", style = MaterialTheme.typography.labelSmall)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 6.dp)) {
                            TiposServicioRed.OPCIONES.forEach { (valor, etiqueta) ->
                                FilterChip(
                                    selected = uiState.tipoServicio == valor,
                                    onClick = { viewModel.onTipoServicioChange(valor) },
                                    label = { Text(etiqueta) },
                                )
                            }
                        }
                    }
                }
                if (uiState.planes.isNotEmpty()) {
                    item {
                        Column {
                            Text("Plan (autocompleta el monto, sigue editable)", style = MaterialTheme.typography.labelSmall)
                            var menuAbierto by remember { mutableStateOf(false) }
                            Box(modifier = Modifier.padding(top = 6.dp)) {
                                OutlinedButton(onClick = { menuAbierto = true }, modifier = Modifier.fillMaxWidth()) {
                                    val plan = uiState.planesFiltrados.find { it.id == uiState.planId }
                                    Text(plan?.let { "${it.tipoServicio.replaceFirstChar(Char::uppercase)} · ${it.nombre}${it.mbps?.let { m -> " · ${m}Mbps" } ?: ""} · S/ ${it.precio}" } ?: "Sin plan / manual")
                                }
                                DropdownMenu(expanded = menuAbierto, onDismissRequest = { menuAbierto = false }) {
                                    DropdownMenuItem(text = { Text("Sin plan / manual") }, onClick = { viewModel.onPlanChange(null); menuAbierto = false })
                                    if (uiState.planesFiltrados.isEmpty()) {
                                        DropdownMenuItem(text = { Text("Sin planes para este tipo de servicio", color = MaterialTheme.colorScheme.onSurfaceVariant) }, onClick = { menuAbierto = false }, enabled = false)
                                    }
                                    uiState.planesFiltrados.forEach { plan ->
                                        DropdownMenuItem(
                                            text = { Text("${plan.tipoServicio.replaceFirstChar(Char::uppercase)} · ${plan.nombre}${plan.mbps?.let { " · ${it}Mbps" } ?: ""} · S/ ${plan.precio}") },
                                            onClick = { viewModel.onPlanChange(plan.id); menuAbierto = false },
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
                item {
                    OutlinedTextField(
                        value = uiState.montoBase,
                        onValueChange = viewModel::onMontoChange,
                        label = { Text("Monto mensual (S/)") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                item {
                    OutlinedTextField(
                        value = uiState.diaCorte,
                        onValueChange = viewModel::onDiaCorteChange,
                        label = { Text("Día de corte (1-31)") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }

                if (uiState.error != null) {
                    item { Text(uiState.error ?: "", color = MaterialTheme.colorScheme.error) }
                }
                item {
                    Button(
                        onClick = {
                            viewModel.guardar { clienteId ->
                                navController.navigate(Routes.clienteFicha(clienteId)) {
                                    popUpTo(Routes.HOME)
                                }
                            }
                        },
                        enabled = !uiState.guardando,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(if (uiState.guardando) "Guardando..." else "Crear contrato")
                    }
                }
            }
        }
    }

    uiState.clienteDuplicado?.let { existente ->
        ClienteExistenteDialog(
            existente = existente,
            pregunta = "¿Quieres usarlo para este contrato?",
            textoConfirmar = "Usar este cliente",
            onConfirmar = viewModel::usarClienteDuplicado,
            onCancelar = viewModel::cerrarDuplicado,
        )
    }
}

@Composable
private fun ResultadoClienteRow(cliente: ClienteDto, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(cliente.nombreCompleto, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
        Text(cliente.dni ?: "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun CrearClienteInlineCard(uiState: ContratoNuevoUiState, viewModel: ContratoNuevoViewModel) {
    Card(modifier = Modifier.fillMaxWidth().padding(top = 8.dp), shape = RoundedCornerShape(10.dp)) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Crear nuevo cliente", style = MaterialTheme.typography.titleSmall)
            OutlinedTextField(
                value = uiState.nuevoClienteNombre,
                onValueChange = viewModel::onNuevoClienteNombreChange,
                label = { Text("Nombre completo") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = uiState.nuevoClienteDni,
                onValueChange = viewModel::onNuevoClienteDniChange,
                label = { Text("DNI") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = uiState.nuevoClienteTelefono,
                onValueChange = viewModel::onNuevoClienteTelefonoChange,
                label = { Text("Teléfono") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                modifier = Modifier.fillMaxWidth(),
            )
            if (uiState.errorCliente != null) {
                Text(uiState.errorCliente, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TextButton(onClick = viewModel::cerrarCrearCliente) { Text("Cancelar") }
                Button(onClick = viewModel::confirmarCrearCliente, enabled = !uiState.guardandoCliente) {
                    Text(if (uiState.guardandoCliente) "Creando..." else "Crear y seleccionar")
                }
            }
        }
    }
}

@Composable
private fun SeccionLabel(texto: String) {
    Text(texto, style = MaterialTheme.typography.titleMedium)
}
