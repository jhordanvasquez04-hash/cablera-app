package com.cablera.app.ui.home

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.cablera.app.LocalAppContainer
import com.cablera.app.data.remote.dto.ContratoConDeudaDto
import com.cablera.app.ui.common.AppHeader
import com.cablera.app.ui.common.EmptyState
import com.cablera.app.ui.common.EstadoChip
import com.cablera.app.ui.common.FiltroZonas
import com.cablera.app.ui.common.HeaderSearchField
import com.cablera.app.ui.common.LambdaViewModelFactory
import com.cablera.app.ui.common.CargandoItem
import com.cablera.app.ui.common.ErrorItem
import com.cablera.app.ui.common.UiState
import com.cablera.app.ui.common.pieDeLista
import com.cablera.app.ui.common.coloresEstadoCargo
import com.cablera.app.ui.navigation.CableraBottomBar
import com.cablera.app.ui.navigation.Routes
import com.cablera.app.ui.theme.MonoStyles
import com.cablera.app.util.formatMoney

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    navController: NavHostController,
    viewModel: HomeViewModel = run {
        val container = LocalAppContainer.current
        viewModel(
            factory = LambdaViewModelFactory {
                HomeViewModel(container.cobranzaRepository, container.authRepository)
            },
        )
    },
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current

    // Al volver de registrar un pago (Home -> Ficha -> Registrar pago -> Boleta -> atrás...), este
    // ViewModel sigue siendo el mismo de antes: sin esto, el resumen del día quedaría desactualizado.
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        viewModel.cargar()
    }

    Scaffold(
        topBar = {
            AppHeader(
                titulo = "Cobranza",
                actions = {
                    // Fusión con Keysls, alcance mínimo en el celular (ver Routes.kt): ambos
                    // roles pueden VER (igual que el backend); asignar/cancelar/editar queda
                    // acotado dentro de cada pantalla según el rol.
                    IconButton(onClick = { navController.navigate(Routes.ORDENES_SERVICIO) }) {
                        Icon(Icons.Filled.Assignment, contentDescription = "Servicios técnicos", tint = MaterialTheme.colorScheme.onPrimary)
                    }
                    IconButton(onClick = { navController.navigate(Routes.BOLETAS) }) {
                        Icon(Icons.AutoMirrored.Filled.ReceiptLong, contentDescription = "Ver pagos", tint = MaterialTheme.colorScheme.onPrimary)
                    }
                },
                contenidoExtra = {
                    HeaderSearchField(
                        value = uiState.busqueda,
                        onValueChange = viewModel::onBusquedaChange,
                        placeholder = "Buscar por DNI, nombre o contrato",
                    )
                },
            )
        },
        bottomBar = { CableraBottomBar(navController) },
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            if (uiState.rolGestor) {
                OutlinedButton(
                    onClick = { navController.navigate(Routes.CLIENTE_NUEVO) },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                ) { Text("+ Nuevo cliente") }
            }
            ResumenContent(
                uiState = uiState,
                onReintentar = viewModel::cargar,
                onFiltroSectorChange = viewModel::onFiltroSectorChange,
                onVerMas = viewModel::verMas,
                // Un contrato a la vez — cada tarjeta lleva solo a SU contrato (registrar pago
                // acotado a sus cargos), no a los del cliente entero.
                onCobrar = { clienteId, contratoId -> navController.navigate(Routes.registrarPago(clienteId, contratoId)) },
                onLlamar = { telefono -> context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$telefono"))) },
            )
        }
    }
}

@Composable
private fun ResumenContent(
    uiState: HomeUiState,
    onReintentar: () -> Unit,
    onFiltroSectorChange: (String?) -> Unit,
    onVerMas: () -> Unit,
    onCobrar: (String, String) -> Unit,
    onLlamar: (String) -> Unit,
) {
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        // --- Indicadores (salen de los totales del servidor) ---
        when (val r = uiState.resumen) {
            is UiState.Loading -> item { CargandoItem() }
            is UiState.Error -> item { ErrorItem(message = r.message, onRetry = onReintentar) }
            is UiState.Success -> {
                val resumen = r.data
                // Tres tarjetas en una fila que se desliza hacia la izquierda: se ven dos y un pedazo de la
                // tercera, para que se note que hay más.
                item {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        if (uiState.rolGestor) {
                            item { KpiCard("Cobrado este mes", formatMoney(resumen.cobradoMes), "Pagos registrados") }
                            item { KpiCard("Deuda acumulada", formatMoney(resumen.deudaAcumulada), "Saldo pendiente") }
                        } else {
                            item { KpiCard("Cobrado hoy por ti", formatMoney(resumen.cobradoHoyPorUsuario), "${resumen.cobrosHoyPorUsuarioCount} cobros") }
                            item { KpiCard("Pendientes", "${resumen.contratosActivosConDeuda}", "contratos activos con deuda") }
                        }
                        item {
                            KpiCard(
                                "Contratos activos",
                                "${resumen.contratosActivos}",
                                "${resumen.contratosActivosConDeuda} con deuda\n${formatMoney(resumen.deudaContratosActivos)} por cobrar",
                            )
                        }
                    }
                }
                // El filtro por zonas solo aparece si la empresa usa sectores en sus contratos.
                if (resumen.sectores.isNotEmpty()) {
                    item {
                        FiltroZonas(sectores = resumen.sectores, seleccionado = uiState.filtroSector, onSeleccionar = onFiltroSectorChange)
                    }
                }
            }
        }

        // --- Contratos con deuda: de a 10, con "Ver más" ---
        when (val c = uiState.contratos) {
            is UiState.Loading -> item { CargandoItem() }
            is UiState.Error -> item { ErrorItem(message = c.message, onRetry = onReintentar) }
            is UiState.Success -> {
                if (c.data.isEmpty()) {
                    item { EmptyState(mensaje = "No hay contratos con deuda pendiente.", icon = Icons.Filled.CheckCircle) }
                }
                // Lo que se cobra mes a mes es cada CONTRATO, no el cliente: un cliente con varios
                // contratos aparece varias veces, uno por cada uno con deuda.
                items(c.data, key = { it.contratoId }) { contrato ->
                    ContratoConDeudaCard(
                        contrato = contrato,
                        onCobrar = { onCobrar(contrato.clienteId, contrato.contratoId) },
                        onClick = { onCobrar(contrato.clienteId, contrato.contratoId) },
                        onLlamar = contrato.telefono?.let { telefono -> { onLlamar(telefono) } },
                    )
                }
                pieDeLista(hayMas = uiState.hayMas, cargandoMas = uiState.cargandoMas, onVerMas = onVerMas)
            }
        }
    }
}

@Composable
private fun KpiCard(label: String, valor: String, nota: String, modifier: Modifier = Modifier) {
    Card(modifier = modifier.width(156.dp).height(116.dp)) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
            // Un tamaño que entra en la tarjeta aun con montos grandes (ej. "S/ 12345.00"): nunca se corta ni salta de línea.
            Text(valor, style = MonoStyles.Title.copy(fontSize = 18.sp), maxLines = 1, softWrap = false, modifier = Modifier.padding(top = 4.dp))
            Text(nota, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2)
        }
    }
}

@Composable
private fun ContratoConDeudaCard(
    contrato: ContratoConDeudaDto,
    onCobrar: () -> Unit,
    onClick: () -> Unit,
    onLlamar: (() -> Unit)?,
) {
    Card(onClick = onClick, elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)) {
        Column(modifier = Modifier.padding(15.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(contrato.clienteNombre, style = MaterialTheme.typography.titleLarge)
                    // Número de contrato + tipo de servicio, para diferenciar entre los varios
                    // contratos de un mismo cliente .
                    Text(
                        "Contrato ${contrato.numero} · ${contrato.tipoServicio.replaceFirstChar(Char::uppercase)}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(top = 2.dp),
                    )
                }
                Text(formatMoney(contrato.deudaTotal), style = MonoStyles.Title, color = MaterialTheme.colorScheme.error)
            }
            Row(modifier = Modifier.padding(top = 6.dp)) {
                val colores = if (contrato.suspendido) coloresEstadoCargo("pendiente") else coloresEstadoCargo("parcial")
                EstadoChip(texto = if (contrato.suspendido) "Suspendido" else contrato.mesesPendientes, colores = colores)
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
