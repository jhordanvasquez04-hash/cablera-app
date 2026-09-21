package com.cablera.app.ui.boletas

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.cablera.app.LocalAppContainer
import com.cablera.app.data.remote.dto.BoletaResumenDto
import com.cablera.app.ui.common.AppHeader
import com.cablera.app.ui.common.EmptyState
import com.cablera.app.ui.common.EstadoChip
import com.cablera.app.ui.common.HeaderSearchField
import com.cablera.app.ui.common.LambdaViewModelFactory
import com.cablera.app.ui.common.StateContent
import com.cablera.app.ui.common.coloresEstadoBoleta
import com.cablera.app.ui.theme.MonoStyles
import com.cablera.app.util.formatFechaCorta
import com.cablera.app.util.formatMoney

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BoletasListScreen(
    navController: NavHostController,
    onBack: (() -> Unit)? = null,
    onVerBoleta: (String) -> Unit,
    viewModel: BoletasListViewModel = run {
        val container = LocalAppContainer.current
        viewModel(factory = LambdaViewModelFactory { BoletasListViewModel(container.boletasRepository) })
    },
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    // Refresca al volver de registrar un pago (o de cualquier pantalla empujada encima), para que
    // la boleta recién emitida aparezca sin salir y reentrar a esta lista.
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        viewModel.cargar()
    }

    Scaffold(
        topBar = {
            AppHeader(
                titulo = "Boletas",
                onBack = onBack,
                contenidoExtra = {
                    HeaderSearchField(value = uiState.busqueda, onValueChange = viewModel::onBusquedaChange, placeholder = "Buscar por folio o cliente")
                },
            )
        },
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            StateContent(state = uiState.boletas, onRetry = viewModel::cargar) { boletas ->
                LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    if (boletas.isEmpty()) {
                        item { EmptyState(mensaje = "No hay boletas registradas.", icon = Icons.AutoMirrored.Filled.ReceiptLong) }
                    }
                    items(boletas, key = { it.id }) { boleta ->
                        BoletaRow(boleta = boleta, onClick = { onVerBoleta(boleta.id) })
                    }
                }
            }
        }
    }
}

@Composable
private fun BoletaRow(boleta: BoletaResumenDto, onClick: () -> Unit) {
    Card(onClick = onClick) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text(boleta.folio, style = MonoStyles.Body)
                Text(formatFechaCorta(boleta.fecha), style = MaterialTheme.typography.bodySmall)
            }
            Text(boleta.cliente.nombreCompleto, style = MaterialTheme.typography.bodyMedium)
            Text("${boleta.cliente.zona} · ${boleta.concepto}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth().padding(top = 4.dp)) {
                Text(formatMoney(boleta.montoTotal), style = MonoStyles.Body)
                EstadoChip(texto = boleta.estado, colores = coloresEstadoBoleta(boleta.estado))
            }
        }
    }
}
