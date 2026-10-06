package com.cablera.app.ui.clientes

import com.cablera.app.ui.theme.colorCabecera
import androidx.compose.ui.graphics.Color
import com.cablera.app.ui.common.ItemAnimado
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.material3.IconButton
import androidx.compose.material3.Icon
import androidx.compose.material.icons.filled.PersonOff
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.Icons
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
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
import com.cablera.app.data.remote.dto.CargoPendienteDto
import com.cablera.app.data.remote.dto.ClienteFichaDto
import com.cablera.app.data.remote.dto.ContratoDto
import com.cablera.app.data.remote.dto.EstadosContrato
import com.cablera.app.data.remote.dto.EstadosServicio
import com.cablera.app.data.remote.dto.MetodosPago
import com.cablera.app.data.remote.dto.Roles
import com.cablera.app.ui.common.AppHeader
import com.cablera.app.ui.common.EmptyState
import com.cablera.app.ui.common.EstadoChip
import com.cablera.app.ui.common.LambdaViewModelFactory
import com.cablera.app.ui.common.StateContent
import com.cablera.app.ui.common.coloresEstadoBoleta
import com.cablera.app.ui.common.ETIQUETAS_TIPO_ORDEN
import com.cablera.app.ui.common.coloresEstadoCargo
import com.cablera.app.ui.common.coloresEstadoOrden
import com.cablera.app.ui.common.coloresEstadoServicio
import com.cablera.app.ui.navigation.Routes
import com.cablera.app.ui.theme.MonoStyles
import com.cablera.app.util.formatFechaCorta
import com.cablera.app.util.formatMoney
import com.cablera.app.util.nombreMes

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClienteFichaScreen(
    navController: NavHostController,
    clienteId: String,
    viewModel: ClienteFichaViewModel = run {
        val container = LocalAppContainer.current
        viewModel(
            factory = LambdaViewModelFactory {
                ClienteFichaViewModel(
                    clienteId,
                    container.clientesRepository,
                    container.boletasRepository,
                    container.contratosRepository,
                    container.ordenesServicioRepository,
                )
            },
        )
    },
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val container = LocalAppContainer.current
    val session by container.authRepository.session.collectAsStateWithLifecycle(initialValue = null)
    val rolGestor = session?.usuario?.rol == Roles.GESTOR

    // Al volver a esta pantalla (ej. tras registrar un pago y pulsar "atrás"), el ViewModel sigue vivo
    // con los datos de antes: sin esto, el pago recién creado no aparecería hasta salir y volver a entrar.
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        viewModel.cargar()
    }

    Scaffold(
        topBar = { AppHeader(titulo = "Ficha del cliente", onBack = { navController.popBackStack() }, curva = false) },
    ) { padding ->
        StateContent(state = uiState.ficha, onRetry = viewModel::cargar, modifier = Modifier.padding(padding)) { ficha ->
            FichaContent(
                ficha = ficha,
                rolGestor = rolGestor,
                tabSeleccionada = uiState.tabSeleccionada,
                onTabChange = viewModel::onTabChange,
                onCobroRapido = viewModel::abrirCobroRapido,
                onElegirCargos = { navController.navigate(Routes.registrarPago(clienteId)) },
                onVerBoleta = { boletaId -> navController.navigate(Routes.boletaDetalle(boletaId)) },
                onEditar = viewModel::abrirEditar,
                onDarDeBaja = viewModel::abrirBaja,
                onVerTodasLasBoletas = { navController.navigate(Routes.BOLETAS) },
                onVerServicio = { ordenId -> navController.navigate(Routes.ordenServicioDetalle(ordenId)) },
                onNuevoServicio = { navController.navigate(Routes.nuevaOrden(clienteId = clienteId)) },
                onVerTodosServicios = { navController.navigate(Routes.ORDENES_SERVICIO) },
                onNuevoContrato = { navController.navigate(Routes.contratoNuevoParaCliente(clienteId)) },
                onEditarContrato = viewModel::abrirEditarContrato,
                onSuspenderContrato = viewModel::suspenderContrato,
                onActivarContrato = viewModel::activarContrato,
                onCortarContrato = viewModel::cortarContrato,
                onBajaContrato = viewModel::abrirBajaContrato,
            )
        }
    }

    if (uiState.mostrarCobroRapido) {
        ModalBottomSheet(onDismissRequest = viewModel::cerrarCobroRapido, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
            CobroRapidoSheet(
                uiState = uiState,
                onTodo = viewModel::onMontoCobroRapidoTodo,
                onUnMes = viewModel::onMontoCobroRapidoUnMes,
                onMontoChange = viewModel::onMontoCobroRapidoChange,
                onMetodoChange = viewModel::onMetodoCobroRapidoChange,
                onConfirmar = { viewModel.confirmarCobroRapido { boletaId -> navController.navigate(Routes.boletaDetalle(boletaId)) } },
            )
        }
    }

    if (uiState.mostrarEditar) {
        ModalBottomSheet(onDismissRequest = viewModel::cerrarEditar, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
            EditarDatosSheet(uiState = uiState, viewModel = viewModel)
        }
    }

    if (uiState.mostrarBaja) {
        ModalBottomSheet(onDismissRequest = viewModel::cerrarBaja, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
            DarDeBajaSheet(uiState = uiState, viewModel = viewModel, onDone = { navController.popBackStack() })
        }
    }

    if (uiState.contratoEditandoId != null) {
        ModalBottomSheet(onDismissRequest = viewModel::cerrarEditarContrato, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
            EditarContratoSheet(uiState = uiState, viewModel = viewModel)
        }
    }

    if (uiState.contratoBajaId != null) {
        ModalBottomSheet(onDismissRequest = viewModel::cerrarBajaContrato, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
            DarDeBajaContratoSheet(uiState = uiState, viewModel = viewModel)
        }
    }
}

@Composable
private fun FichaContent(
    ficha: ClienteFichaDto,
    rolGestor: Boolean,
    tabSeleccionada: Int,
    onTabChange: (Int) -> Unit,
    onCobroRapido: () -> Unit,
    onElegirCargos: () -> Unit,
    onVerBoleta: (String) -> Unit,
    onEditar: () -> Unit,
    onDarDeBaja: () -> Unit,
    onVerTodasLasBoletas: () -> Unit,
    onVerServicio: (String) -> Unit,
    onNuevoServicio: () -> Unit,
    onVerTodosServicios: () -> Unit,
    onNuevoContrato: () -> Unit,
    onEditarContrato: (String) -> Unit,
    onSuspenderContrato: (String) -> Unit,
    onActivarContrato: (String) -> Unit,
    onCortarContrato: (String) -> Unit,
    onBajaContrato: (String) -> Unit,
) {
    val cliente = ficha.cliente
    Column(modifier = Modifier.fillMaxWidth()) {
        Card(
            // Continúa la cabecera negra (sin curva, ver AppHeader) y cierra con esquinas redondeadas abajo
            shape = RoundedCornerShape(bottomStart = 24.dp, bottomEnd = 24.dp),
            colors = androidx.compose.material3.CardDefaults.cardColors(containerColor = colorCabecera()),
            modifier = Modifier.fillMaxWidth(),
        ) {
            val onHero = Color.White
            Column(modifier = Modifier.padding(20.dp)) {
                Row(verticalAlignment = Alignment.Top) {
                    Column(modifier = Modifier.weight(1f)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(cliente.nombreCompleto, style = MaterialTheme.typography.titleLarge, color = onHero, modifier = Modifier.weight(1f, fill = false))
                            EstadoChip(texto = cliente.estadoServicio, colores = coloresEstadoServicio(cliente.estadoServicio))
                        }
                        Text(
                            "${cliente.dni ?: "sin DNI"}${cliente.telefono?.let { " · $it" } ?: ""}",
                            style = MonoStyles.Body,
                            color = onHero.copy(alpha = 0.75f),
                        )
                        if (cliente.fechaAlta.isNotBlank()) {
                            Text("Cliente desde ${formatFechaCorta(cliente.fechaAlta)}", style = MaterialTheme.typography.bodySmall, color = onHero.copy(alpha = 0.65f), modifier = Modifier.padding(top = 2.dp))
                        }
                    }
                    if (rolGestor && cliente.estadoServicio != EstadosServicio.RETIRADO) {
                        IconButton(onClick = onEditar) { Icon(Icons.Filled.Edit, contentDescription = "Editar datos", tint = onHero) }
                        IconButton(onClick = onDarDeBaja) { Icon(Icons.Filled.PersonOff, contentDescription = "Dar de baja", tint = onHero) }
                    }
                }
                Text("Saldo total", style = MaterialTheme.typography.labelSmall, color = onHero.copy(alpha = 0.65f), modifier = Modifier.padding(top = 14.dp))
                Text(formatMoney(ficha.saldoTotal), style = MonoStyles.Display, color = onHero)
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(top = 14.dp)) {
                    Button(
                        onClick = onCobroRapido,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = onHero, contentColor = colorCabecera()),
                    ) { Text("Cobro rápido") }
                    OutlinedButton(
                        onClick = onElegirCargos,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = onHero),
                        border = BorderStroke(1.dp, onHero.copy(alpha = 0.6f)),
                    ) { Text("Elegir cargos") }
                }
            }
        }

        TabRow(selectedTabIndex = tabSeleccionada) {
            Tab(selected = tabSeleccionada == 0, onClick = { onTabChange(0) }, text = { Text("Deuda") })
            Tab(selected = tabSeleccionada == 1, onClick = { onTabChange(1) }, text = { Text("Pagos") })
            if (rolGestor) Tab(selected = tabSeleccionada == 2, onClick = { onTabChange(2) }, text = { Text("Servicios técnicos", maxLines = 2, textAlign = androidx.compose.ui.text.style.TextAlign.Center, style = MaterialTheme.typography.labelLarge) })
        }

        when (tabSeleccionada) {
            0 -> TabDeuda(
                ficha = ficha,
                rolGestor = rolGestor,
                onNuevoContrato = onNuevoContrato,
                onEditarContrato = onEditarContrato,
                onSuspenderContrato = onSuspenderContrato,
                onActivarContrato = onActivarContrato,
                onCortarContrato = onCortarContrato,
                onBajaContrato = onBajaContrato,
            )
            1 -> TabPagos(ficha = ficha, onVerBoleta = onVerBoleta, onVerTodasLasBoletas = onVerTodasLasBoletas)
            else -> if (rolGestor) TabServiciosTecnicos(
                ficha = ficha,
                onVerServicio = onVerServicio,
                onNuevoServicio = onNuevoServicio,
                onVerTodos = onVerTodosServicios,
            )
        }
    }
}

@Composable
private fun TabDeuda(
    ficha: ClienteFichaDto,
    rolGestor: Boolean,
    onNuevoContrato: () -> Unit,
    onEditarContrato: (String) -> Unit,
    onSuspenderContrato: (String) -> Unit,
    onActivarContrato: (String) -> Unit,
    onCortarContrato: (String) -> Unit,
    onBajaContrato: (String) -> Unit,
) {
    val cliente = ficha.cliente
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (!cliente.direccion.isNullOrBlank() || !cliente.email.isNullOrBlank()) {
            item {
                Card {
                    Column(modifier = Modifier.padding(16.dp)) {
                        if (!cliente.direccion.isNullOrBlank()) Text("Dirección: ${cliente.direccion}")
                        if (!cliente.email.isNullOrBlank()) Text("Correo: ${cliente.email}")
                    }
                }
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Text("Contratos", style = MaterialTheme.typography.titleMedium)
                if (rolGestor) TextButton(onClick = onNuevoContrato) { Text("+ Nuevo contrato") }
            }
        }
        if (cliente.contratos.isEmpty()) {
            item { EmptyState(mensaje = "Este cliente todavía no tiene contratos.") }
        }
        items(cliente.contratos, key = { it.id }) { contrato -> ItemAnimado {
            ContratoCard(
                contrato = contrato,
                rolGestor = rolGestor,
                onEditar = { onEditarContrato(contrato.id) },
                onSuspender = { onSuspenderContrato(contrato.id) },
                onActivar = { onActivarContrato(contrato.id) },
                onCortar = { onCortarContrato(contrato.id) },
                onBaja = { onBajaContrato(contrato.id) },
            )
        }
        }
        item { Text("Deuda mes a mes", style = MaterialTheme.typography.titleMedium) }
        val cargosPendientes = ficha.cargosMesAMes.filter { it.estado != "pagado" }
        if (cargosPendientes.isEmpty()) {
            item { EmptyState(mensaje = "Sin meses pendientes: el cliente está al día.") }
        }
        // Lo que se debe es por CONTRATO: los meses pendientes se separan en un bloque por cada uno.
        val cargosPorContrato = cargosPendientes.groupBy { it.contratoId }
        cliente.contratos.forEach { contrato ->
            val cargosDelContrato = cargosPorContrato[contrato.id].orEmpty()
            if (cargosDelContrato.isEmpty()) return@forEach
            item {
                Text(
                    "Contrato ${contrato.numero} · ${contrato.tipoServicio.replaceFirstChar(Char::uppercase)}${contrato.direccion?.let { " · $it" } ?: ""}",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
            items(cargosDelContrato.chunked(2)) { fila ->
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    fila.forEach { cargo -> CargoCard(cargo = cargo, modifier = Modifier.weight(1f)) }
                    if (fila.size == 1) Column(modifier = Modifier.weight(1f)) {}
                }
            }
        }
    }
}

@Composable
private fun ContratoCard(
    contrato: ContratoDto,
    rolGestor: Boolean,
    onEditar: () -> Unit,
    onSuspender: () -> Unit,
    onActivar: () -> Unit,
    onCortar: () -> Unit,
    onBaja: () -> Unit,
) {
    Card {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(contrato.tipoServicio.replaceFirstChar(Char::uppercase), style = MaterialTheme.typography.titleMedium)
                    Text(
                        "Contrato ${contrato.numero}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                EstadoChip(
                    texto = contrato.estado,
                    colores = coloresEstadoServicio(if (contrato.estado == EstadosContrato.ACTIVO) EstadosServicio.ACTIVO else EstadosServicio.SUSPENDIDO),
                )
            }
            Text(formatMoney(contrato.costoMensual), style = MonoStyles.Body, modifier = Modifier.padding(top = 6.dp))
            if (contrato.diaCorte != null) {
                Text("Día de corte: ${contrato.diaCorte}", style = MaterialTheme.typography.bodySmall)
            }
            if (!contrato.direccion.isNullOrBlank()) Text(contrato.direccion, style = MaterialTheme.typography.bodySmall)
            if (contrato.estado == EstadosContrato.BAJA && !contrato.motivoBaja.isNullOrBlank()) {
                Text("Dado de baja: ${contrato.motivoBaja}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 10.dp))
            Text("Ficha técnica", style = MaterialTheme.typography.labelLarge)
            contrato.puntoRed?.let { Text("Punto de red: ${it.codigo}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp)) }
            contrato.tecnicoInstalador?.let { Text("Instalado por: ${it.nombre} ${it.apellido}", style = MaterialTheme.typography.bodySmall) }
            if (!contrato.ipWan.isNullOrBlank()) Text("IP WAN: ${contrato.ipWan}", style = MaterialTheme.typography.bodySmall)
            if (!contrato.pppoeUsuario.isNullOrBlank()) Text("Usuario PPPoE: ${contrato.pppoeUsuario}", style = MaterialTheme.typography.bodySmall)
            if (rolGestor && contrato.estado != EstadosContrato.BAJA) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 8.dp)) {
                    OutlinedButton(onClick = onEditar, contentPadding = PaddingValues(horizontal = 10.dp)) { Text("Editar", style = MaterialTheme.typography.labelSmall) }
                    if (contrato.estado == EstadosContrato.ACTIVO) {
                        OutlinedButton(onClick = onSuspender, contentPadding = PaddingValues(horizontal = 10.dp)) { Text("Suspender", style = MaterialTheme.typography.labelSmall) }
                        OutlinedButton(onClick = onCortar, contentPadding = PaddingValues(horizontal = 10.dp)) { Text("Cortar", style = MaterialTheme.typography.labelSmall) }
                    } else {
                        OutlinedButton(onClick = onActivar, contentPadding = PaddingValues(horizontal = 10.dp)) { Text("Reactivar", style = MaterialTheme.typography.labelSmall) }
                    }
                    OutlinedButton(onClick = onBaja, contentPadding = PaddingValues(horizontal = 10.dp)) { Text("Baja", style = MaterialTheme.typography.labelSmall) }
                }
            }
        }
    }
}

@Composable
private fun TabPagos(ficha: ClienteFichaDto, onVerBoleta: (String) -> Unit, onVerTodasLasBoletas: () -> Unit) {
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        if (ficha.historialPagos.isEmpty()) {
            item { EmptyState(mensaje = "Sin pagos registrados todavía.") }
        }
        items(ficha.historialPagos, key = { it.id }) { boleta -> ItemAnimado {
            BoletaHistorialRow(boleta = boleta, onClick = { onVerBoleta(boleta.id) })
        }
        }
        item {
            TextButton(onClick = onVerTodasLasBoletas) { Text("Ver todos los pagos") }
        }
    }
}

/** Historial de servicios técnicos (órdenes de servicio) de los contratos del cliente. */
@Composable
private fun TabServiciosTecnicos(
    ficha: ClienteFichaDto,
    onVerServicio: (String) -> Unit,
    onNuevoServicio: () -> Unit,
    onVerTodos: () -> Unit,
) {
    val variosContratos = ficha.cliente.contratos.size > 1
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            OutlinedButton(onClick = onNuevoServicio, modifier = Modifier.fillMaxWidth()) { Text("+ Nuevo servicio técnico") }
        }
        if (ficha.serviciosTecnicos.isEmpty()) {
            item { EmptyState(mensaje = "Este cliente todavía no tiene servicios técnicos.") }
        }
        items(ficha.serviciosTecnicos, key = { it.id }) { orden -> ItemAnimado {
            Card(onClick = { onVerServicio(orden.id) }) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                        Text(orden.nServicio, style = MaterialTheme.typography.titleMedium)
                        EstadoChip(texto = orden.estado.replace("_", " "), colores = coloresEstadoOrden(orden.estado))
                    }
                    Text(ETIQUETAS_TIPO_ORDEN[orden.tipoOrden] ?: orden.tipoOrden, style = MaterialTheme.typography.bodyMedium)
                    if (variosContratos && orden.contrato != null) {
                        Text("Contrato ${orden.contrato.numero}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                    }
                    Text(
                        orden.tecnico?.let { "Técnico: ${it.nombre} ${it.apellido}" } ?: "Sin técnico asignado",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        formatFechaCorta(orden.fechaServicio),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    if (!orden.observacion.isNullOrBlank()) {
                        Text(orden.observacion, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp), maxLines = 2)
                    }
                }
            }
        }
        }
        item {
            TextButton(onClick = onVerTodos) { Text("Ver todos los servicios técnicos") }
        }
    }
}

@Composable
private fun CargoCard(cargo: CargoPendienteDto, modifier: Modifier = Modifier) {
    Card(modifier = modifier) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text("${nombreMes(cargo.mes)} ${cargo.anio}", style = MaterialTheme.typography.labelSmall)
            if (cargo.tipoServicio != null) {
                Text(cargo.tipoServicio.replaceFirstChar(Char::uppercase), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text(formatMoney(cargo.saldo), style = MonoStyles.Body, modifier = Modifier.padding(vertical = 4.dp))
            EstadoChip(texto = cargo.estado, colores = coloresEstadoCargo(cargo.estado))
        }
    }
}

@Composable
private fun BoletaHistorialRow(boleta: BoletaResumenDto, onClick: () -> Unit) {
    Card(onClick = onClick) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text(boleta.folio, style = MonoStyles.Body.copy(fontWeight = MaterialTheme.typography.titleMedium.fontWeight))
                Text(formatFechaCorta(boleta.fecha), style = MaterialTheme.typography.bodySmall)
            }
            Text(boleta.concepto, style = MaterialTheme.typography.bodySmall)
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth().padding(top = 4.dp)) {
                Text(formatMoney(boleta.montoTotal), style = MonoStyles.Body, textDecoration = if (boleta.estado == "anulada") TextDecoration.LineThrough else TextDecoration.None)
                EstadoChip(texto = boleta.estado, colores = coloresEstadoBoleta(boleta.estado))
            }
        }
    }
}

@Composable
private fun CobroRapidoSheet(
    uiState: ClienteFichaUiState,
    onTodo: () -> Unit,
    onUnMes: () -> Unit,
    onMontoChange: (String) -> Unit,
    onMetodoChange: (String) -> Unit,
    onConfirmar: () -> Unit,
) {
    Column(modifier = Modifier.imePadding().verticalScroll(rememberScrollState()).padding(20.dp)) {
        Text("Cobro rápido", style = MaterialTheme.typography.titleLarge)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 14.dp)) {
            OutlinedButton(onClick = onTodo) { Text("Todo") }
            OutlinedButton(onClick = onUnMes) { Text("1 mes") }
        }
        OutlinedTextField(
            value = uiState.montoCobroRapido,
            onValueChange = onMontoChange,
            label = { Text("Monto (S/)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 12.dp)) {
            MetodosPago.OPCIONES.forEach { (valor, label) ->
                FilterChip(selected = uiState.metodoCobroRapido == valor, onClick = { onMetodoChange(valor) }, label = { Text(label) })
            }
        }
        if (uiState.errorCobro != null) {
            Text(uiState.errorCobro, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp))
        }
        Button(onClick = onConfirmar, enabled = !uiState.enviandoCobro, modifier = Modifier.fillMaxWidth().padding(top = 16.dp, bottom = 8.dp)) {
            Text(if (uiState.enviandoCobro) "Registrando..." else "Registrar pago")
        }
    }
}

@Composable
private fun EditarDatosSheet(uiState: ClienteFichaUiState, viewModel: ClienteFichaViewModel) {
    Column(modifier = Modifier.imePadding().verticalScroll(rememberScrollState()).padding(20.dp)) {
        Text("Editar datos", style = MaterialTheme.typography.titleLarge)
        OutlinedTextField(
            value = uiState.editNombre,
            onValueChange = viewModel::onEditNombreChange,
            label = { Text("Nombre completo") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
        )
        OutlinedTextField(
            value = uiState.editTelefono,
            onValueChange = viewModel::onEditTelefonoChange,
            label = { Text("Teléfono") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
        )
        OutlinedTextField(
            value = uiState.editDireccion,
            onValueChange = viewModel::onEditDireccionChange,
            label = { Text("Dirección") },
            modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
        )
        if (uiState.errorEdicion != null) {
            Text(uiState.errorEdicion, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp))
        }
        Button(
            onClick = viewModel::guardarEdicion,
            enabled = !uiState.guardandoEdicion,
            modifier = Modifier.fillMaxWidth().padding(top = 16.dp, bottom = 8.dp),
        ) {
            Text(if (uiState.guardandoEdicion) "Guardando..." else "Guardar cambios")
        }
    }
}

@Composable
private fun DarDeBajaSheet(uiState: ClienteFichaUiState, viewModel: ClienteFichaViewModel, onDone: () -> Unit) {
    Column(modifier = Modifier.imePadding().verticalScroll(rememberScrollState()).padding(20.dp)) {
        Text("Dar de baja", style = MaterialTheme.typography.titleLarge)
        Text(
            "Se darán de baja todos sus contratos vigentes y el cliente quedará inactivo, conservando su historial.",
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(top = 6.dp),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 14.dp)) {
            MOTIVOS_BAJA.forEach { motivo ->
                FilterChip(selected = uiState.motivoBaja == motivo, onClick = { viewModel.onMotivoBajaChange(motivo) }, label = { Text(motivo) })
            }
        }
        if (uiState.errorBaja != null) {
            Text(uiState.errorBaja, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 16.dp, bottom = 8.dp)) {
            TextButton(onClick = viewModel::cerrarBaja) { Text("Cancelar") }
            Button(
                onClick = { viewModel.confirmarBaja(onDone) },
                enabled = !uiState.enviandoBaja,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
            ) {
                Text(if (uiState.enviandoBaja) "Confirmando..." else "Confirmar baja")
            }
        }
    }
}

@Composable
private fun EditarContratoSheet(uiState: ClienteFichaUiState, viewModel: ClienteFichaViewModel) {
    Column(modifier = Modifier.imePadding().verticalScroll(rememberScrollState()).padding(20.dp)) {
        Text("Editar contrato", style = MaterialTheme.typography.titleLarge)

        OutlinedTextField(
            value = uiState.ecCostoMensual,
            onValueChange = viewModel::onEcCostoMensualChange,
            label = { Text("Costo mensual (S/)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
        )
        OutlinedTextField(
            value = uiState.ecDiaCorte,
            onValueChange = viewModel::onEcDiaCorteChange,
            label = { Text("Día de corte (1-31)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
        )

        Text("Punto de red", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 14.dp))
        var menuPuntoRedAbierto by remember { mutableStateOf(false) }
        Box {
            OutlinedButton(onClick = { menuPuntoRedAbierto = true }, modifier = Modifier.fillMaxWidth()) {
                Text(uiState.puntosRed.find { it.id == uiState.ecPuntoRedId }?.codigo ?: "Sin asignar")
            }
            DropdownMenu(expanded = menuPuntoRedAbierto, onDismissRequest = { menuPuntoRedAbierto = false }) {
                DropdownMenuItem(text = { Text("Sin asignar") }, onClick = { viewModel.onEcPuntoRedChange(null); menuPuntoRedAbierto = false })
                uiState.puntosRed.forEach { punto ->
                    DropdownMenuItem(text = { Text(punto.codigo) }, onClick = { viewModel.onEcPuntoRedChange(punto.id); menuPuntoRedAbierto = false })
                }
            }
        }

        Text("Técnico instalador", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 14.dp))
        var menuTecnicoAbierto by remember { mutableStateOf(false) }
        Box {
            OutlinedButton(onClick = { menuTecnicoAbierto = true }, modifier = Modifier.fillMaxWidth()) {
                val tecnico = uiState.tecnicos.find { it.id == uiState.ecTecnicoInstaladorId }
                Text(tecnico?.let { "${it.nombre} ${it.apellido}" } ?: "Sin asignar")
            }
            DropdownMenu(expanded = menuTecnicoAbierto, onDismissRequest = { menuTecnicoAbierto = false }) {
                DropdownMenuItem(text = { Text("Sin asignar") }, onClick = { viewModel.onEcTecnicoChange(null); menuTecnicoAbierto = false })
                uiState.tecnicos.forEach { tecnico ->
                    DropdownMenuItem(text = { Text("${tecnico.nombre} ${tecnico.apellido}") }, onClick = { viewModel.onEcTecnicoChange(tecnico.id); menuTecnicoAbierto = false })
                }
            }
        }

        OutlinedTextField(value = uiState.ecDireccion, onValueChange = viewModel::onEcDireccionChange, label = { Text("Dirección") }, modifier = Modifier.fillMaxWidth().padding(top = 12.dp))
        OutlinedTextField(value = uiState.ecReferencia, onValueChange = viewModel::onEcReferenciaChange, label = { Text("Referencia") }, modifier = Modifier.fillMaxWidth().padding(top = 10.dp))
        OutlinedTextField(value = uiState.ecSector, onValueChange = viewModel::onEcSectorChange, label = { Text("Sector") }, modifier = Modifier.fillMaxWidth().padding(top = 10.dp))
        OutlinedTextField(value = uiState.ecIpWan, onValueChange = viewModel::onEcIpWanChange, label = { Text("IP WAN") }, singleLine = true, modifier = Modifier.fillMaxWidth().padding(top = 10.dp))
        OutlinedTextField(value = uiState.ecPppoeUsuario, onValueChange = viewModel::onEcPppoeUsuarioChange, label = { Text("Usuario PPPoE") }, singleLine = true, modifier = Modifier.fillMaxWidth().padding(top = 10.dp))
        OutlinedTextField(value = uiState.ecPppoePassword, onValueChange = viewModel::onEcPppoePasswordChange, label = { Text("Clave PPPoE") }, singleLine = true, modifier = Modifier.fillMaxWidth().padding(top = 10.dp))
        OutlinedTextField(value = uiState.ecPrecinto, onValueChange = viewModel::onEcPrecintoChange, label = { Text("Precinto") }, singleLine = true, modifier = Modifier.fillMaxWidth().padding(top = 10.dp))
        OutlinedTextField(value = uiState.ecEquipoSerie, onValueChange = viewModel::onEcEquipoSerieChange, label = { Text("Serie del equipo") }, singleLine = true, modifier = Modifier.fillMaxWidth().padding(top = 10.dp))

        if (uiState.errorContrato != null) {
            Text(uiState.errorContrato, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp))
        }
        Button(
            onClick = viewModel::guardarContrato,
            enabled = !uiState.guardandoContrato,
            modifier = Modifier.fillMaxWidth().padding(top = 16.dp, bottom = 8.dp),
        ) {
            Text(if (uiState.guardandoContrato) "Guardando..." else "Guardar contrato")
        }
    }
}

@Composable
private fun DarDeBajaContratoSheet(uiState: ClienteFichaUiState, viewModel: ClienteFichaViewModel) {
    Column(modifier = Modifier.imePadding().verticalScroll(rememberScrollState()).padding(20.dp)) {
        Text("Dar de baja este contrato", style = MaterialTheme.typography.titleLarge)
        Text(
            "El contrato pasará a \"baja\"; los demás contratos del cliente no se ven afectados.",
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(top = 6.dp),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 14.dp)) {
            MOTIVOS_BAJA.forEach { motivo ->
                FilterChip(selected = uiState.motivoBajaContrato == motivo, onClick = { viewModel.onMotivoBajaContratoChange(motivo) }, label = { Text(motivo) })
            }
        }
        if (uiState.errorBajaContrato != null) {
            Text(uiState.errorBajaContrato, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 16.dp, bottom = 8.dp)) {
            TextButton(onClick = viewModel::cerrarBajaContrato) { Text("Cancelar") }
            Button(
                onClick = viewModel::confirmarBajaContrato,
                enabled = !uiState.enviandoBajaContrato,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
            ) {
                Text(if (uiState.enviandoBajaContrato) "Confirmando..." else "Confirmar baja")
            }
        }
    }
}
