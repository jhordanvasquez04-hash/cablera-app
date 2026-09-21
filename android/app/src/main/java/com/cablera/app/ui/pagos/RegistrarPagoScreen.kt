package com.cablera.app.ui.pagos

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.cablera.app.LocalAppContainer
import com.cablera.app.data.remote.dto.CargoPendienteDto
import com.cablera.app.data.remote.dto.MetodosPago
import com.cablera.app.ui.common.AppHeader
import com.cablera.app.ui.common.ErrorBox
import com.cablera.app.ui.common.LambdaViewModelFactory
import com.cablera.app.ui.common.LoadingBox
import com.cablera.app.ui.common.coloresEstadoCargo
import com.cablera.app.ui.common.EstadoChip
import com.cablera.app.ui.theme.MonoStyles
import com.cablera.app.util.formatMoney
import com.cablera.app.util.nombreMes

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegistrarPagoScreen(
    navController: NavHostController,
    clienteId: String,
    onPagoRegistrado: (String) -> Unit,
    viewModel: RegistrarPagoViewModel = run {
        val container = LocalAppContainer.current
        viewModel(
            factory = LambdaViewModelFactory {
                RegistrarPagoViewModel(clienteId, container.clientesRepository, container.boletasRepository)
            },
        )
    },
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = { AppHeader(titulo = "Registrar pago", onBack = { navController.popBackStack() }) },
    ) { padding ->
        when {
            uiState.cargando -> LoadingBox(modifier = Modifier.padding(padding))
            uiState.error != null -> ErrorBox(message = uiState.error ?: "", modifier = Modifier.padding(padding))
            else -> LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item {
                    uiState.cliente?.let { cliente ->
                        Text(cliente.nombreCompleto, style = MaterialTheme.typography.titleLarge)
                        Text("DNI ${cliente.dni ?: "—"} · ${cliente.zona.nombre}", style = MaterialTheme.typography.bodySmall)
                    }
                }

                item { Text("Cargos a cubrir", style = MaterialTheme.typography.labelSmall) }

                if (uiState.cargos.isEmpty()) {
                    item { Text("Este cliente no tiene cargos pendientes.") }
                }

                items(uiState.cargos, key = { it.id }) { cargo ->
                    CargoSeleccionableRow(
                        cargo = cargo,
                        seleccionado = cargo.id in uiState.seleccionados,
                        onToggle = { viewModel.toggleCargo(cargo.id) },
                    )
                }

                if (uiState.cargos.isNotEmpty()) {
                    item {
                        OutlinedTextField(
                            value = uiState.monto,
                            onValueChange = viewModel::onMontoChange,
                            label = { Text("Monto a pagar (S/)") },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }

                    item {
                        Column {
                            Text("Método de pago", style = MaterialTheme.typography.labelSmall)
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 6.dp)) {
                                MetodosPago.OPCIONES.forEach { (valor, label) ->
                                    FilterChip(
                                        selected = uiState.metodoPago == valor,
                                        onClick = { viewModel.onMetodoChange(valor) },
                                        label = { Text(label) },
                                    )
                                }
                            }
                        }
                    }

                    item {
                        val saldoRestante = uiState.cargos.filter { it.id in uiState.seleccionados }.sumOf { it.saldo } -
                            (uiState.monto.toDoubleOrNull() ?: 0.0)
                        Text(
                            if (saldoRestante > 0.01) "Queda un saldo de ${formatMoney(saldoRestante)} en los cargos seleccionados" else "Cubre el total seleccionado",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }

                    if (uiState.errorEnvio != null) {
                        item { Text(uiState.errorEnvio ?: "", color = MaterialTheme.colorScheme.error) }
                    }

                    item {
                        Column {
                            Button(
                                onClick = { viewModel.registrar(onPagoRegistrado) },
                                enabled = !uiState.enviando && uiState.seleccionados.isNotEmpty(),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Text(if (uiState.enviando) "Registrando..." else "Registrar y emitir boleta")
                            }
                            OutlinedButton(
                                onClick = { viewModel.registrar { navController.popBackStack() } },
                                enabled = !uiState.enviando && uiState.seleccionados.isNotEmpty(),
                                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                            ) {
                                Text("Guardar sin imprimir")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CargoSeleccionableRow(cargo: CargoPendienteDto, seleccionado: Boolean, onToggle: () -> Unit) {
    Card(onClick = onToggle) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Row {
                // onCheckedChange = null: el Checkbox no debe ser clicable por su cuenta, porque la
                // fila entera (Card) ya tiene onClick = onToggle. Si ambos reaccionaran al toque,
                // un tap sobre el checkbox dispararía el toggle dos veces y anularía la selección.
                Checkbox(checked = seleccionado, onCheckedChange = null, modifier = Modifier.size(20.dp))
                Column(modifier = Modifier.padding(start = 10.dp)) {
                    Text("${nombreMes(cargo.mes)} ${cargo.anio}", style = MaterialTheme.typography.bodyMedium)
                    if (cargo.tipoServicio != null) {
                        Text(
                            cargo.tipoServicio.nombre.replaceFirstChar(Char::uppercase),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    EstadoChip(texto = cargo.estado, colores = coloresEstadoCargo(cargo.estado))
                }
            }
            Text(formatMoney(cargo.saldo), style = MonoStyles.Body)
        }
    }
}
