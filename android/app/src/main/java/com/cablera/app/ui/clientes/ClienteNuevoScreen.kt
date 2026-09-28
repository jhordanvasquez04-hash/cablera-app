package com.cablera.app.ui.clientes

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.TextButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
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
import com.cablera.app.ui.common.ClienteExistenteDialog
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
                ClienteNuevoViewModel(container.clientesRepository)
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
            item { SeccionLabel("Identificación") }
            item {
                OutlinedTextField(
                    value = uiState.dni,
                    onValueChange = viewModel::onDniChange,
                    label = { Text("DNI / RUC") },
                    placeholder = { Text("8 u 11 dígitos") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            item {
                OutlinedTextField(
                    value = uiState.telefono,
                    onValueChange = viewModel::onTelefonoChange,
                    label = { Text("Teléfono") },
                    placeholder = { Text("999 999 999") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            item { HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp)) }
            item { SeccionLabel("Datos personales") }
            item {
                OutlinedTextField(
                    value = uiState.nombreCompleto,
                    onValueChange = viewModel::onNombreChange,
                    label = { Text("Nombre completo") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            item { HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp)) }
            item { SeccionLabel("Contacto") }
            item {
                OutlinedTextField(
                    value = uiState.email,
                    onValueChange = viewModel::onEmailChange,
                    label = { Text("Email") },
                    placeholder = { Text("cliente@correo.com") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            item {
                OutlinedTextField(
                    value = uiState.direccion,
                    onValueChange = viewModel::onDireccionChange,
                    label = { Text("Dirección") },
                    placeholder = { Text("Dirección completa") },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            item { HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp)) }
            item { SeccionLabel("Ubicación (opcional)") }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = uiState.latitud,
                        onValueChange = viewModel::onLatitudChange,
                        label = { Text("Latitud") },
                        placeholder = { Text("-8.0834") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.weight(1f),
                    )
                    OutlinedTextField(
                        value = uiState.longitud,
                        onValueChange = viewModel::onLongitudChange,
                        label = { Text("Longitud") },
                        placeholder = { Text("-78.9557") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            if (uiState.error != null) {
                item { Text(uiState.error ?: "", color = MaterialTheme.colorScheme.error) }
            }
            item {
                Button(
                    onClick = {
                        viewModel.guardar { clienteId ->
                            // Encadenado a propósito: recién creado el cliente, lo más común es
                            // que se le vaya a crear su primer contrato ahí mismo — se reutiliza
                            // la misma pantalla de "Nuevo contrato" (ver Contratos), ya con este
                            // cliente fijo, para no tener que volver a buscarlo.
                            navController.navigate(Routes.contratoNuevoParaCliente(clienteId)) {
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

    // DNI/RUC ya registrado: no se crea otro cliente; se ofrece crearle un contrato al que ya existe.
    uiState.duplicado?.let { existente ->
        ClienteExistenteDialog(
            existente = existente,
            pregunta = "¿Quieres crearle un contrato?",
            textoConfirmar = "Crear contrato",
            onConfirmar = {
                viewModel.cerrarDuplicado()
                navController.navigate(Routes.contratoNuevoParaCliente(existente.id)) { popUpTo(Routes.HOME) }
            },
            onCancelar = viewModel::cerrarDuplicado,
        )
    }
}

@Composable
private fun SeccionLabel(texto: String) {
    Text(texto, style = MaterialTheme.typography.titleMedium)
}
