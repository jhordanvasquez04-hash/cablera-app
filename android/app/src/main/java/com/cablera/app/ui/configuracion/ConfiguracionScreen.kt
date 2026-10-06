package com.cablera.app.ui.configuracion

import com.cablera.app.ui.theme.colorCabecera
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
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
    // Antes de cerrar sesión se pregunta (ver ConfirmarCerrarSesionDialog)
    var confirmarSalida by remember { mutableStateOf(false) }
    if (confirmarSalida) {
        ConfirmarCerrarSesionDialog(
            onConfirmar = { confirmarSalida = false; scope.launch { container.authRepository.logout() } },
            onCancelar = { confirmarSalida = false },
        )
    }

    Scaffold(
        topBar = { AppHeader(titulo = "Ajustes") },
        bottomBar = { CableraBottomBar(navController) },
    ) { padding ->
        StateContent(state = uiState.config, onRetry = viewModel::cargar, modifier = Modifier.padding(padding)) {
            LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                item {
                    TarjetaSesion(
                        nombre = session?.usuario?.nombre.orEmpty(),
                        email = session?.usuario?.email.orEmpty(),
                        esAdministrador = session?.usuario?.rol == Roles.GESTOR,
                        onCerrarSesion = { confirmarSalida = true },
                    )
                }
                item {
                    Column(modifier = Modifier.padding(top = 6.dp)) {
                        Text("Datos de la empresa", style = MaterialTheme.typography.titleMedium)
                        Text(
                            "Aparecen en las boletas que imprimes.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
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
            }
        }
    }
}

@Composable
private fun TarjetaSesion(
    nombre: String,
    email: String,
    esAdministrador: Boolean,
    onCerrarSesion: () -> Unit,
) {
    val primario = colorCabecera()
    val onHero = Color.White
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(Brush.linearGradient(listOf(primario, primario.copy(alpha = 0.78f))))
                .padding(20.dp),
        ) {
            Text("Sesión iniciada", style = MaterialTheme.typography.labelSmall, color = onHero.copy(alpha = 0.7f))
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 12.dp)) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(56.dp)
                        .background(onHero, CircleShape),
                ) {
                    val iniciales = nombre.split(" ").filter { it.isNotBlank() }.take(2)
                        .joinToString("") { it.first().uppercase() }
                    if (iniciales.isNotEmpty()) {
                        Text(iniciales, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = primario)
                    } else {
                        Icon(Icons.Filled.Person, contentDescription = null, tint = primario)
                    }
                }
                Column(modifier = Modifier.padding(start = 14.dp).weight(1f)) {
                    Text(
                        nombre.ifBlank { "Usuario" },
                        style = MaterialTheme.typography.titleLarge,
                        color = onHero,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    if (email.isNotBlank()) {
                        Text(
                            email,
                            style = MaterialTheme.typography.bodyMedium,
                            color = onHero.copy(alpha = 0.8f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .padding(top = 14.dp)
                    .background(onHero.copy(alpha = 0.18f), RoundedCornerShape(50))
                    .padding(horizontal = 12.dp, vertical = 6.dp),
            ) {
                Icon(
                    if (esAdministrador) Icons.Filled.AdminPanelSettings else Icons.Filled.Payments,
                    contentDescription = null,
                    tint = onHero,
                    modifier = Modifier.size(16.dp),
                )
                Text(
                    if (esAdministrador) "Administrador" else "Cobrador",
                    style = MaterialTheme.typography.labelLarge,
                    color = onHero,
                    modifier = Modifier.padding(start = 6.dp),
                )
            }
            OutlinedButton(
                onClick = onCerrarSesion,
                colors = ButtonDefaults.outlinedButtonColors(contentColor = onHero),
                border = BorderStroke(1.dp, onHero.copy(alpha = 0.6f)),
                modifier = Modifier.fillMaxWidth().padding(top = 18.dp),
            ) {
                Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, modifier = Modifier.size(18.dp))
                Text("Cerrar sesión", modifier = Modifier.padding(start = 8.dp))
            }
        }
    }
}
