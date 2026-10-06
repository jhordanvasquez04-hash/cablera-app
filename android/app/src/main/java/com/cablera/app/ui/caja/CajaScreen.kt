package com.cablera.app.ui.caja

import com.cablera.app.ui.theme.colorCabecera
import androidx.compose.ui.graphics.Color
import com.cablera.app.ui.common.ItemAnimado
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.Button
import androidx.compose.material3.FloatingActionButton
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
import com.cablera.app.data.remote.dto.CajaTurnoDto
import com.cablera.app.data.remote.dto.EstadosCajaTurno
import com.cablera.app.data.remote.dto.MetodosPago
import com.cablera.app.data.remote.dto.ModosCaja
import com.cablera.app.data.remote.dto.MontoPorMetodoDto
import com.cablera.app.data.remote.dto.MovimientoCajaDto
import com.cablera.app.data.remote.dto.OrigenesMovimiento
import com.cablera.app.data.remote.dto.TiposMovimientoCaja
import com.cablera.app.ui.common.AppHeader
import com.cablera.app.ui.common.EmptyState
import com.cablera.app.ui.common.pieDeLista
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
        viewModel(factory = LambdaViewModelFactory { CajaViewModel(container.cajaRepository, container.cajaTurnoRepository) })
    },
) {
    val container = LocalAppContainer.current
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = { AppHeader(titulo = "Caja") },
        bottomBar = { CableraBottomBar(navController) },
        floatingActionButton = {
            // Solo en el mes en curso: registrar siempre usa la fecha de hoy.
            if (uiState.esMesActual) {
                FloatingActionButton(onClick = viewModel::abrirForm) {
                    Icon(Icons.Filled.Add, contentDescription = "Registrar ingreso o egreso")
                }
            }
        },
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            TurnoCajaSection(
                turno = uiState.turnoActual,
                cargando = uiState.cargandoTurno,
                onAbrir = viewModel::abrirFormAbrirTurno,
                onCerrar = viewModel::abrirFormCerrarTurno,
            )
            SelectorDeMes(
                mes = uiState.mesSeleccionado,
                puedeAvanzar = uiState.puedeAvanzarMes,
                onAnterior = viewModel::mesAnterior,
                onSiguiente = viewModel::mesSiguiente,
            )
            StateContent(state = uiState.resumen, onRetry = viewModel::cargar) { resumen ->
                LazyColumn(contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 88.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    item {
                        Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = colorCabecera())) {
                            val onHero = Color.White
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
                    if (!uiState.esMesActual) {
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
                    item {
                        // Dos botones grandes, del mismo tamaño y de todo el ancho: tocar uno filtra; tocarlo de
                        // nuevo vuelve a mostrar todos los movimientos.
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                            BotonFiltroMovimientos(
                                texto = "Ingresos",
                                seleccionado = uiState.filtroMovimientos == TiposMovimientoCaja.INGRESO,
                                onClick = { viewModel.onFiltroMovimientosChange(TiposMovimientoCaja.INGRESO) },
                                modifier = Modifier.weight(1f),
                            )
                            BotonFiltroMovimientos(
                                texto = "Egresos",
                                seleccionado = uiState.filtroMovimientos == TiposMovimientoCaja.EGRESO,
                                onClick = { viewModel.onFiltroMovimientosChange(TiposMovimientoCaja.EGRESO) },
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }
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
                                item { EmptyState(mensaje = "No hay movimientos con este filtro en este mes.") }
                            }
                            items(movimientos.data, key = { it.id }) { movimiento -> ItemAnimado { MovimientoRow(movimiento) } }
                            pieDeLista(hayMas = uiState.hayMasMovimientos, cargandoMas = uiState.cargandoMasMovimientos, onVerMas = viewModel::verMasMovimientos)
                        }
                    }
                }
            }
        }
    }

    if (uiState.mostrarForm) {
        ModalBottomSheet(onDismissRequest = viewModel::cerrarForm, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
            FormMovimientoSheet(uiState = uiState, viewModel = viewModel)
        }
    }

    if (uiState.mostrarAbrirTurno) {
        ModalBottomSheet(onDismissRequest = viewModel::cerrarFormAbrirTurno, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
            AbrirTurnoSheet(uiState = uiState, viewModel = viewModel)
        }
    }

    if (uiState.mostrarCerrarTurno) {
        ModalBottomSheet(onDismissRequest = viewModel::cerrarFormCerrarTurno, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
            CerrarTurnoSheet(uiState = uiState, viewModel = viewModel)
        }
    }
}

// Apertura/cierre de turno con arqueo: en Keysls es la única forma de manejar la caja. Los cobros en
// efectivo exigen un turno abierto.
@Composable
private fun TurnoCajaSection(turno: CajaTurnoDto?, cargando: Boolean, onAbrir: () -> Unit, onCerrar: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        if (cargando) {
            Row(modifier = Modifier.fillMaxWidth().padding(14.dp), horizontalArrangement = Arrangement.Center) {
                CircularProgressIndicator(modifier = Modifier.size(20.dp))
            }
        } else if (turno == null || turno.estado != EstadosCajaTurno.ABIERTA) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("No hay ningún turno de caja abierto", style = MaterialTheme.typography.bodyMedium)
                Button(onClick = onAbrir) { Text("Abrir turno") }
            }
        } else {
            Column(modifier = Modifier.padding(14.dp)) {
                Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                    Column {
                        Text("Turno abierto", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("Monto inicial: ${formatMoney(turno.montoInicial)}", style = MaterialTheme.typography.bodyMedium)
                    }
                    OutlinedButton(onClick = onCerrar) { Text("Cerrar turno") }
                }
                Text(
                    "Abierto por ${turno.usuarioApertura.nombre} · ${formatFechaHora(turno.fechaApertura)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }
    }
}

@Composable
private fun AbrirTurnoSheet(uiState: CajaUiState, viewModel: CajaViewModel) {
    Column(modifier = Modifier.imePadding().verticalScroll(rememberScrollState()).padding(20.dp)) {
        Text("Abrir turno de caja", style = MaterialTheme.typography.titleLarge)
        Text(
            "Ingresa cuánto efectivo hay en caja al empezar el turno.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 4.dp),
        )
        OutlinedTextField(
            value = uiState.montoAperturaTurno,
            onValueChange = viewModel::onMontoAperturaChange,
            label = { Text("Monto inicial (S/)") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
        )
        if (uiState.errorAbrirTurno != null) {
            Text(uiState.errorAbrirTurno, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 16.dp, bottom = 8.dp)) {
            TextButton(onClick = viewModel::cerrarFormAbrirTurno) { Text("Cancelar") }
            Button(onClick = viewModel::confirmarAbrirTurno, enabled = !uiState.guardandoAbrirTurno) {
                Text(if (uiState.guardandoAbrirTurno) "Abriendo..." else "Abrir turno")
            }
        }
    }
}

@Composable
private fun CerrarTurnoSheet(uiState: CajaUiState, viewModel: CajaViewModel) {
    Column(modifier = Modifier.imePadding().verticalScroll(rememberScrollState()).padding(20.dp)) {
        Text("Cerrar turno de caja", style = MaterialTheme.typography.titleLarge)
        Text(
            "Cuenta el efectivo real en caja para hacer el arqueo.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 4.dp),
        )
        OutlinedTextField(
            value = uiState.montoContadoTurno,
            onValueChange = viewModel::onMontoContadoChange,
            label = { Text("Efectivo contado (S/)") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
        )
        OutlinedTextField(
            value = uiState.observacionCierreTurno,
            onValueChange = viewModel::onObservacionCierreChange,
            label = { Text("Observación (opcional)") },
            modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
        )
        if (uiState.errorCerrarTurno != null) {
            Text(uiState.errorCerrarTurno, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 16.dp, bottom = 8.dp)) {
            TextButton(onClick = viewModel::cerrarFormCerrarTurno) { Text("Cancelar") }
            Button(onClick = viewModel::confirmarCerrarTurno, enabled = !uiState.guardandoCerrarTurno) {
                Text(if (uiState.guardandoCerrarTurno) "Cerrando..." else "Cerrar turno")
            }
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

/** Botón del filtro de movimientos: relleno cuando está activo, con borde cuando no; ambos miden lo mismo. */
@Composable
private fun BotonFiltroMovimientos(texto: String, seleccionado: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val alto = modifier.height(48.dp)
    if (seleccionado) {
        Button(onClick = onClick, modifier = alto) { Text(texto, style = MaterialTheme.typography.titleSmall) }
    } else {
        OutlinedButton(onClick = onClick, modifier = alto) { Text(texto, style = MaterialTheme.typography.titleSmall) }
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
                        if (esEgreso) "Egreso" else if (movimiento.origen == OrigenesMovimiento.PAGO) "Ingreso · cobro" else "Ingreso",
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
private fun FormMovimientoSheet(uiState: CajaUiState, viewModel: CajaViewModel) {
    Column(modifier = Modifier.imePadding().verticalScroll(rememberScrollState()).padding(20.dp)) {
        Text("Registrar movimiento", style = MaterialTheme.typography.titleLarge)
        val esIngreso = uiState.tipoMovimiento == TiposMovimientoCaja.INGRESO
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 12.dp)) {
            FilterChip(selected = esIngreso, onClick = { viewModel.onTipoMovimientoChange(TiposMovimientoCaja.INGRESO) }, label = { Text("Ingreso") })
            FilterChip(selected = !esIngreso, onClick = { viewModel.onTipoMovimientoChange(TiposMovimientoCaja.EGRESO) }, label = { Text("Egreso") })
        }
        if (esIngreso) {
            Text(
                "Ingreso externo: dinero que entra y no es el pago de un cliente (aporte, venta de un equipo, etc.). Los cobros a clientes se registran desde Cobranza.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 6.dp),
            )
        }
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
        run {
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
            label = { Text(if (uiState.tipoMovimiento == TiposMovimientoCaja.INGRESO) "Concepto del ingreso" else "Concepto del egreso") },
            modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
        )
        if (uiState.errorMovimiento != null) {
            Text(uiState.errorMovimiento, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 16.dp, bottom = 8.dp)) {
            TextButton(onClick = viewModel::cerrarForm) { Text("Cancelar") }
            Button(onClick = viewModel::guardarMovimiento, enabled = !uiState.guardandoMovimiento) {
                Text(if (uiState.guardandoMovimiento) "Guardando..." else if (uiState.tipoMovimiento == TiposMovimientoCaja.INGRESO) "Guardar ingreso" else "Guardar egreso")
            }
        }
    }
}
