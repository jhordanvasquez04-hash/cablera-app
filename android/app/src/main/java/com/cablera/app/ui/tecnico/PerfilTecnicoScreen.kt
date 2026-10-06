package com.cablera.app.ui.tecnico

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Build
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import com.cablera.app.ui.common.ConfirmarCerrarSesionDialog
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.cablera.app.LocalAppContainer
import com.cablera.app.ui.common.AppHeader
import com.cablera.app.ui.common.LambdaViewModelFactory
import com.cablera.app.ui.common.StateContent
import com.cablera.app.ui.navigation.TecnicoBottomBar
import kotlinx.coroutines.launch

@Composable
fun PerfilTecnicoScreen(
    navController: NavHostController,
    viewModel: PerfilTecnicoViewModel = run {
        val container = LocalAppContainer.current
        viewModel(factory = LambdaViewModelFactory { PerfilTecnicoViewModel(container.ordenesTecnicoRepository) })
    },
) {
    val container = LocalAppContainer.current
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    // Antes de cerrar sesión se pregunta (ver ConfirmarCerrarSesionDialog)
    var confirmarSalida by remember { mutableStateOf(false) }
    if (confirmarSalida) {
        ConfirmarCerrarSesionDialog(
            onConfirmar = { confirmarSalida = false; scope.launch { container.tecnicoAuthRepository.logout() } },
            onCancelar = { confirmarSalida = false },
        )
    }

    Scaffold(
        topBar = { AppHeader(titulo = "Perfil") },
        bottomBar = { TecnicoBottomBar(navController) },
    ) { padding ->
        StateContent(state = uiState, modifier = Modifier.padding(padding), onRetry = viewModel::cargar) { perfil ->
            Column(
                modifier = Modifier.fillMaxSize().padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primaryContainer),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Filled.Build, contentDescription = null, modifier = Modifier.size(36.dp))
                }

                Text(
                    "${perfil.nombre} ${perfil.apellido}",
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.padding(top = 14.dp),
                )
                Text(perfil.email, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)

                Card(modifier = Modifier.fillMaxWidth().padding(top = 20.dp)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        if (!perfil.zona.isNullOrBlank()) {
                            Text("Zona", style = MaterialTheme.typography.labelSmall)
                            Text(perfil.zona, style = MaterialTheme.typography.bodyLarge)
                        }
                        if (!perfil.vehiculo.isNullOrBlank()) {
                            Text("Vehículo", style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(top = 10.dp))
                            Text(perfil.vehiculo, style = MaterialTheme.typography.bodyLarge)
                        }
                        if (!perfil.telefono.isNullOrBlank()) {
                            Text("Teléfono", style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(top = 10.dp))
                            Text(perfil.telefono, style = MaterialTheme.typography.bodyLarge)
                        }
                    }
                }

                OutlinedButton(
                    onClick = { confirmarSalida = true },
                    modifier = Modifier.fillMaxWidth().padding(top = 24.dp),
                ) {
                    Text("Cerrar sesión")
                }
            }
        }
    }
}
