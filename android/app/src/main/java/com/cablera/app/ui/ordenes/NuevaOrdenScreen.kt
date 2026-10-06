package com.cablera.app.ui.ordenes

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
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.cablera.app.LocalAppContainer
import com.cablera.app.data.remote.dto.ClienteDto
import com.cablera.app.data.remote.dto.ContratoDto
import com.cablera.app.ui.common.AppHeader
import com.cablera.app.ui.common.ETIQUETAS_TIPO_ORDEN
import com.cablera.app.ui.common.LambdaViewModelFactory
import com.cablera.app.ui.navigation.Routes

@Composable
fun NuevaOrdenScreen(
    navController: NavHostController,
    contratoIdFijo: String? = null,
    clienteIdFijo: String? = null,
    viewModel: NuevaOrdenViewModel = run {
        val container = LocalAppContainer.current
        viewModel(
            factory = LambdaViewModelFactory {
                NuevaOrdenViewModel(
                    contratoIdFijo,
                    clienteIdFijo,
                    container.clientesRepository,
                    container.contratosRepository,
                    container.ordenesServicioRepository,
                    container.planesRepository,
                )
            },
        )
    },
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(topBar = { AppHeader(titulo = "Nuevo servicio técnico", onBack = { navController.popBackStack() }) }) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(13.dp),
        ) {
            item { Text("Cliente y contrato", style = MaterialTheme.typography.titleMedium) }
            item {
                val cliente = uiState.clienteSeleccionado
                val contrato = uiState.contratoSeleccionado
                when {
                    uiState.cargandoContrato -> CircularProgressIndicator()
                    contrato != null && (uiState.contratoFijo || cliente == null) -> ContratoElegido(contrato, null)
                    cliente != null -> ClienteElegido(cliente, onQuitar = viewModel::quitarCliente)
                    else -> BuscadorCliente(uiState, viewModel)
                }
            }
            // Cliente con varios contratos: se elige sobre cuál es la visita
            if (uiState.clienteSeleccionado != null && uiState.contratosDisponibles.size > 1) {
                item { Text("¿Sobre qué contrato?", style = MaterialTheme.typography.labelLarge) }
                items(uiState.contratosDisponibles.size) { i ->
                    val c = uiState.contratosDisponibles[i]
                    ContratoElegido(c, if (uiState.contratoSeleccionado?.id == c.id) "seleccionado" else null, onClick = { viewModel.elegirContrato(c) })
                }
            }
            if (uiState.clienteSeleccionado != null && uiState.contratosDisponibles.isEmpty()) {
                item { Text("Este cliente no tiene contratos vigentes.", color = MaterialTheme.colorScheme.error) }
            }

            if (uiState.contratoSeleccionado != null) {
                item { HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp)) }
                item { Text("Datos del servicio técnico", style = MaterialTheme.typography.titleMedium) }
                item {
                    Column {
                        Text("Tipo de servicio técnico", style = MaterialTheme.typography.labelSmall)
                        var menuAbierto by remember { mutableStateOf(false) }
                        Box(modifier = Modifier.padding(top = 6.dp)) {
                            OutlinedButton(onClick = { menuAbierto = true }, modifier = Modifier.fillMaxWidth()) {
                                Text(uiState.tipoOrden?.let { ETIQUETAS_TIPO_ORDEN[it] ?: it } ?: "Elegir tipo")
                            }
                            DropdownMenu(expanded = menuAbierto, onDismissRequest = { menuAbierto = false }) {
                                uiState.tiposDisponibles.forEach { tipo ->
                                    DropdownMenuItem(
                                        text = { Text(ETIQUETAS_TIPO_ORDEN[tipo] ?: tipo) },
                                        onClick = { viewModel.onTipoOrdenChange(tipo); menuAbierto = false },
                                    )
                                }
                            }
                        }
                    }
                }
                if (uiState.permitePlan) {
                    item { SeccionPlan(uiState, viewModel) }
                } else if (uiState.contratoSeleccionado?.planNombre != null) {
                    item {
                        Text(
                            "Plan actual: ${uiState.contratoSeleccionado?.planNombre}. El plan solo se cambia en instalación, cambio de plan o reconexión.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                if (uiState.requiereRed) {
                    item { SeccionRed(uiState, viewModel) }
                }
                item {
                    OutlinedTextField(
                        value = uiState.abonado, onValueChange = viewModel::onAbonadoChange,
                        label = { Text("Abonado") }, singleLine = true, modifier = Modifier.fillMaxWidth(),
                    )
                }
                item {
                    OutlinedTextField(
                        value = uiState.dni, onValueChange = viewModel::onDniChange,
                        label = { Text("DNI / RUC") }, singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth(),
                    )
                }
                item {
                    OutlinedTextField(
                        value = uiState.celular, onValueChange = viewModel::onCelularChange,
                        label = { Text("Celular") }, singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone), modifier = Modifier.fillMaxWidth(),
                    )
                }
                item {
                    OutlinedTextField(
                        value = uiState.direccion, onValueChange = viewModel::onDireccionChange,
                        label = { Text("Dirección de la visita") }, modifier = Modifier.fillMaxWidth(),
                    )
                }
                item {
                    OutlinedTextField(
                        value = uiState.referencia, onValueChange = viewModel::onReferenciaChange,
                        label = { Text("Referencia") }, modifier = Modifier.fillMaxWidth(),
                    )
                }
                item {
                    OutlinedTextField(
                        value = uiState.observacion, onValueChange = viewModel::onObservacionChange,
                        label = { Text("Observación (qué reporta el cliente)") }, minLines = 2, modifier = Modifier.fillMaxWidth(),
                    )
                }
                item {
                    Column {
                        Text("Técnico (opcional)", style = MaterialTheme.typography.labelSmall)
                        var menuTecnico by remember { mutableStateOf(false) }
                        Box(modifier = Modifier.padding(top = 6.dp)) {
                            OutlinedButton(onClick = { menuTecnico = true }, modifier = Modifier.fillMaxWidth()) {
                                val t = uiState.tecnicos.find { it.id == uiState.tecnicoId }
                                Text(t?.let { "${it.nombre} ${it.apellido}" } ?: "Sin asignar todavía")
                            }
                            DropdownMenu(expanded = menuTecnico, onDismissRequest = { menuTecnico = false }) {
                                DropdownMenuItem(text = { Text("Sin asignar todavía") }, onClick = { viewModel.onTecnicoChange(null); menuTecnico = false })
                                uiState.tecnicos.forEach { t ->
                                    DropdownMenuItem(
                                        text = { Text("${t.nombre} ${t.apellido}") },
                                        onClick = { viewModel.onTecnicoChange(t.id); menuTecnico = false },
                                    )
                                }
                            }
                        }
                    }
                }
                if (uiState.error != null) {
                    item { Text(uiState.error ?: "", color = MaterialTheme.colorScheme.error) }
                }
                item {
                    Button(
                        onClick = {
                            viewModel.guardar { ordenId ->
                                navController.navigate(Routes.ordenServicioDetalle(ordenId)) {
                                    popUpTo(Routes.ORDENES_SERVICIO)
                                }
                            }
                        },
                        enabled = !uiState.guardando,
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text(if (uiState.guardando) "Creando..." else "Crear servicio técnico") }
                }
            } else if (uiState.error != null) {
                item { Text(uiState.error ?: "", color = MaterialTheme.colorScheme.error) }
            }
        }
    }
}

/** Plan nuevo (se copian sus Mbps y precio), velocidad y mensualidad — como el formulario de la web. */
@Composable
private fun SeccionPlan(uiState: NuevaOrdenUiState, viewModel: NuevaOrdenViewModel) {
    val esCambio = uiState.tipoOrden == "cambio_plan"
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(if (esCambio) "Plan nuevo" else "Plan", style = MaterialTheme.typography.labelSmall)
        var menuPlan by remember { mutableStateOf(false) }
        Box {
            OutlinedButton(onClick = { menuPlan = true }, modifier = Modifier.fillMaxWidth()) {
                Text(uiState.planSeleccionado?.nombre ?: if (esCambio) "Elegir el nuevo plan" else "Sin plan")
            }
            DropdownMenu(expanded = menuPlan, onDismissRequest = { menuPlan = false }) {
                if (!esCambio) DropdownMenuItem(text = { Text("Sin plan") }, onClick = { viewModel.onPlanChange(null); menuPlan = false })
                uiState.planes.forEach { plan ->
                    DropdownMenuItem(
                        text = { Text("${plan.nombre} · S/ ${"%.2f".format(java.util.Locale.US, plan.precio)}") },
                        onClick = { viewModel.onPlanChange(plan); menuPlan = false },
                    )
                }
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedTextField(
                value = uiState.mbps, onValueChange = viewModel::onMbpsChange,
                label = { Text("Mbps") }, singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.weight(1f),
            )
            OutlinedTextField(
                value = uiState.mensualidad, onValueChange = viewModel::onMensualidadChange,
                label = { Text("Mensualidad (S/)") }, singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.weight(1f),
            )
        }
        if (esCambio) {
            Text(
                "Al completar la orden, el contrato pasa al plan y la mensualidad nuevos.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

/** IP WAN, máscara, gateway y PPPoE (servicios con Internet). Deben ser únicos; el servidor los valida. */
@Composable
private fun SeccionRed(uiState: NuevaOrdenUiState, viewModel: NuevaOrdenViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Datos de red", style = MaterialTheme.typography.labelSmall)
        OutlinedTextField(
            value = uiState.ipWan, onValueChange = viewModel::onIpWanChange,
            label = { Text("IP WAN") }, singleLine = true, modifier = Modifier.fillMaxWidth(),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedTextField(
                value = uiState.mascara, onValueChange = viewModel::onMascaraChange,
                label = { Text("Máscara") }, singleLine = true, modifier = Modifier.weight(1f),
            )
            OutlinedTextField(
                value = uiState.gateway, onValueChange = viewModel::onGatewayChange,
                label = { Text("Gateway") }, singleLine = true, modifier = Modifier.weight(1f),
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedTextField(
                value = uiState.pppoeUsuario, onValueChange = viewModel::onPppoeUsuarioChange,
                label = { Text("Usuario PPPoE") }, singleLine = true, modifier = Modifier.weight(1f),
            )
            OutlinedTextField(
                value = uiState.pppoePassword, onValueChange = viewModel::onPppoePasswordChange,
                label = { Text("Contraseña PPPoE") }, singleLine = true, modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun BuscadorCliente(uiState: NuevaOrdenUiState, viewModel: NuevaOrdenViewModel) {
    Column {
        OutlinedTextField(
            value = uiState.busquedaCliente,
            onValueChange = viewModel::onBusquedaClienteChange,
            label = { Text("Buscar cliente por nombre, DNI o correo...") },
            singleLine = true,
            trailingIcon = { if (uiState.buscandoClientes) CircularProgressIndicator(modifier = Modifier.padding(8.dp)) },
            modifier = Modifier.fillMaxWidth(),
        )
        if (uiState.resultadosBusqueda.isNotEmpty()) {
            Card(modifier = Modifier.padding(top = 6.dp)) {
                Column {
                    uiState.resultadosBusqueda.forEach { cliente ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { viewModel.seleccionarCliente(cliente) }
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(cliente.nombreCompleto, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                            Text(cliente.dni ?: "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        } else if (uiState.busquedaCliente.isNotBlank() && !uiState.buscandoClientes) {
            Text("Sin resultados para \"${uiState.busquedaCliente}\"", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 8.dp))
        }
    }
}

@Composable
private fun ClienteElegido(cliente: ClienteDto, onQuitar: () -> Unit) {
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
            IconButton(onClick = onQuitar) { Icon(Icons.Filled.Close, contentDescription = "Quitar") }
        }
    }
}

@Composable
private fun ContratoElegido(contrato: ContratoDto, marca: String?, onClick: (() -> Unit)? = null) {
    Card(
        onClick = onClick ?: {},
        enabled = onClick != null,
        colors = CardDefaults.cardColors(
            containerColor = if (marca != null || onClick == null) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surfaceVariant,
        ),
        shape = RoundedCornerShape(10.dp),
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(12.dp)) {
            Text(contrato.clienteNombre, style = MaterialTheme.typography.titleMedium)
            Text(
                "Contrato ${contrato.numero} · ${contrato.tipoServicio.replaceFirstChar(Char::uppercase)}" +
                    (marca?.let { " · ✓" } ?: ""),
                style = MaterialTheme.typography.bodySmall,
            )
            if (!contrato.direccion.isNullOrBlank()) Text(contrato.direccion, style = MaterialTheme.typography.bodySmall)
        }
    }
}
