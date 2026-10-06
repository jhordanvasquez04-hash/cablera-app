package com.cablera.app.ui.ordenes

import com.cablera.app.ui.theme.colorCabecera
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import com.cablera.app.ui.common.UiState
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Notes
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Engineering
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.cablera.app.LocalAppContainer
import com.cablera.app.data.remote.dto.EstadosOrdenServicio
import com.cablera.app.data.remote.dto.OrdenServicioDto
import com.cablera.app.data.remote.dto.Roles
import com.cablera.app.ui.common.AppHeader
import com.cablera.app.ui.common.ETIQUETAS_TIPO_ORDEN
import com.cablera.app.ui.common.EstadoChip
import com.cablera.app.ui.common.LambdaViewModelFactory
import com.cablera.app.ui.common.StateContent
import com.cablera.app.ui.common.coloresEstadoOrden
import com.cablera.app.ui.theme.CableraError
import com.cablera.app.ui.theme.CableraNeutral
import com.cablera.app.ui.theme.CableraSuccess
import com.cablera.app.ui.theme.MonoStyles
import com.cablera.app.util.formatFechaHora

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrdenServicioDetalleScreen(
    navController: NavHostController,
    ordenId: String,
    viewModel: OrdenServicioDetalleViewModel = run {
        val container = LocalAppContainer.current
        viewModel(factory = LambdaViewModelFactory { OrdenServicioDetalleViewModel(ordenId, container.ordenesServicioRepository, container.contratosRepository, container.clientesRepository) })
    },
) {
    val container = LocalAppContainer.current
    val session by container.authRepository.session.collectAsStateWithLifecycle(initialValue = null)
    val esGestor = session?.usuario?.rol == Roles.GESTOR
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var confirmarCancelar by remember { mutableStateOf(false) }

    Scaffold(topBar = { AppHeader(titulo = "Orden de servicio", onBack = { navController.popBackStack() }) }) { padding ->
        StateContent(state = uiState.orden, modifier = Modifier.padding(padding), onRetry = viewModel::cargar) { orden ->
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Encabezado(orden)
                Seguimiento(orden)
                ClienteYUbicacion(orden)
                TecnicoAsignado(orden)
                if (!orden.observacion.isNullOrBlank()) Observacion(orden.observacion)
                if (!orden.ipWan.isNullOrBlank() || !orden.pppoeUsuario.isNullOrBlank() || !orden.precinto.isNullOrBlank()) DatosDeRed(orden)

                if (uiState.error != null) {
                    Text(uiState.error ?: "", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
                }

                // El gestor puede trabajar la orden desde el celular, igual que en la web. Completar NO exige que la
                // orden tenga técnico asignado.
                val abierta = orden.estado != EstadosOrdenServicio.COMPLETADA && orden.estado != EstadosOrdenServicio.CANCELADA
                if (esGestor && abierta) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Button(
                            onClick = viewModel::abrirCompletar,
                            enabled = !uiState.procesando,
                            colors = ButtonDefaults.buttonColors(containerColor = CableraSuccess),
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                        ) {
                            Icon(Icons.Filled.CheckCircle, contentDescription = null, modifier = Modifier.padding(end = 8.dp))
                            Text("Completar orden")
                        }
                        if (orden.estado == EstadosOrdenServicio.ASIGNADA) {
                            Button(onClick = viewModel::iniciar, enabled = !uiState.procesando, modifier = Modifier.fillMaxWidth().height(52.dp)) {
                                Icon(Icons.Filled.PlayArrow, contentDescription = null, modifier = Modifier.padding(end = 8.dp))
                                Text("Iniciar trabajo")
                            }
                        }
                        Box {
                            OutlinedButton(
                                onClick = viewModel::abrirSelectorTecnico,
                                enabled = !uiState.procesando,
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                            ) {
                                Icon(Icons.Filled.Engineering, contentDescription = null, modifier = Modifier.padding(end = 8.dp))
                                Text(if (orden.tecnicoId != null) "Reasignar técnico" else "Asignar técnico")
                            }
                            DropdownMenu(expanded = uiState.mostrarSelectorTecnico, onDismissRequest = viewModel::cerrarSelectorTecnico) {
                                if (uiState.tecnicos.isEmpty()) {
                                    DropdownMenuItem(text = { Text("Cargando técnicos…") }, onClick = {})
                                }
                                uiState.tecnicos.forEach { tecnico ->
                                    DropdownMenuItem(
                                        text = { Text("${tecnico.nombre} ${tecnico.apellido}") },
                                        onClick = { viewModel.asignarTecnico(tecnico.id) },
                                    )
                                }
                            }
                        }
                        OutlinedButton(
                            onClick = { confirmarCancelar = true },
                            enabled = !uiState.procesando,
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = CableraError),
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                        ) { Text("Cancelar orden") }
                    }
                }
            }
        }
    }

    // Cancelar no se puede deshacer: se pide confirmación.
    if (confirmarCancelar) {
        AlertDialog(
            onDismissRequest = { confirmarCancelar = false },
            title = { Text("¿Cancelar esta orden?") },
            text = { Text("La orden pasará a \"cancelada\" y ya no se podrá trabajar.") },
            confirmButton = {
                TextButton(onClick = { confirmarCancelar = false; viewModel.cancelar() }) {
                    Text("Sí, cancelar", color = CableraError)
                }
            },
            dismissButton = { TextButton(onClick = { confirmarCancelar = false }) { Text("Volver") } },
        )
    }

    if (uiState.mostrarCompletar) {
        val orden = (uiState.orden as? UiState.Success)?.data
        if (orden != null) {
            ModalBottomSheet(onDismissRequest = viewModel::cerrarCompletar, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
                CompletarSheet(orden = orden, uiState = uiState, viewModel = viewModel)
            }
        }
    }
}

/** Hoja para completar la orden: pide solo lo que la web pide según el tipo (punto de red o nuevo titular). */
@Composable
private fun CompletarSheet(orden: OrdenServicioDto, uiState: OrdenServicioDetalleUiState, viewModel: OrdenServicioDetalleViewModel) {
    val esInstalacion = orden.tipoOrden.startsWith("instalacion") && orden.contratoId != null
    val esCambioTitular = orden.tipoOrden == "cambio_titular" && orden.contratoId != null
    Column(modifier = Modifier.imePadding().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Completar orden", style = MaterialTheme.typography.titleLarge)
        Text(
            if (orden.tecnico == null) "Esta orden no tiene técnico asignado: se puede completar igual." else "La orden pasará a completada.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        if (esInstalacion) {
            Text("Datos de instalación", style = MaterialTheme.typography.labelLarge)
            var menuPunto by remember { mutableStateOf(false) }
            Box {
                OutlinedButton(onClick = { menuPunto = true }, modifier = Modifier.fillMaxWidth()) {
                    Text(uiState.puntosRed.find { it.id == uiState.puntoRedId }?.let { "${it.codigo} (${it.tipo.uppercase()})" } ?: "Selecciona el punto de red")
                }
                DropdownMenu(expanded = menuPunto, onDismissRequest = { menuPunto = false }) {
                    if (uiState.puntosRed.isEmpty()) DropdownMenuItem(text = { Text("Sin puntos de red") }, onClick = {}, enabled = false)
                    uiState.puntosRed.forEach { punto ->
                        DropdownMenuItem(text = { Text("${punto.codigo} (${punto.tipo.uppercase()})") }, onClick = { viewModel.onPuntoRedChange(punto.id); menuPunto = false })
                    }
                }
            }
            OutlinedTextField(
                value = uiState.equipoSerie,
                onValueChange = viewModel::onEquipoSerieChange,
                label = { Text("N° de serie / MAC del equipo (opcional)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
        }

        if (esCambioTitular) {
            Text("Nuevo titular", style = MaterialTheme.typography.labelLarge)
            val titular = uiState.nuevoTitular
            if (titular != null) {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(12.dp)) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(titular.nombreCompleto, style = MaterialTheme.typography.titleSmall)
                            Text(titular.dni ?: "Sin DNI", style = MaterialTheme.typography.bodySmall)
                        }
                        TextButton(onClick = { viewModel.elegirTitular(null) }) { Text("Cambiar") }
                    }
                }
            } else {
                OutlinedTextField(
                    value = uiState.busquedaTitular,
                    onValueChange = viewModel::onBusquedaTitularChange,
                    label = { Text("Buscar cliente por nombre o DNI") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                uiState.resultadosTitular.forEach { cliente ->
                    Text(
                        "${cliente.nombreCompleto} · ${cliente.dni ?: ""}",
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.fillMaxWidth().clickable { viewModel.elegirTitular(cliente) }.padding(vertical = 10.dp),
                    )
                }
            }
        }

        if (uiState.errorCompletar != null) Text(uiState.errorCompletar ?: "", color = MaterialTheme.colorScheme.error)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(bottom = 8.dp)) {
            TextButton(onClick = viewModel::cerrarCompletar) { Text("Cancelar") }
            Button(onClick = viewModel::confirmarCompletar, enabled = !uiState.procesando, colors = ButtonDefaults.buttonColors(containerColor = CableraSuccess)) {
                Text(if (uiState.procesando) "Completando..." else "Completar orden")
            }
        }
    }
}

/** Tarjeta azul con lo esencial: número, estado, tipo, servicio y fecha programada. */
@Composable
private fun Encabezado(orden: OrdenServicioDto) {
    val colores = coloresEstadoOrden(orden.estado)
    Card(
        colors = CardDefaults.cardColors(containerColor = colorCabecera()),
        shape = RoundedCornerShape(18.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            val sobreAzul = Color.White
            Row(horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Text(orden.nServicio, style = MonoStyles.Body, color = sobreAzul.copy(alpha = 0.75f))
                EstadoChip(texto = orden.estado.replace("_", " "), colores = colores)
            }
            Text(
                ETIQUETAS_TIPO_ORDEN[orden.tipoOrden] ?: orden.tipoOrden,
                style = MaterialTheme.typography.headlineSmall,
                color = sobreAzul,
                modifier = Modifier.padding(top = 10.dp),
            )
            Text(
                orden.tipoServicio.replaceFirstChar(Char::uppercase) + (orden.plan?.let { " · ${it.nombre}" } ?: ""),
                style = MaterialTheme.typography.bodyMedium,
                color = sobreAzul.copy(alpha = 0.85f),
            )
            orden.contrato?.let {
                Text("Contrato ${it.numero}", style = MaterialTheme.typography.bodySmall, color = sobreAzul.copy(alpha = 0.7f))
            }
            Text(
                "Programada · ${formatFechaHora(orden.fechaServicio)}",
                style = MaterialTheme.typography.bodySmall,
                color = sobreAzul.copy(alpha = 0.7f),
                modifier = Modifier.padding(top = 12.dp),
            )
        }
    }
}

private class Paso(val titulo: String, val fecha: String?, val color: Color)

/** Línea de tiempo: cada paso cumplido lleva su fecha; los que faltan quedan en gris. */
@Composable
private fun Seguimiento(orden: OrdenServicioDto) {
    val cancelada = orden.estado == EstadosOrdenServicio.CANCELADA
    val pasos = buildList {
        add(Paso("Programada", orden.fechaServicio, MaterialTheme.colorScheme.primary))
        add(Paso("Asignada a técnico", orden.fechaAsignacion, MaterialTheme.colorScheme.primary))
        add(Paso("Aceptada por el técnico", orden.fechaAceptacion, MaterialTheme.colorScheme.primary))
        add(Paso("En proceso", orden.fechaInicio, MaterialTheme.colorScheme.primary))
        if (cancelada) add(Paso("Cancelada", "cancelada", CableraError)) else add(Paso("Completada", orden.fechaFin, CableraSuccess))
    }
    Tarjeta(titulo = "Seguimiento") {
        pasos.forEachIndexed { i, paso ->
            val hecho = paso.fecha != null
            val ultimo = i == pasos.lastIndex
            Row(modifier = Modifier.height(IntrinsicSize.Min)) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(22.dp)) {
                    Box(
                        modifier = Modifier
                            .padding(top = 2.dp)
                            .size(14.dp)
                            .then(
                                if (hecho) Modifier.background(paso.color, CircleShape)
                                else Modifier.border(2.dp, MaterialTheme.colorScheme.outline, CircleShape),
                            ),
                    )
                    if (!ultimo) {
                        Box(
                            modifier = Modifier
                                .width(2.dp)
                                .weight(1f)
                                .background(if (pasos[i + 1].fecha != null) paso.color.copy(alpha = 0.5f) else MaterialTheme.colorScheme.outlineVariant),
                        )
                    }
                }
                Column(modifier = Modifier.padding(start = 10.dp, bottom = if (ultimo) 0.dp else 14.dp)) {
                    Text(
                        paso.titulo,
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (hecho) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                    )
                    if (paso.fecha != null && paso.fecha != "cancelada") {
                        Text(formatFechaHora(paso.fecha), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
        orden.tiempoInstalacionMin?.let {
            Text("Duración: $it min", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 10.dp))
        }
    }
}

@Composable
private fun ClienteYUbicacion(orden: OrdenServicioDto) {
    val context = LocalContext.current
    Tarjeta(titulo = "Cliente y ubicación") {
        Fila(Icons.Filled.Person, orden.abonado)
        if (!orden.dni.isNullOrBlank()) Fila(Icons.Filled.Badge, "DNI ${orden.dni}", secundario = true)
        Fila(Icons.Filled.LocationOn, orden.direccion + (orden.referencia?.takeIf { it.isNotBlank() }?.let { "\nRef: $it" } ?: ""))
        if (!orden.celular.isNullOrBlank()) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(top = 4.dp)) {
                Fila(Icons.Filled.Call, orden.celular, modifier = Modifier.weight(1f))
                OutlinedButton(onClick = { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${orden.celular}"))) }) { Text("Llamar") }
            }
        }
        if (orden.latitud != null && orden.longitud != null) {
            OutlinedButton(
                onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("geo:${orden.latitud},${orden.longitud}?q=${orden.latitud},${orden.longitud}"))) },
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
            ) { Text("Ver en el mapa") }
        }
    }
}

@Composable
private fun TecnicoAsignado(orden: OrdenServicioDto) {
    Tarjeta(titulo = "Técnico") {
        val tecnico = orden.tecnico
        if (tecnico == null) {
            Fila(Icons.Filled.Engineering, "Sin técnico asignado todavía", secundario = true)
        } else {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier.size(40.dp).background(MaterialTheme.colorScheme.primaryContainer, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        "${tecnico.nombre.take(1)}${tecnico.apellido.take(1)}".uppercase(),
                        style = MaterialTheme.typography.titleSmall,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
                Column(modifier = Modifier.padding(start = 12.dp)) {
                    Text("${tecnico.nombre} ${tecnico.apellido}", style = MaterialTheme.typography.titleMedium)
                    Text("Técnico asignado", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@Composable
private fun Observacion(texto: String) {
    Tarjeta(titulo = "Observación") { Fila(Icons.AutoMirrored.Filled.Notes, texto) }
}

@Composable
private fun DatosDeRed(orden: OrdenServicioDto) {
    Tarjeta(titulo = "Datos de red") {
        listOf("IP WAN" to orden.ipWan, "Usuario PPPoE" to orden.pppoeUsuario, "Precinto" to orden.precinto)
            .filter { !it.second.isNullOrBlank() }
            .forEach { (etiqueta, valor) ->
                Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
                    Text(etiqueta, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(valor.orEmpty(), style = MonoStyles.Body)
                }
            }
    }
}

/** Tarjeta blanca con título de sección. */
@Composable
private fun Tarjeta(titulo: String, contenido: @Composable () -> Unit) {
    Card(shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(titulo, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(bottom = 10.dp))
            contenido()
        }
    }
}

/** Fila con icono y texto. */
@Composable
private fun Fila(icono: ImageVector, texto: String, secundario: Boolean = false, modifier: Modifier = Modifier) {
    Row(verticalAlignment = Alignment.Top, modifier = modifier.padding(vertical = 3.dp)) {
        Icon(icono, contentDescription = null, tint = CableraNeutral, modifier = Modifier.size(20.dp).padding(top = 1.dp))
        Text(
            texto,
            style = MaterialTheme.typography.bodyMedium,
            color = if (secundario) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(start = 12.dp),
        )
    }
}
