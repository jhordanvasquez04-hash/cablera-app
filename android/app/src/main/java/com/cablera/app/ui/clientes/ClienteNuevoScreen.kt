package com.cablera.app.ui.clientes

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Card
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.cablera.app.LocalAppContainer
import com.cablera.app.ui.common.AppHeader
import com.cablera.app.ui.common.LambdaViewModelFactory
import com.cablera.app.ui.navigation.Routes

@Composable
fun ClienteNuevoScreen(
    navController: NavHostController,
    viewModel: ClienteNuevoViewModel = run {
        val container = LocalAppContainer.current
        viewModel(
            factory = LambdaViewModelFactory {
                ClienteNuevoViewModel(container.clientesRepository, container.zonasRepository, container.configuracionRepository)
            },
        )
    },
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = { AppHeader(titulo = "Nuevo cliente", onBack = { navController.popBackStack() }) },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(13.dp),
        ) {
            item {
                OutlinedTextField(
                    value = uiState.dni,
                    onValueChange = viewModel::onDniChange,
                    label = { Text("DNI") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            item {
                OutlinedTextField(
                    value = uiState.nombreCompleto,
                    onValueChange = viewModel::onNombreChange,
                    label = { Text("Nombre completo") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            item {
                OutlinedTextField(
                    value = uiState.telefono,
                    onValueChange = viewModel::onTelefonoChange,
                    label = { Text("Teléfono") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            item {
                OutlinedTextField(
                    value = uiState.direccion,
                    onValueChange = viewModel::onDireccionChange,
                    label = { Text("Dirección / referencia") },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            item {
                Column {
                    Text("Caserío", style = MaterialTheme.typography.labelSmall)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 6.dp)) {
                        uiState.zonas.forEach { zona ->
                            FilterChip(selected = uiState.zonaId == zona.id, onClick = { viewModel.onZonaChange(zona.id) }, label = { Text(zona.nombre) })
                        }
                    }
                }
            }
            item { Text("Servicios contratados", style = MaterialTheme.typography.titleMedium) }
            itemsIndexed(uiState.servicios) { index, fila ->
                Card(border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant), shape = RoundedCornerShape(12.dp)) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                            Text("Servicio ${index + 1}", style = MaterialTheme.typography.labelLarge)
                            if (uiState.servicios.size > 1) {
                                TextButton(onClick = { viewModel.quitarServicio(index) }) { Text("Quitar") }
                            }
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            uiState.tipos.forEach { tipo ->
                                FilterChip(
                                    selected = fila.tipoServicioId == tipo.id,
                                    onClick = { viewModel.onServicioTipoChange(index, tipo.id) },
                                    label = { Text(tipo.nombre.replaceFirstChar(Char::uppercase)) },
                                )
                            }
                        }
                        OutlinedTextField(
                            value = fila.montoBase,
                            onValueChange = { viewModel.onServicioMontoChange(index, it) },
                            label = { Text("Monto base mensual (S/)") },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Text("Fecha de facturación propia", style = MaterialTheme.typography.bodyMedium)
                            Switch(checked = fila.facturacionPropia, onCheckedChange = { viewModel.onServicioFacturacionPropiaChange(index, it) })
                        }
                        if (fila.facturacionPropia) {
                            OutlinedTextField(
                                value = fila.diaFacturacion,
                                onValueChange = { viewModel.onServicioDiaChange(index, it) },
                                label = { Text("Día del mes (1-28)") },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.fillMaxWidth(),
                            )
                        }
                    }
                }
            }
            item {
                TextButton(onClick = viewModel::agregarServicio) { Text("+ Agregar otro servicio") }
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
                    Text(if (uiState.guardando) "Guardando..." else "Crear cliente")
                }
            }
        }
    }
}
