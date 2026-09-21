package com.cablera.app.ui.home

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.MoneyOff
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.cablera.app.LocalAppContainer
import com.cablera.app.data.remote.dto.ClienteConDeudaDto
import com.cablera.app.data.remote.dto.ResumenCobranzaDto
import com.cablera.app.ui.common.AppHeader
import com.cablera.app.ui.common.EmptyState
import com.cablera.app.ui.common.EstadoChip
import com.cablera.app.ui.common.HeaderSearchField
import com.cablera.app.ui.common.LambdaViewModelFactory
import com.cablera.app.ui.common.StateContent
import com.cablera.app.ui.common.coloresEstadoCargo
import com.cablera.app.ui.navigation.CableraBottomBar
import com.cablera.app.ui.navigation.Routes
import com.cablera.app.ui.theme.MonoStyles
import com.cablera.app.util.formatMoney

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    navController: NavHostController,
    onLogout: () -> Unit,
    viewModel: HomeViewModel = run {
        val container = LocalAppContainer.current
        viewModel(
            factory = LambdaViewModelFactory {
                HomeViewModel(container.cobranzaRepository, container.zonasRepository, container.authRepository)
            },
        )
    },
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current

    // Al volver de registrar un pago (Home -> Ficha -> Registrar pago -> Boleta -> atrás...), este
    // ViewModel sigue siendo el mismo de antes: sin esto, el resumen del día quedaría desactualizado.
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        viewModel.cargarResumen()
    }

    Scaffold(
        topBar = {
            AppHeader(
                titulo = "Cobranza",
                actions = {
                    if (!uiState.rolGestor) {
                        IconButton(onClick = { navController.navigate(Routes.REPORTAR_GASTO) }) {
                            Icon(Icons.Filled.MoneyOff, contentDescription = "Reportar gasto", tint = MaterialTheme.colorScheme.onPrimary)
                        }
                    }
                    IconButton(onClick = { navController.navigate(Routes.BOLETAS) }) {
                        Icon(Icons.AutoMirrored.Filled.ReceiptLong, contentDescription = "Ver boletas", tint = MaterialTheme.colorScheme.onPrimary)
                    }
                    IconButton(onClick = onLogout) {
                        Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = "Cerrar sesión", tint = MaterialTheme.colorScheme.onPrimary)
                    }
                },
                contenidoExtra = {
                    HeaderSearchField(
                        value = uiState.busqueda,
                        onValueChange = viewModel::onBusquedaChange,
                        placeholder = "Buscar por DNI, nombre o teléfono",
                    )
                },
            )
        },
        bottomBar = { CableraBottomBar(navController) },
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
            ) {
                item {
                    FilterChip(
                        selected = uiState.filtroZonaId == null,
                        onClick = { viewModel.onFiltroZonaChange(null) },
                        label = { Text("Todas las zonas") },
                    )
                }
                items(uiState.zonas) { zona ->
                    FilterChip(
                        selected = uiState.filtroZonaId == zona.id,
                        onClick = { viewModel.onFiltroZonaChange(zona.id) },
                        label = { Text(zona.nombre) },
                    )
                }
            }

            if (uiState.rolGestor) {
                OutlinedButton(
                    onClick = { navController.navigate(Routes.CLIENTE_NUEVO) },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                ) { Text("+ Nuevo cliente") }
            }

            StateContent(state = uiState.resumen, onRetry = viewModel::cargarResumen) { resumen ->
                ResumenContent(
                    resumen = resumen,
                    rolGestor = uiState.rolGestor,
                    onCobrar = { clienteId -> navController.navigate(Routes.registrarPago(clienteId)) },
                    onVerCliente = { clienteId -> navController.navigate(Routes.clienteFicha(clienteId)) },
                    onLlamar = { telefono ->
                        context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$telefono")))
                    },
                )
            }
        }
    }
}

@Composable
private fun ResumenContent(
    resumen: ResumenCobranzaDto,
    rolGestor: Boolean,
    onCobrar: (String) -> Unit,
    onVerCliente: (String) -> Unit,
    onLlamar: (String) -> Unit,
) {
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                if (rolGestor) {
                    KpiCard("Cobrado este mes", formatMoney(resumen.cobradoMes), "Pagos registrados", Modifier.weight(1f))
                    KpiCard("Deuda acumulada", formatMoney(resumen.deudaAcumulada), "Saldo pendiente", Modifier.weight(1f))
                } else {
                    KpiCard("Cobrado hoy por ti", formatMoney(resumen.cobradoHoyPorUsuario), "${resumen.cobrosHoyPorUsuarioCount} cobros", Modifier.weight(1f))
                    KpiCard("Pendientes", "${resumen.clientesConDeudaCount}", "clientes con deuda", Modifier.weight(1f))
                }
            }
        }
        if (resumen.clientes.isEmpty()) {
            item { EmptyState(mensaje = "No hay clientes con deuda pendiente.", icon = Icons.Filled.CheckCircle) }
        }
        items(resumen.clientes, key = { it.id }) { cliente ->
            ClienteConDeudaCard(
                cliente = cliente,
                onCobrar = { onCobrar(cliente.id) },
                onClick = { onVerCliente(cliente.id) },
                onLlamar = cliente.telefono?.let { telefono -> { onLlamar(telefono) } },
            )
        }
    }
}

@Composable
private fun KpiCard(label: String, valor: String, nota: String, modifier: Modifier = Modifier) {
    Card(modifier = modifier) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(valor, style = MonoStyles.Title, modifier = Modifier.padding(top = 4.dp))
            Text(nota, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun ClienteConDeudaCard(
    cliente: ClienteConDeudaDto,
    onCobrar: () -> Unit,
    onClick: () -> Unit,
    onLlamar: (() -> Unit)?,
) {
    Card(onClick = onClick, elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)) {
        Column(modifier = Modifier.padding(15.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(cliente.nombreCompleto, style = MaterialTheme.typography.titleLarge)
                    Text(cliente.zona.nombre, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Text(formatMoney(cliente.deudaTotal), style = MonoStyles.Title, color = MaterialTheme.colorScheme.error)
            }
            Row(modifier = Modifier.padding(top = 6.dp)) {
                val colores = if (cliente.suspendido) coloresEstadoCargo("pendiente") else coloresEstadoCargo("parcial")
                EstadoChip(texto = if (cliente.suspendido) "Suspendido" else cliente.mesesPendientes, colores = colores)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 12.dp)) {
                if (onLlamar != null) {
                    OutlinedButton(onClick = onLlamar, modifier = Modifier.height(48.dp)) {
                        Icon(Icons.Filled.Call, contentDescription = null, modifier = Modifier.padding(end = 6.dp))
                        Text("Llamar")
                    }
                }
                Button(onClick = onCobrar, modifier = Modifier.weight(1f).height(48.dp)) { Text("Cobrar") }
            }
        }
    }
}
