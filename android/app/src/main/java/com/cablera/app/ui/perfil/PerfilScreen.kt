package com.cablera.app.ui.perfil

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
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
import androidx.navigation.NavHostController
import com.cablera.app.LocalAppContainer
import com.cablera.app.data.remote.dto.Roles
import com.cablera.app.ui.common.AppHeader
import com.cablera.app.ui.navigation.CableraBottomBar
import kotlinx.coroutines.launch

@Composable
fun PerfilScreen(navController: NavHostController) {
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
        topBar = { AppHeader(titulo = "Perfil") },
        bottomBar = { CableraBottomBar(navController) },
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Filled.Person, contentDescription = null, modifier = Modifier.size(36.dp))
            }

            Text(
                session?.usuario?.nombre ?: "",
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.padding(top = 14.dp),
            )
            Text(
                session?.usuario?.email ?: "",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Card(modifier = Modifier.fillMaxWidth().padding(top = 20.dp)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Rol", style = MaterialTheme.typography.labelSmall)
                    Text(
                        if (session?.usuario?.rol == Roles.GESTOR) "Administrador" else "Cobrador",
                        style = MaterialTheme.typography.bodyLarge,
                    )
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
