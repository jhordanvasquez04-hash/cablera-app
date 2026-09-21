package com.cablera.app.ui.clientes

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.BorderStroke
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
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
import com.cablera.app.data.remote.dto.EstadosServicioTecnico
import com.cablera.app.data.remote.dto.MetodosPago
import com.cablera.app.data.remote.dto.Roles
import com.cablera.app.data.remote.dto.ServicioContratadoDto
import com.cablera.app.data.remote.dto.ServicioTecnicoDto
import com.cablera.app.ui.common.AppHeader
import com.cablera.app.ui.common.EmptyState
import com.cablera.app.ui.common.EstadoChip
import com.cablera.app.ui.common.LambdaViewModelFactory
import com.cablera.app.ui.common.StateContent
import com.cablera.app.ui.common.coloresEstadoBoleta
import com.cablera.app.ui.common.coloresEstadoCargo
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
                    container.serviciosTecnicosRepository,
                    container.configuracionRepository,
                )
            },
        )
    },
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val container = LocalAppContainer.current
    val session by container.authRepository.session.collectAsStateWithLifecycle(initialValue = null)
    val rolGestor = session?.usuario?.rol == Roles.GESTOR

    // Al volver a esta pantalla (ej. tras registrar un pago o crear un servicio técnico y pulsar
    // "atrás"), el ViewModel sigue vivo con los datos de antes: sin esto, el pago o el servicio
    // recién creados no aparecerían hasta salir y volver a entrar a la ficha desde cero.
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        viewModel.cargar()
        viewModel.cargarServiciosTecnicos()
    }

    Scaffold(
        topBar = { AppHeader(titulo = "Ficha del cliente", onBack = { navController.popBackStack() }) },
    ) { padding ->
        StateContent(state = uiState.ficha, onRetry = viewModel::cargar, modifier = Modifier.padding(padding)) { ficha ->
            FichaContent(
                ficha = ficha,
                rolGestor = rolGestor,
                tabSeleccionada = uiState.tabSeleccionada,
                serviciosTecnicos = uiState.serviciosTecnicos,
                onTabChange = viewModel::onTabChange,
                onCobroRapido = viewModel::abrirCobroRapido,
                onElegirCargos = { navController.navigate(Routes.registrarPago(clienteId)) },
                onVerBoleta = { boletaId -> navController.navigate(Routes.boletaDetalle(boletaId)) },
                onEditar = viewModel::abrirEditar,
                onDarDeBaja = viewModel::abrirBaja,
                onVerTodasLasBoletas = { navController.navigate(Routes.BOLETAS) },
                onNuevoServicioTecnico = { navController.navigate(Routes.servicioNuevoParaCliente(clienteId)) },
                onRetryServicios = viewModel::cargarServiciosTecnicos,
                onAgregarServicio = viewModel::abrirAgregarServicio,
                onEditarServicio = viewModel::abrirEditarServicio,
                onAplicarDescuento = viewModel::abrirDescuento,
                onSuspenderServicio = viewModel::suspenderServicio,
                onActivarServicio = viewModel::activarServicio,
                onDarDeBajaServicio = viewModel::abrirBajaServicio,
            )
        }
    }

    if (uiState.mostrarCobroRapido) {
        ModalBottomSheet(onDismissRequest = viewModel::cerrarCobroRapido, sheetState = rememberModalBottomSheetState()) {
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
        ModalBottomSheet(onDismissRequest = viewModel::cerrarEditar, sheetState = rememberModalBottomSheetState()) {
            EditarDatosSheet(uiState = uiState, viewModel = viewModel)
        }
    }

    if (uiState.mostrarBaja) {
        ModalBottomSheet(onDismissRequest = viewModel::cerrarBaja, sheetState = rememberModalBottomSheetState()) {
            DarDeBajaSheet(uiState = uiState, viewModel = viewModel, onDone = { navController.popBackStack() })
        }
    }

    if (uiState.mostrarAgregarServicio) {
        ModalBottomSheet(onDismissRequest = viewModel::cerrarAgregarServicio, sheetState = rememberModalBottomSheetState()) {
            AgregarServicioSheet(uiState = uiState, viewModel = viewModel)
        }
    }

    if (uiState.servicioEditandoId != null) {
        ModalBottomSheet(onDismissRequest = viewModel::cerrarEditarServicio, sheetState = rememberModalBottomSheetState()) {
            EditarServicioSheet(uiState = uiState, viewModel = viewModel)
        }
    }

    if (uiState.servicioDescuentoId != null) {
        ModalBottomSheet(onDismissRequest = viewModel::cerrarDescuento, sheetState = rememberModalBottomSheetState()) {
            AplicarDescuentoSheet(uiState = uiState, viewModel = viewModel)
        }
    }

    if (uiState.servicioBajaId != null) {
        ModalBottomSheet(onDismissRequest = viewModel::cerrarBajaServicio, sheetState = rememberModalBottomSheetState()) {
            DarDeBajaServicioSheet(uiState = uiState, viewModel = viewModel)
        }
    }
}

@Composable
private fun FichaContent(
    ficha: ClienteFichaDto,
    rolGestor: Boolean,
    tabSeleccionada: Int,
    serviciosTecnicos: com.cablera.app.ui.common.UiState<List<ServicioTecnicoDto>>,
    onTabChange: (Int) -> Unit,
    onCobroRapido: () -> Unit,
    onElegirCargos: () -> Unit,
    onVerBoleta: (String) -> Unit,
    onEditar: () -> Unit,
    onDarDeBaja: () -> Unit,
    onVerTodasLasBoletas: () -> Unit,
    onNuevoServicioTecnico: () -> Unit,
    onRetryServicios: () -> Unit,
    onAgregarServicio: () -> Unit,
    onEditarServicio: (String) -> Unit,
    onAplicarDescuento: (String) -> Unit,
    onSuspenderServicio: (String) -> Unit,
    onActivarServicio: (String) -> Unit,
    onDarDeBajaServicio: (String) -> Unit,
) {
    val cliente = ficha.cliente
    Column(modifier = Modifier.fillMaxWidth()) {
        Card(
            shape = RoundedCornerShape(0.dp),
            colors = androidx.compose.material3.CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary),
            modifier = Modifier.fillMaxWidth(),
        ) {
            val onHero = MaterialTheme.colorScheme.onPrimary
            Column(modifier = Modifier.padding(20.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(cliente.nombreCompleto, style = MaterialTheme.typography.titleLarge, color = onHero)
                    EstadoChip(texto = cliente.estadoServicio, colores = coloresEstadoServicio(cliente.estadoServicio))
                }
                Text(
                    "${cliente.dni ?: "sin DNI"}${cliente.telefono?.let { " · $it" } ?: ""}",
                    style = MonoStyles.Body,
                    color = onHero.copy(alpha = 0.75f),
                )
                Text("Saldo total", style = MaterialTheme.typography.labelSmall, color = onHero.copy(alpha = 0.65f), modifier = Modifier.padding(top = 14.dp))
                Text(formatMoney(ficha.saldoTotal), style = MonoStyles.Display, color = onHero)
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(top = 14.dp)) {
                    Button(
                        onClick = onCobroRapido,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = onHero, contentColor = MaterialTheme.colorScheme.primary),
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
            Tab(selected = tabSeleccionada == 2, onClick = { onTabChange(2) }, text = { Text("Servicios") })
        }

        when (tabSeleccionada) {
            0 -> TabDeuda(
                ficha = ficha,
                rolGestor = rolGestor,
                onEditar = onEditar,
                onDarDeBaja = onDarDeBaja,
                onAgregarServicio = onAgregarServicio,
                onEditarServicio = onEditarServicio,
                onAplicarDescuento = onAplicarDescuento,
                onSuspenderServicio = onSuspenderServicio,
                onActivarServicio = onActivarServicio,
                onDarDeBajaServicio = onDarDeBajaServicio,
            )
            1 -> TabPagos(ficha = ficha, onVerBoleta = onVerBoleta, onVerTodasLasBoletas = onVerTodasLasBoletas)
            else -> TabServicios(servicios = serviciosTecnicos, onNuevoServicio = onNuevoServicioTecnico, onRetry = onRetryServicios)
        }
    }
}

@Composable
private fun TabDeuda(
    ficha: ClienteFichaDto,
    rolGestor: Boolean,
    onEditar: () -> Unit,
    onDarDeBaja: () -> Unit,
    onAgregarServicio: () -> Unit,
    onEditarServicio: (String) -> Unit,
    onAplicarDescuento: (String) -> Unit,
    onSuspenderServicio: (String) -> Unit,
    onActivarServicio: (String) -> Unit,
    onDarDeBajaServicio: (String) -> Unit,
) {
    val cliente = ficha.cliente
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Card {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Zona: ${cliente.zona.nombre}")
                    if (!cliente.direccion.isNullOrBlank()) Text("Dirección: ${cliente.direccion}")
                    Text("Alta: ${formatFechaCorta(cliente.fechaAlta)}")
                    if (cliente.estadoServicio == "retirado" && !cliente.motivoBaja.isNullOrBlank()) {
                        Text("Dado de baja: ${cliente.motivoBaja}", modifier = Modifier.padding(top = 8.dp))
                    }
                    if (rolGestor && cliente.estadoServicio != "retirado") {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 12.dp)) {
                            OutlinedButton(onClick = onEditar) { Text("Editar datos") }
                            OutlinedButton(onClick = onDarDeBaja) { Text("Dar de baja") }
                        }
                    }
                }
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Text("Servicios contratados", style = MaterialTheme.typography.titleMedium)
                if (rolGestor) TextButton(onClick = onAgregarServicio) { Text("+ Agregar") }
            }
        }
        items(cliente.serviciosContratados, key = { it.id }) { servicio ->
            ServicioContratadoCard(
                servicio = servicio,
                rolGestor = rolGestor,
                onEditar = { onEditarServicio(servicio.id) },
                onAplicarDescuento = { onAplicarDescuento(servicio.id) },
                onSuspender = { onSuspenderServicio(servicio.id) },
                onActivar = { onActivarServicio(servicio.id) },
                onDarDeBaja = { onDarDeBajaServicio(servicio.id) },
            )
        }
        item { Text("Deuda mes a mes", style = MaterialTheme.typography.titleMedium) }
        val cargosPendientes = ficha.cargosMesAMes.filter { it.estado != "pagado" }
        if (cargosPendientes.isEmpty()) {
            item { EmptyState(mensaje = "Sin meses pendientes: el cliente está al día.") }
        }
        items(cargosPendientes.chunked(2)) { fila ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                fila.forEach { cargo -> CargoCard(cargo = cargo, modifier = Modifier.weight(1f)) }
                if (fila.size == 1) Column(modifier = Modifier.weight(1f)) {}
            }
        }
    }
}

@Composable
private fun ServicioContratadoCard(
    servicio: ServicioContratadoDto,
    rolGestor: Boolean,
    onEditar: () -> Unit,
    onAplicarDescuento: () -> Unit,
    onSuspender: () -> Unit,
    onActivar: () -> Unit,
    onDarDeBaja: () -> Unit,
) {
    Card {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Text(servicio.tipoServicio.nombre.replaceFirstChar(Char::uppercase), style = MaterialTheme.typography.titleMedium)
                EstadoChip(texto = servicio.estado, colores = coloresEstadoServicio(servicio.estado))
            }
            Text(formatMoney(servicio.montoBase), style = MonoStyles.Body, modifier = Modifier.padding(top = 6.dp))
            if (servicio.descuentoVigente != null) {
                Text(
                    "Descuento ${servicio.descuentoVigente.porcentaje}% vigente · efectivo ${formatMoney(servicio.montoEfectivo)}",
                    color = MaterialTheme.colorScheme.primary,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            if (servicio.fechaFacturacionOverride != null) {
                Text("Facturación propia: día ${servicio.fechaFacturacionOverride}", style = MaterialTheme.typography.bodySmall)
            }
            if (servicio.estado == "retirado" && !servicio.motivoBaja.isNullOrBlank()) {
                Text("Dado de baja: ${servicio.motivoBaja}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
            }
            if (rolGestor && servicio.estado != "retirado") {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 10.dp)) {
                    OutlinedButton(onClick = onEditar, contentPadding = PaddingValues(horizontal = 10.dp)) { Text("Editar", style = MaterialTheme.typography.labelSmall) }
                    OutlinedButton(onClick = onAplicarDescuento, contentPadding = PaddingValues(horizontal = 10.dp)) { Text("Descuento", style = MaterialTheme.typography.labelSmall) }
                    if (servicio.estado == "activo") {
                        OutlinedButton(onClick = onSuspender, contentPadding = PaddingValues(horizontal = 10.dp)) { Text("Suspender", style = MaterialTheme.typography.labelSmall) }
                    } else {
                        OutlinedButton(onClick = onActivar, contentPadding = PaddingValues(horizontal = 10.dp)) { Text("Activar", style = MaterialTheme.typography.labelSmall) }
                    }
                    OutlinedButton(onClick = onDarDeBaja, contentPadding = PaddingValues(horizontal = 10.dp)) { Text("Baja", style = MaterialTheme.typography.labelSmall) }
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
        items(ficha.historialPagos, key = { it.id }) { boleta ->
            BoletaHistorialRow(boleta = boleta, onClick = { onVerBoleta(boleta.id) })
        }
        item {
            TextButton(onClick = onVerTodasLasBoletas) { Text("Ver todas las boletas") }
        }
    }
}

@Composable
private fun TabServicios(
    servicios: com.cablera.app.ui.common.UiState<List<ServicioTecnicoDto>>,
    onNuevoServicio: () -> Unit,
    onRetry: () -> Unit,
) {
    StateContent(state = servicios, onRetry = onRetry) { lista ->
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item {
                OutlinedButton(onClick = onNuevoServicio, modifier = Modifier.fillMaxWidth()) { Text("+ Nuevo servicio") }
            }
            if (lista.isEmpty()) {
                item { EmptyState(mensaje = "Sin servicios técnicos registrados.") }
            }
            items(lista, key = { it.id }) { servicio ->
                Card {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Text(servicio.folio, style = MaterialTheme.typography.titleMedium)
                            EstadoChip(
                                texto = servicio.estado.replace("_", " "),
                                colores = coloresEstadoCargo(if (servicio.estado == EstadosServicioTecnico.LIQUIDADO) "pagado" else "pendiente"),
                            )
                        }
                        Text(servicio.tipo, style = MaterialTheme.typography.bodyMedium)
                        Text("Creado ${formatFechaCorta(servicio.fechaCreacion)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        if (!servicio.comentario.isNullOrBlank()) {
                            Text(servicio.comentario, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CargoCard(cargo: CargoPendienteDto, modifier: Modifier = Modifier) {
    Card(modifier = modifier) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text("${nombreMes(cargo.mes)} ${cargo.anio}", style = MaterialTheme.typography.labelSmall)
            if (cargo.tipoServicio != null) {
                Text(cargo.tipoServicio.nombre.replaceFirstChar(Char::uppercase), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text(formatMoney(cargo.montoCorrespondiente), style = MonoStyles.Body, modifier = Modifier.padding(vertical = 4.dp))
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
                Text(
                    formatMoney(boleta.montoTotal),
                    style = MonoStyles.Body,
                    textDecoration = if (boleta.estado == "anulada") TextDecoration.LineThrough else TextDecoration.None,
                )
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
    Column(modifier = Modifier.padding(20.dp)) {
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
            Text(if (uiState.enviandoCobro) "Registrando..." else "Registrar y emitir boleta")
        }
    }
}

@Composable
private fun EditarDatosSheet(uiState: ClienteFichaUiState, viewModel: ClienteFichaViewModel) {
    Column(modifier = Modifier.padding(20.dp)) {
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
    Column(modifier = Modifier.padding(20.dp)) {
        Text("Dar de baja", style = MaterialTheme.typography.titleLarge)
        Text(
            "El cliente pasará a \"retirado\" conservando su historial.",
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
                colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
            ) {
                Text(if (uiState.enviandoBaja) "Confirmando..." else "Confirmar baja")
            }
        }
    }
}

@Composable
private fun AgregarServicioSheet(uiState: ClienteFichaUiState, viewModel: ClienteFichaViewModel) {
    Column(modifier = Modifier.padding(20.dp)) {
        Text("Agregar servicio", style = MaterialTheme.typography.titleLarge)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 14.dp)) {
            uiState.tiposServicio.forEach { tipo ->
                FilterChip(
                    selected = uiState.nuevoServicioTipoId == tipo.id,
                    onClick = { viewModel.onNuevoServicioTipoChange(tipo.id) },
                    label = { Text(tipo.nombre.replaceFirstChar(Char::uppercase)) },
                )
            }
        }
        OutlinedTextField(
            value = uiState.nuevoServicioMonto,
            onValueChange = viewModel::onNuevoServicioMontoChange,
            label = { Text("Monto base mensual (S/)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
        )
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth().padding(top = 12.dp)) {
            Text("Fecha de facturación propia", style = MaterialTheme.typography.bodyMedium)
            Switch(checked = uiState.nuevoServicioFacturacionPropia, onCheckedChange = viewModel::onNuevoServicioFacturacionPropiaChange)
        }
        if (uiState.nuevoServicioFacturacionPropia) {
            OutlinedTextField(
                value = uiState.nuevoServicioDia,
                onValueChange = viewModel::onNuevoServicioDiaChange,
                label = { Text("Día del mes (1-28)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
            )
        }
        if (uiState.errorServicio != null) {
            Text(uiState.errorServicio, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp))
        }
        Button(
            onClick = viewModel::confirmarAgregarServicio,
            enabled = !uiState.guardandoServicio,
            modifier = Modifier.fillMaxWidth().padding(top = 16.dp, bottom = 8.dp),
        ) {
            Text(if (uiState.guardandoServicio) "Guardando..." else "Agregar servicio")
        }
    }
}

@Composable
private fun EditarServicioSheet(uiState: ClienteFichaUiState, viewModel: ClienteFichaViewModel) {
    Column(modifier = Modifier.padding(20.dp)) {
        Text("Editar servicio", style = MaterialTheme.typography.titleLarge)
        OutlinedTextField(
            value = uiState.editServicioMonto,
            onValueChange = viewModel::onEditServicioMontoChange,
            label = { Text("Monto base mensual (S/)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
        )
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth().padding(top = 12.dp)) {
            Text("Fecha de facturación propia", style = MaterialTheme.typography.bodyMedium)
            Switch(checked = uiState.editServicioFacturacionPropia, onCheckedChange = viewModel::onEditServicioFacturacionPropiaChange)
        }
        if (uiState.editServicioFacturacionPropia) {
            OutlinedTextField(
                value = uiState.editServicioDia,
                onValueChange = viewModel::onEditServicioDiaChange,
                label = { Text("Día del mes (1-28)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
            )
        }
        if (uiState.errorEditarServicio != null) {
            Text(uiState.errorEditarServicio, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp))
        }
        Button(
            onClick = viewModel::confirmarEditarServicio,
            enabled = !uiState.guardandoEditarServicio,
            modifier = Modifier.fillMaxWidth().padding(top = 16.dp, bottom = 8.dp),
        ) {
            Text(if (uiState.guardandoEditarServicio) "Guardando..." else "Guardar cambios")
        }
    }
}

@Composable
private fun AplicarDescuentoSheet(uiState: ClienteFichaUiState, viewModel: ClienteFichaViewModel) {
    Column(modifier = Modifier.padding(20.dp)) {
        Text("Aplicar descuento", style = MaterialTheme.typography.titleLarge)
        Text(
            "Se aplica solo a este servicio, por la cantidad de meses indicada.",
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(top = 6.dp),
        )
        OutlinedTextField(
            value = uiState.descuentoPorcentaje,
            onValueChange = viewModel::onDescuentoPorcentajeChange,
            label = { Text("Porcentaje de descuento (0-100)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
        )
        OutlinedTextField(
            value = uiState.descuentoCantidadMeses,
            onValueChange = viewModel::onDescuentoCantidadMesesChange,
            label = { Text("Cantidad de meses") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
        )
        if (uiState.errorDescuento != null) {
            Text(uiState.errorDescuento, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp))
        }
        Button(
            onClick = viewModel::confirmarDescuento,
            enabled = !uiState.guardandoDescuento,
            modifier = Modifier.fillMaxWidth().padding(top = 16.dp, bottom = 8.dp),
        ) {
            Text(if (uiState.guardandoDescuento) "Aplicando..." else "Aplicar descuento")
        }
    }
}

@Composable
private fun DarDeBajaServicioSheet(uiState: ClienteFichaUiState, viewModel: ClienteFichaViewModel) {
    Column(modifier = Modifier.padding(20.dp)) {
        Text("Dar de baja este servicio", style = MaterialTheme.typography.titleLarge)
        Text(
            "El servicio pasará a \"retirado\"; los demás servicios del cliente no se ven afectados.",
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(top = 6.dp),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 14.dp)) {
            MOTIVOS_BAJA.forEach { motivo ->
                FilterChip(selected = uiState.motivoBajaServicio == motivo, onClick = { viewModel.onMotivoBajaServicioChange(motivo) }, label = { Text(motivo) })
            }
        }
        if (uiState.errorBajaServicio != null) {
            Text(uiState.errorBajaServicio, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 16.dp, bottom = 8.dp)) {
            TextButton(onClick = viewModel::cerrarBajaServicio) { Text("Cancelar") }
            Button(
                onClick = viewModel::confirmarBajaServicio,
                enabled = !uiState.enviandoBajaServicio,
                colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
            ) {
                Text(if (uiState.enviandoBajaServicio) "Confirmando..." else "Confirmar baja")
            }
        }
    }
}
