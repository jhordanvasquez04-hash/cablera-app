package com.cablera.app.ui.contratos

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
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
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.Router
import androidx.compose.material.icons.filled.Tv
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.cablera.app.LocalAppContainer
import com.cablera.app.data.remote.dto.Roles
import com.cablera.app.data.remote.dto.CargoPendienteDto
import com.cablera.app.data.remote.dto.ContratoDto
import com.cablera.app.data.remote.dto.OrdenServicioDto
import com.cablera.app.ui.common.AppHeader
import com.cablera.app.ui.common.ETIQUETAS_TIPO_ORDEN
import com.cablera.app.ui.common.EstadoChip
import com.cablera.app.ui.common.LambdaViewModelFactory
import com.cablera.app.ui.common.StateContent
import com.cablera.app.ui.common.coloresEstadoCargo
import com.cablera.app.ui.common.coloresEstadoOrden
import com.cablera.app.ui.common.coloresEstadoServicio
import com.cablera.app.ui.navigation.Routes
import com.cablera.app.ui.theme.CableraError
import com.cablera.app.ui.theme.CableraNeutral
import com.cablera.app.ui.theme.CableraSuccess
import com.cablera.app.ui.theme.CableraSuccessBg
import com.cablera.app.ui.theme.Negro
import com.cablera.app.ui.theme.TextMuted
import com.cablera.app.util.formatFechaCorta
import com.cablera.app.util.formatMoney
import com.cablera.app.util.nombreMes

// Ficha de UN contrato, con un diseño a propósito distinto al de la ficha del cliente (bloque
// negro): acá es una "tarjeta de servicio" tipo ticket, blanca con borde negro y una franja de
// color según el estado, para que se note al toque que se está viendo un contrato.

@Composable
fun ContratoDetalleScreen(
    navController: NavHostController,
    contratoId: String,
    viewModel: ContratoDetalleViewModel = run {
        val container = LocalAppContainer.current
        viewModel(factory = LambdaViewModelFactory { ContratoDetalleViewModel(contratoId, container.contratosRepository, container.clientesRepository) })
    },
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    // Servicios técnicos: solo el gestor (sin sesión cargada todavía, ocultos).
    val sesion by LocalAppContainer.current.authRepository.session.collectAsStateWithLifecycle(initialValue = null)
    val rolGestor = sesion?.usuario?.rol == Roles.GESTOR

    Scaffold(topBar = { AppHeader(titulo = "Ficha del contrato", onBack = { navController.popBackStack() }) }) { padding ->
        StateContent(state = uiState, modifier = Modifier.padding(padding), onRetry = viewModel::cargar) { ficha ->
            val c = ficha.contrato
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Aparecer(0) { TarjetaServicio(c) }
                Aparecer(1) {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Button(
                            onClick = { navController.navigate(Routes.registrarPago(c.clienteId, c.id)) },
                            modifier = Modifier.weight(1f).height(50.dp),
                        ) { Text("Cobrar", fontWeight = FontWeight.SemiBold) }
                        if (rolGestor) {
                            OutlinedButton(
                                onClick = { navController.navigate(Routes.nuevaOrden(c.id)) },
                                modifier = Modifier.weight(1f).height(50.dp),
                            ) { Text("Servicio técnico", fontWeight = FontWeight.SemiBold) }
                        }
                    }
                }
                Aparecer(2) {
                    Seccion(Icons.Filled.Person, "Titular") {
                        Text(c.clienteNombre, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        Fila("DNI", c.clienteDni)
                        Fila("Teléfono", c.clienteTelefono)
                        TextButton(
                            onClick = { navController.navigate(Routes.clienteFicha(c.clienteId)) },
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(0.dp),
                        ) {
                            Text("Ver ficha del cliente")
                            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, modifier = Modifier.size(18.dp))
                        }
                    }
                }
                Aparecer(3) { SeccionDeuda(ficha) }
                Aparecer(4) {
                    Seccion(Icons.Filled.Home, "Instalación") {
                        Fila("Dirección", c.direccion)
                        Fila("Referencia", c.referencia)
                        Fila("Sector", c.sector)
                        Fila("Instalado el", c.fechaInstalacion?.let(::formatFechaCorta))
                        Fila("Técnico", c.tecnicoInstalador?.let { "${it.nombre} ${it.apellido}" })
                        if (c.latitud != null && c.longitud != null) BotonMapa(c.latitud, c.longitud)
                    }
                }
                Aparecer(5) { SeccionRed(c) }
                if (rolGestor) Aparecer(6) { SeccionServicios(ficha, onVer = { navController.navigate(Routes.ordenServicioDetalle(it)) }) }
            }
        }
    }
}

// ── Tarjeta principal ──────────────────────────────────────────────────────────

@Composable
private fun TarjetaServicio(c: ContratoDto) {
    val colorEstado = when (c.estado) {
        "activo" -> CableraSuccess
        "suspendido" -> CableraNeutral
        else -> CableraError
    }
    val (icono, nombreServicio) = when (c.tipoServicio) {
        "cable" -> Icons.Filled.Tv to "Cable"
        "duo" -> Icons.Filled.Router to "Dúo · Internet + Cable"
        else -> Icons.Filled.Wifi to "Internet"
    }
    // Colores del tema: blanca con borde negro en modo claro, gris carbón con borde claro en oscuro
    val tinta = MaterialTheme.colorScheme.onSurface
    Card(
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.5.dp, tinta),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(modifier = Modifier.height(IntrinsicSize.Min)) {
            // Franja de color según el estado del contrato
            Box(modifier = Modifier.width(8.dp).fillMaxHeight().background(colorEstado))
            Column(modifier = Modifier.weight(1f).padding(18.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier.size(52.dp).background(tinta, CircleShape),
                        contentAlignment = Alignment.Center,
                    ) { Icon(icono, contentDescription = null, tint = MaterialTheme.colorScheme.surface, modifier = Modifier.size(26.dp)) }
                    Column(modifier = Modifier.padding(start = 14.dp).weight(1f)) {
                        Text(nombreServicio.uppercase(), fontSize = 11.sp, letterSpacing = 1.sp, color = TextMuted, fontWeight = FontWeight.SemiBold)
                        Text(c.numero, fontSize = 21.sp, fontWeight = FontWeight.ExtraBold, fontFamily = FontFamily.Monospace)
                    }
                    EstadoChip(texto = c.estado, colores = coloresEstadoServicio(c.estado))
                }
                if (!c.planNombre.isNullOrBlank()) {
                    Text(
                        c.planNombre,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier
                            .padding(top = 12.dp)
                            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(50))
                            .padding(horizontal = 12.dp, vertical = 5.dp),
                    )
                }
                LineaPunteada(modifier = Modifier.padding(vertical = 16.dp))
                Row {
                    Dato("Mensualidad", formatMoney(c.costoMensual), Modifier.weight(1f))
                    Dato("Día de corte", c.diaCorte?.let { "Día $it" } ?: "—", Modifier.weight(1f))
                    Dato(
                        "Deuda",
                        formatMoney(c.deudaPendiente),
                        Modifier.weight(1f),
                        color = if (c.deudaPendiente > 0.009) CableraError else CableraSuccess,
                    )
                }
                if (!c.motivoBaja.isNullOrBlank() || !c.fechaCorte.isNullOrBlank()) {
                    Text(
                        listOfNotNull(
                            c.fechaCorte?.let { "Cortado el ${formatFechaCorta(it)}" },
                            c.motivoBaja?.takeIf { it.isNotBlank() }?.let { "Motivo de baja: $it" },
                        ).joinToString(" · "),
                        fontSize = 12.sp,
                        color = CableraError,
                        modifier = Modifier.padding(top = 12.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun Dato(etiqueta: String, valor: String, modifier: Modifier = Modifier, color: Color = MaterialTheme.colorScheme.onSurface) {
    Column(modifier = modifier) {
        Text(etiqueta, fontSize = 11.sp, color = TextMuted)
        Text(valor, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = color, fontFamily = FontFamily.Monospace)
    }
}

/** Línea punteada como la de un ticket. */
@Composable
private fun LineaPunteada(modifier: Modifier = Modifier) {
    Canvas(modifier = modifier.fillMaxWidth().height(1.dp)) {
        drawLine(
            color = Color(0xFFC7C7CC),
            start = Offset(0f, 0f),
            end = Offset(size.width, 0f),
            strokeWidth = 2f,
            pathEffect = PathEffect.dashPathEffect(floatArrayOf(12f, 10f)),
        )
    }
}

// ── Secciones ─────────────────────────────────────────────────────────────────

@Composable
private fun Seccion(icono: ImageVector, titulo: String, contenido: @Composable () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 4.dp)) {
                Box(
                    modifier = Modifier.size(30.dp).background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(10.dp)),
                    contentAlignment = Alignment.Center,
                ) { Icon(icono, contentDescription = null, modifier = Modifier.size(17.dp)) }
                Text(titulo, fontSize = 15.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 10.dp))
            }
            contenido()
        }
    }
}

/** Etiqueta a la izquierda, valor a la derecha. No se muestra si no hay valor. */
@Composable
private fun Fila(etiqueta: String, valor: String?, copiable: Boolean = false) {
    if (valor.isNullOrBlank()) return
    val portapapeles = LocalClipboardManager.current
    val contexto = LocalContext.current
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        Text(etiqueta, fontSize = 13.sp, color = TextMuted, modifier = Modifier.width(110.dp))
        Text(valor, fontSize = 14.sp, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f), textAlign = TextAlign.End)
        if (copiable) {
            IconButton(
                onClick = {
                    portapapeles.setText(AnnotatedString(valor))
                    Toast.makeText(contexto, "$etiqueta copiado", Toast.LENGTH_SHORT).show()
                },
                modifier = Modifier.size(32.dp),
            ) { Icon(Icons.Filled.ContentCopy, contentDescription = "Copiar $etiqueta", tint = TextMuted, modifier = Modifier.size(16.dp)) }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SeccionDeuda(ficha: FichaContrato) {
    Seccion(Icons.Filled.ReceiptLong, "Deuda de este contrato") {
        when {
            ficha.contrato.deudaPendiente <= 0.009 -> Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth().background(CableraSuccessBg, RoundedCornerShape(12.dp)).padding(12.dp),
            ) {
                Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = CableraSuccess, modifier = Modifier.size(20.dp))
                Text("Al día, no debe ningún mes", color = CableraSuccess, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 8.dp))
            }
            !ficha.detalleCargado -> Text(
                "Debe ${ficha.contrato.mesesPendientes} mes(es): ${formatMoney(ficha.contrato.deudaPendiente)}",
                fontSize = 14.sp,
            )
            else -> FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                ficha.cargosPendientes.forEach { MesDeuda(it) }
            }
        }
    }
}

@Composable
private fun MesDeuda(cargo: CargoPendienteDto) {
    val colores = coloresEstadoCargo(cargo.estado)
    Column(
        modifier = Modifier
            .background(colores.fondo, RoundedCornerShape(12.dp))
            .padding(horizontal = 12.dp, vertical = 8.dp),
    ) {
        Text("${nombreMes(cargo.mes)} ${cargo.anio}", fontSize = 12.sp, color = colores.texto, fontWeight = FontWeight.SemiBold)
        Text(formatMoney(cargo.saldo), fontSize = 14.sp, color = colores.texto, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
    }
}

@Composable
private fun SeccionRed(c: ContratoDto) {
    val hayDatos = listOf(c.ipWan, c.mascara, c.gateway, c.pppoeUsuario, c.pppoePassword, c.precinto, c.equipoSerie).any { !it.isNullOrBlank() } ||
        c.puntoRed != null || c.equipoProducto != null
    if (!hayDatos) return
    var verClave by remember { mutableStateOf(false) }
    Seccion(Icons.Filled.Router, "Red y equipo") {
        Fila("IP WAN", c.ipWan, copiable = true)
        Fila("Máscara", c.mascara)
        Fila("Gateway", c.gateway)
        Fila("Usuario PPPoE", c.pppoeUsuario, copiable = true)
        if (!c.pppoePassword.isNullOrBlank()) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Text("Clave PPPoE", fontSize = 13.sp, color = TextMuted, modifier = Modifier.width(110.dp))
                Text(if (verClave) c.pppoePassword else "••••••••", fontSize = 14.sp, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f), textAlign = TextAlign.End)
                IconButton(onClick = { verClave = !verClave }, modifier = Modifier.size(32.dp)) {
                    Icon(if (verClave) Icons.Filled.VisibilityOff else Icons.Filled.Visibility, contentDescription = "Mostrar clave", tint = TextMuted, modifier = Modifier.size(16.dp))
                }
            }
        }
        Fila("Punto de red", c.puntoRed?.let { "${it.codigo} (${it.tipo.uppercase()})" })
        Fila("Equipo", c.equipoProducto?.nombre)
        Fila("Serie", c.equipoSerie, copiable = true)
        Fila("Precinto", c.precinto)
    }
}

@Composable
private fun SeccionServicios(ficha: FichaContrato, onVer: (String) -> Unit) {
    Seccion(Icons.Filled.Build, "Servicios técnicos") {
        when {
            !ficha.detalleCargado -> Text("Cargando…", fontSize = 13.sp, color = TextMuted)
            ficha.serviciosTecnicos.isEmpty() -> Text("Este contrato todavía no tiene servicios técnicos.", fontSize = 13.sp, color = TextMuted)
            else -> ficha.serviciosTecnicos.forEach { ServicioRow(it, onVer) }
        }
    }
}

@Composable
private fun ServicioRow(orden: OrdenServicioDto, onVer: (String) -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(14.dp))
            .clickable { onVer(orden.id) }
            .padding(12.dp),
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(ETIQUETAS_TIPO_ORDEN[orden.tipoOrden] ?: orden.tipoOrden, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Text("${orden.nServicio} · ${formatFechaCorta(orden.fechaServicio)}", fontSize = 12.sp, color = TextMuted)
        }
        EstadoChip(texto = orden.estado.replace("_", " "), colores = coloresEstadoOrden(orden.estado))
    }
}

@Composable
private fun BotonMapa(lat: Double, lng: Double) {
    val contexto = LocalContext.current
    OutlinedButton(
        onClick = {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("geo:$lat,$lng?q=$lat,$lng(Instalación)"))
            runCatching { contexto.startActivity(intent) }
                .onFailure { Toast.makeText(contexto, "No hay una app de mapas instalada", Toast.LENGTH_SHORT).show() }
        },
        modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
    ) { Text("Ver ubicación en el mapa") }
}

/** Las secciones entran una tras otra (fundido + leve subida), la primera vez que se abre la ficha. */
@Composable
private fun Aparecer(indice: Int, contenido: @Composable () -> Unit) {
    val estado = remember { MutableTransitionState(false).apply { targetState = true } }
    AnimatedVisibility(
        visibleState = estado,
        enter = fadeIn(tween(300, delayMillis = indice * 60)) + slideInVertically(tween(360, delayMillis = indice * 60)) { it / 5 },
    ) { contenido() }
}
