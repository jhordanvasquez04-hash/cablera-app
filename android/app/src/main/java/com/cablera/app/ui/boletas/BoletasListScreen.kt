package com.cablera.app.ui.boletas

import com.cablera.app.ui.common.ItemAnimado
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Card
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DateRangePicker
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SelectableDates
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDateRangePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextDecoration
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
import com.cablera.app.ui.common.pieDeLista
import com.cablera.app.ui.common.HeaderSearchField
import com.cablera.app.ui.common.LambdaViewModelFactory
import com.cablera.app.ui.common.StateContent
import com.cablera.app.ui.common.coloresEstadoBoleta
import com.cablera.app.ui.theme.MonoStyles
import com.cablera.app.util.ZONA_PERU
import com.cablera.app.util.formatFechaCorta
import com.cablera.app.util.formatRangoFechas
import com.cablera.app.util.formatMoney
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

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
                titulo = "Pagos",
                onBack = onBack,
                contenidoExtra = {
                    HeaderSearchField(value = uiState.busqueda, onValueChange = viewModel::onBusquedaChange, placeholder = "Buscar por cliente, DNI o contrato")
                },
            )
        },
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            FiltroFechas(
                periodo = uiState.periodo,
                desde = uiState.desde,
                hasta = uiState.hasta,
                onPeriodo = viewModel::onPeriodoChange,
                onRango = viewModel::onRangoPersonalizado,
                modifier = Modifier.padding(top = 12.dp),
            )
            StateContent(state = uiState.boletas, onRetry = viewModel::cargar) { boletas ->
                LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    if (boletas.isEmpty()) {
                        val mensaje = if (uiState.desde != null) "No hay pagos en estas fechas." else "No hay pagos registrados."
                        item { EmptyState(mensaje = mensaje, icon = Icons.AutoMirrored.Filled.ReceiptLong) }
                    }
                    items(boletas, key = { it.id }) { boleta -> ItemAnimado {
                        BoletaRow(boleta = boleta, onClick = { onVerBoleta(boleta.id) })
                    }
                    }
                    pieDeLista(hayMas = uiState.hayMas, cargandoMas = uiState.cargandoMas, onVerMas = viewModel::verMas)
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
            Text("${boleta.cliente.dni ?: "sin DNI"} · ${boleta.concepto}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth().padding(top = 4.dp)) {
                Text(formatMoney(boleta.montoTotal), style = MonoStyles.Body, textDecoration = if (boleta.estado == "anulada") TextDecoration.LineThrough else TextDecoration.None)
                EstadoChip(texto = boleta.estado, colores = coloresEstadoBoleta(boleta.estado))
            }
        }
    }
}

/**
 * Chips de fecha con la misma estética que el filtro de zonas: atajos rápidos y un rango libre que
 * abre el calendario. Con un rango elegido, el chip muestra las fechas y la ✕ lo quita.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FiltroFechas(
    periodo: PeriodoBoletas,
    desde: LocalDate?,
    hasta: LocalDate?,
    onPeriodo: (PeriodoBoletas) -> Unit,
    onRango: (LocalDate, LocalDate) -> Unit,
    modifier: Modifier = Modifier,
) {
    var mostrarCalendario by rememberSaveable { mutableStateOf(false) }
    val atajos = listOf(
        PeriodoBoletas.TODAS to "Todas",
        PeriodoBoletas.HOY to "Hoy",
        PeriodoBoletas.SEMANA to "Esta semana",
        PeriodoBoletas.MES to "Este mes",
    )
    val rangoElegido = if (periodo == PeriodoBoletas.PERSONALIZADO && desde != null && hasta != null) desde to hasta else null

    LazyRow(
        modifier = modifier,
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(atajos, key = { it.first }) { (valor, texto) ->
            FilterChip(selected = periodo == valor, onClick = { onPeriodo(valor) }, label = { Text(texto) })
        }
        item(key = "rango") {
            FilterChip(
                selected = rangoElegido != null,
                onClick = { mostrarCalendario = true },
                label = { Text(rangoElegido?.let { formatRangoFechas(it.first, it.second) } ?: "Elegir fechas") },
                leadingIcon = { Icon(Icons.Filled.CalendarMonth, contentDescription = null, modifier = Modifier.size(FilterChipDefaults.IconSize)) },
                trailingIcon = if (rangoElegido != null) {
                    {
                        Icon(
                            Icons.Filled.Close,
                            contentDescription = "Quitar filtro de fechas",
                            modifier = Modifier.size(FilterChipDefaults.IconSize).clickable { onPeriodo(PeriodoBoletas.TODAS) },
                        )
                    }
                } else {
                    null
                },
            )
        }
    }

    if (mostrarCalendario) {
        CalendarioRango(
            desde = rangoElegido?.first,
            hasta = rangoElegido?.second,
            onDismiss = { mostrarCalendario = false },
            onAplicar = { inicio, fin ->
                mostrarCalendario = false
                onRango(inicio, fin)
            },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CalendarioRango(
    desde: LocalDate?,
    hasta: LocalDate?,
    onDismiss: () -> Unit,
    onAplicar: (LocalDate, LocalDate) -> Unit,
) {
    // El calendario trabaja en milisegundos UTC a medianoche; "hoy" se toma en hora de Lima.
    val hoy = remember { LocalDate.now(ZONA_PERU) }
    val selectableDates = remember(hoy) {
        object : SelectableDates {
            override fun isSelectableDate(utcTimeMillis: Long) = utcTimeMillis.aLocalDate() <= hoy
            override fun isSelectableYear(year: Int) = year <= hoy.year
        }
    }
    val estado = rememberDateRangePickerState(
        initialSelectedStartDateMillis = desde?.aMillisUtc(),
        initialSelectedEndDateMillis = hasta?.aMillisUtc(),
        yearRange = 2020..hoy.year,
        selectableDates = selectableDates,
    )
    val inicio = estado.selectedStartDateMillis?.aLocalDate()
    // Un solo toque = un solo día (sin obligar a tocar dos veces la misma fecha).
    val fin = estado.selectedEndDateMillis?.aLocalDate() ?: inicio

    DatePickerDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(onClick = { if (inicio != null && fin != null) onAplicar(inicio, fin) }, enabled = inicio != null) {
                Text("Aplicar")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
    ) {
        DateRangePicker(
            state = estado,
            title = { Text("Filtrar pagos por fecha", modifier = Modifier.padding(start = 24.dp, end = 12.dp, top = 16.dp)) },
            showModeToggle = false,
            modifier = Modifier.weight(1f),
        )
    }
}

private fun LocalDate.aMillisUtc(): Long = atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()

private fun Long.aLocalDate(): LocalDate = Instant.ofEpochMilli(this).atZone(ZoneOffset.UTC).toLocalDate()
