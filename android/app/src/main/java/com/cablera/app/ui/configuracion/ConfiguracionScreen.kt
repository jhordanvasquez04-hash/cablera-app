package com.cablera.app.ui.configuracion

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.cablera.app.LocalAppContainer
import com.cablera.app.data.remote.dto.Roles
import com.cablera.app.ui.common.AppHeader
import com.cablera.app.ui.common.LambdaViewModelFactory
import com.cablera.app.ui.common.StateContent
import com.cablera.app.ui.navigation.CableraBottomBar
import kotlinx.coroutines.launch

@Composable
fun ConfiguracionScreen(
    navController: NavHostController,
    viewModel: ConfiguracionViewModel = run {
        val container = LocalAppContainer.current
        viewModel(
            factory = LambdaViewModelFactory {
                ConfiguracionViewModel(container.configuracionRepository, container.configuracionState)
            },
        )
    },
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val container = LocalAppContainer.current
    val session by container.authRepository.session.collectAsStateWithLifecycle(initialValue = null)
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = { AppHeader(titulo = "Ajustes") },
        bottomBar = { CableraBottomBar(navController) },
    ) { padding ->
        StateContent(state = uiState.config, onRetry = viewModel::cargar, modifier = Modifier.padding(padding)) {
            LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                item {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Sesión", style = MaterialTheme.typography.labelSmall)
                            Text(session?.usuario?.nombre ?: "", style = MaterialTheme.typography.titleMedium)
                            Text(
                                session?.usuario?.email ?: "",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Text(
                                if (session?.usuario?.rol == Roles.GESTOR) "Administrador" else "Cobrador",
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.padding(top = 4.dp),
                            )
                        }
                    }
                }
                item { Text("Datos de la empresa", style = MaterialTheme.typography.titleMedium) }
                item {
                    OutlinedTextField(
                        value = uiState.nombre,
                        onValueChange = viewModel::onNombreChange,
                        label = { Text("Nombre de la empresa") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                item {
                    OutlinedTextField(
                        value = uiState.ruc,
                        onValueChange = viewModel::onRucChange,
                        label = { Text("RUC") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                item {
                    OutlinedTextField(
                        value = uiState.telefono,
                        onValueChange = viewModel::onTelefonoChange,
                        label = { Text("Teléfono de contacto") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                item {
                    OutlinedTextField(
                        value = uiState.direccion,
                        onValueChange = viewModel::onDireccionChange,
                        label = { Text("Dirección") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                item {
                    OutlinedTextField(
                        value = uiState.agencia,
                        onValueChange = viewModel::onAgenciaChange,
                        label = { Text("Agencia") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                if (uiState.error != null) {
                    item { Text(uiState.error ?: "", color = MaterialTheme.colorScheme.error) }
                }
                if (uiState.guardadoOk) {
                    item { Text("Cambios guardados", color = MaterialTheme.colorScheme.primary) }
                }
                item {
                    Button(onClick = viewModel::guardar, enabled = !uiState.guardando, modifier = Modifier.fillMaxWidth()) {
                        Text(if (uiState.guardando) "Guardando..." else "Guardar cambios")
                    }
                }
                item {
                    OutlinedButton(
                        onClick = { scope.launch { container.authRepository.logout() } },
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("Cerrar sesión") }
                }
            }
        }
    }
}
