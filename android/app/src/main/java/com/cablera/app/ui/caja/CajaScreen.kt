package com.cablera.app.ui.caja

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
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
import com.cablera.app.data.remote.dto.GastoReportadoDto
import com.cablera.app.data.remote.dto.MetodosPago
import com.cablera.app.data.remote.dto.MontoPorMetodoDto
import com.cablera.app.data.remote.dto.MovimientoCajaDto
import com.cablera.app.data.remote.dto.TiposMovimientoCaja
import com.cablera.app.ui.common.AppHeader
import com.cablera.app.ui.common.EmptyState
import com.cablera.app.ui.common.LambdaViewModelFactory
import com.cablera.app.ui.common.StateContent
import com.cablera.app.ui.common.UiState
import com.cablera.app.ui.navigation.CableraBottomBar
import com.cablera.app.ui.theme.CableraError
import com.cablera.app.ui.theme.CableraSuccess
import com.cablera.app.ui.theme.MonoStyles
import com.cablera.app.util.formatFechaHora
import com.cablera.app.util.formatMoney
import com.cablera.app.util.nombreMes

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CajaScreen(
    navController: NavHostController,
    viewModel: CajaViewModel = run {
        val container = LocalAppContainer.current
        viewModel(factory = LambdaViewModelFactory { CajaViewModel(container.cajaRepository) })
    },
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = { AppHeader(titulo = "Caja y egresos") },
        bottomBar = { CableraBottomBar(navController) },
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            SelectorDeMes(
                mes = uiState.mesSeleccionado,
                puedeAvanzar = uiState.puedeAvanzarMes,
                onAnterior = viewModel::mesAnterior,
                onSiguiente = viewModel::mesSiguiente,
            )
            StateContent(state = uiState.resumen, onRetry = viewModel::cargar) { resumen ->
                LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    item {
                        Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary)) {
                            val onHero = MaterialTheme.colorScheme.onPrimary
                            Column(modifier = Modifier.padding(18.dp)) {
                                Text("Ingresos menos egresos", style = MaterialTheme.typography.labelSmall, color = onHero.copy(alpha = 0.7f))
                                Text(formatMoney(resumen.neto), style = MonoStyles.Display, color = onHero)
                                Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth().padding(top = 12.dp)) {
                                    Text("Ingresos", color = onHero.copy(alpha = 0.85f))
                                    Text(formatMoney(resumen.ingresosTotal), style = MonoStyles.Body, color = onHero)
                                }
                                Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                                    Text("Egresos", color = onHero.copy(alpha = 0.85f))
                                    Text(formatMoney(resumen.egresosTotal), style = MonoStyles.Body, color = onHero)
                                }
                            }
                        }
                    }
                    if (uiState.esMesActual) {
                        item {
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(onClick = { viewModel.abrirForm(TiposMovimientoCaja.EGRESO) }, modifier = Modifier.weight(1f)) {
                                    Text("Registrar egreso")
                                }
                                OutlinedButton(onClick = { viewModel.abrirForm(TiposMovimientoCaja.INGRESO) }, modifier = Modifier.weight(1f)) {
                                    Text("Registrar ingreso")
                                }
                            }
                        }
                        if (uiState.gastosPendientes.isNotEmpty()) {
                            item { Text("Gastos reportados por cobradores", style = MaterialTheme.typography.titleMedium) }
                            items(uiState.gastosPendientes, key = { it.id }) { gasto ->
                                GastoPendienteRow(
                                    gasto = gasto,
                                    procesando = uiState.procesandoGastoId == gasto.id,
                                    onAprobar = { viewModel.aprobarGasto(gasto.id, MetodosPago.EFECTIVO) },
                                    onRechazar = { viewModel.rechazarGasto(gasto.id) },
                                )
                            }
                        }
                    } else {
                        item {
                            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                                Text(
                                    "Este mes ya cerró: solo puedes consultar su historial. Para registrar movimientos, vuelve al mes en curso.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(14.dp),
                                )
                            }
                        }
                    }
                    item { Text("Cobrado por método", style = MaterialTheme.typography.titleMedium) }
                    items(resumen.porMetodo) { fila -> MetodoRow(fila) }

                    item { Text("Movimientos del mes", style = MaterialTheme.typography.titleMedium) }
                    when (val movimientos = uiState.movimientos) {
                        is UiState.Loading -> item {
                            Row(modifier = Modifier.fillMaxWidth().padding(24.dp), horizontalArrangement = Arrangement.Center) {
                                CircularProgressIndicator()
                            }
                        }
                        is UiState.Error -> item {
                            Text(movimientos.message, color = MaterialTheme.colorScheme.error)
                        }
                        is UiState.Success -> {
                            if (movimientos.data.isEmpty()) {
                                item { EmptyState(mensaje = "No hay movimientos registrados en este mes.") }
                            }
                            items(movimientos.data, key = { it.id }) { movimiento -> MovimientoRow(movimiento) }
                        }
                    }
                }
            }
        }
    }

    if (uiState.mostrarForm) {
        ModalBottomSheet(onDismissRequest = viewModel::cerrarForm, sheetState = rememberModalBottomSheetState()) {
            FormMovimientoSheet(uiState = uiState, viewModel = viewModel)
        }
    }
}

@Composable
private fun SelectorDeMes(mes: java.time.YearMonth, puedeAvanzar: Boolean, onAnterior: () -> Unit, onSiguiente: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp),
    ) {
        IconButton(onClick = onAnterior) {
            Icon(Icons.Filled.ChevronLeft, contentDescription = "Mes anterior")
        }
        Text(
            "${nombreMes(mes.monthValue)} ${mes.year}",
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(horizontal = 8.dp),
        )
        IconButton(onClick = onSiguiente, enabled = puedeAvanzar) {
            Icon(Icons.Filled.ChevronRight, contentDescription = "Mes siguiente")
        }
    }
}

@Composable
private fun MetodoRow(fila: MontoPorMetodoDto) {
    Card {
        Row(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column {
                Text(fila.metodo.replaceFirstChar(Char::uppercase), style = MaterialTheme.typography.bodyMedium)
                Text("${fila.cantidadCobros} cobros", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text(formatMoney(fila.monto), style = MonoStyles.Body)
        }
    }
}

@Composable
private fun MovimientoRow(movimiento: MovimientoCajaDto) {
    val esEgreso = movimiento.tipo == TiposMovimientoCaja.EGRESO
    Card {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text(
                        if (esEgreso) "Egreso" else "Ingreso",
                        style = MaterialTheme.typography.labelSmall,
                        color = if (esEgreso) CableraError else CableraSuccess,
                    )
                    Text(
                        movimiento.categoria ?: movimiento.metodoPago.replaceFirstChar(Char::uppercase),
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
                Text(
                    "${if (esEgreso) "-" else "+"} ${formatMoney(movimiento.monto)}",
                    style = MonoStyles.Body,
                    color = if (esEgreso) CableraError else CableraSuccess,
                )
            }
            Text(
                "${formatFechaHora(movimiento.fecha)}${movimiento.descripcion?.let { " · $it" } ?: ""}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun GastoPendienteRow(gasto: GastoReportadoDto, procesando: Boolean, onAprobar: () -> Unit, onRechazar: () -> Unit) {
    Card {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text(gasto.descripcion, style = MaterialTheme.typography.bodyMedium)
                Text(formatMoney(gasto.monto), style = MonoStyles.Body)
            }
            Text(
                "${gasto.usuario.nombre} · ${formatFechaHora(gasto.fecha)}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                Button(onClick = onAprobar, enabled = !procesando, modifier = Modifier.weight(1f)) { Text("Registrar") }
                OutlinedButton(onClick = onRechazar, enabled = !procesando, modifier = Modifier.weight(1f)) { Text("Rechazar") }
            }
        }
    }
}

@Composable
private fun FormMovimientoSheet(uiState: CajaUiState, viewModel: CajaViewModel) {
    Column(modifier = Modifier.padding(20.dp)) {
        Text(
            if (uiState.tipoMovimiento == TiposMovimientoCaja.EGRESO) "Registrar egreso" else "Registrar ingreso",
            style = MaterialTheme.typography.titleLarge,
        )
        OutlinedTextField(
            value = uiState.montoMovimiento,
            onValueChange = viewModel::onMontoChange,
            label = { Text("Monto (S/)") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
        )
        Text("Método de pago", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 14.dp))
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(top = 6.dp).horizontalScroll(rememberScrollState()),
        ) {
            MetodosPago.OPCIONES.forEach { (valor, label) ->
                FilterChip(selected = uiState.metodoMovimiento == valor, onClick = { viewModel.onMetodoChange(valor) }, label = { Text(label) })
            }
        }
        if (uiState.tipoMovimiento == TiposMovimientoCaja.EGRESO) {
            Text("Categoría", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 14.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(top = 6.dp).horizontalScroll(rememberScrollState()),
            ) {
                uiState.categorias.forEach { categoria ->
                    FilterChip(selected = uiState.categoriaId == categoria.id, onClick = { viewModel.onCategoriaChange(categoria.id) }, label = { Text(categoria.nombre) })
                }
                FilterChip(selected = false, onClick = { viewModel.mostrarNuevaCategoria() }, label = { Text("+ Nueva") })
            }
            if (uiState.mostrandoNuevaCategoria) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 8.dp)) {
                    OutlinedTextField(
                        value = uiState.nombreNuevaCategoria,
                        onValueChange = viewModel::onNombreNuevaCategoriaChange,
                        label = { Text("Nueva categoría (ej. Otros)") },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                    )
                    TextButton(onClick = viewModel::ocultarNuevaCategoria) { Text("Cancelar") }
                    TextButton(onClick = viewModel::crearCategoria, enabled = !uiState.creandoCategoria && uiState.nombreNuevaCategoria.isNotBlank()) {
                        Text(if (uiState.creandoCategoria) "..." else "Agregar")
                    }
                }
            }
        }
        OutlinedTextField(
            value = uiState.descripcionMovimiento,
            onValueChange = viewModel::onDescripcionChange,
            label = { Text(if (uiState.tipoMovimiento == TiposMovimientoCaja.EGRESO) "Descripción del egreso" else "Descripción del ingreso") },
            modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
        )
        if (uiState.errorMovimiento != null) {
            Text(uiState.errorMovimiento, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 16.dp, bottom = 8.dp)) {
            TextButton(onClick = viewModel::cerrarForm) { Text("Cancelar") }
            Button(onClick = viewModel::guardarMovimiento, enabled = !uiState.guardandoMovimiento) {
                Text(if (uiState.guardandoMovimiento) "Guardando..." else "Guardar")
            }
        }
    }
}
