package com.cablera.app.ui.boletas

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.util.Log
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.graphics.layer.GraphicsLayer
import androidx.compose.ui.graphics.layer.drawLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalGraphicsContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.print.PrintHelper
import com.cablera.app.LocalAppContainer
import com.cablera.app.data.remote.dto.BoletaDetalleDto
import com.cablera.app.data.remote.dto.ConfiguracionDto
import com.cablera.app.ui.common.AppHeader
import com.cablera.app.ui.common.EstadoChip
import com.cablera.app.ui.common.LambdaViewModelFactory
import com.cablera.app.ui.common.RemoteImage
import com.cablera.app.ui.common.StateContent
import com.cablera.app.ui.common.UiState
import com.cablera.app.ui.common.coloresEstadoBoleta
import com.cablera.app.ui.theme.Ink
import com.cablera.app.ui.theme.MonoStyles
import com.cablera.app.ui.theme.SurfaceDim
import com.cablera.app.ui.theme.TextSecondary
import com.cablera.app.util.formatFechaHora
import com.cablera.app.util.formatMoney
import java.io.File
import java.io.FileOutputStream
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BoletaDetalleScreen(
    navController: NavHostController,
    boletaId: String,
    viewModel: BoletaDetalleViewModel = run {
        val container = LocalAppContainer.current
        viewModel(
            factory = LambdaViewModelFactory {
                BoletaDetalleViewModel(boletaId, container.boletasRepository, container.authRepository)
            },
        )
    },
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var mostrarConfirmacion by remember { mutableStateOf(false) }
    var procesandoAccion by remember { mutableStateOf(false) }

    // El ticket se "graba" en esta capa en cada dibujo (ver TicketCard más abajo); al compartir o
    // imprimir la convertimos a bitmap para obtener una imagen real del comprobante en vez de texto plano.
    val graphicsContext = LocalGraphicsContext.current
    val graphicsLayer = remember { graphicsContext.createGraphicsLayer() }
    DisposableEffect(graphicsContext) {
        onDispose { graphicsContext.releaseGraphicsLayer(graphicsLayer) }
    }

    Scaffold(
        topBar = {
            AppHeader(
                titulo = "Boleta",
                onBack = { navController.popBackStack() },
                actions = {
                    val boleta = (uiState.boleta as? UiState.Success)?.data
                    if (boleta != null) {
                        if (procesandoAccion) {
                            CircularProgressIndicator(
                                modifier = Modifier.padding(8.dp),
                                color = MaterialTheme.colorScheme.onPrimary,
                            )
                        } else {
                            IconButton(onClick = {
                                scope.launch {
                                    procesandoAccion = true
                                    ejecutarConBitmap(context, graphicsLayer) { bitmap -> imprimirBoleta(context, boleta.folio, bitmap) }
                                    procesandoAccion = false
                                }
                            }) {
                                Icon(Icons.Filled.Print, contentDescription = "Imprimir", tint = MaterialTheme.colorScheme.onPrimary)
                            }
                            IconButton(onClick = {
                                scope.launch {
                                    procesandoAccion = true
                                    ejecutarConBitmap(context, graphicsLayer) { bitmap -> compartirBoleta(context, boleta.folio, bitmap) }
                                    procesandoAccion = false
                                }
                            }) {
                                Icon(Icons.Filled.Share, contentDescription = "Compartir", tint = MaterialTheme.colorScheme.onPrimary)
                            }
                        }
                    }
                },
            )
        },
    ) { padding ->
        StateContent(state = uiState.boleta, onRetry = viewModel::cargar, modifier = Modifier.padding(padding)) { boleta ->
            LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                item { TicketCard(boleta = boleta, graphicsLayer = graphicsLayer) }
                if (uiState.rolGestor && boleta.estado == "emitida") {
                    item {
                        OutlinedButton(
                            onClick = { mostrarConfirmacion = true },
                            enabled = !uiState.anulando,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(if (uiState.anulando) "Anulando..." else "Anular boleta")
                        }
                    }
                }
                if (uiState.errorAnular != null) {
                    item { Text(uiState.errorAnular ?: "", color = MaterialTheme.colorScheme.error) }
                }
            }
        }
    }

    if (mostrarConfirmacion) {
        AlertDialog(
            onDismissRequest = { mostrarConfirmacion = false },
            title = { Text("¿Anular esta boleta?", style = MaterialTheme.typography.titleLarge) },
            text = { Text("El saldo de sus cargos volverá a quedar pendiente. Esta acción no se puede deshacer.") },
            confirmButton = {
                TextButton(onClick = { mostrarConfirmacion = false; viewModel.anular() }) {
                    Text("Anular", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { mostrarConfirmacion = false }) { Text("Cancelar") }
            },
        )
    }
}

private const val TAG_BOLETA = "BoletaDetalle"

/** Captura el ticket como bitmap y ejecuta [accion] (imprimir o compartir) sobre él. Cualquier
 * falla (generar la imagen, escribirla a disco, o que no haya app/impresora disponible) se
 * registra y se avisa con un Toast en vez de dejar que la excepción tumbe la app. */
private suspend fun ejecutarConBitmap(context: Context, graphicsLayer: GraphicsLayer, accion: (Bitmap) -> Unit) {
    try {
        val bitmap = graphicsLayer.toImageBitmap().asAndroidBitmap()
        accion(bitmap)
    } catch (e: Exception) {
        Log.e(TAG_BOLETA, "No se pudo generar/compartir la imagen de la boleta", e)
        Toast.makeText(context, "No se pudo generar la imagen del comprobante", Toast.LENGTH_LONG).show()
    }
}

/** Imprime en cualquier impresora registrada en el sistema (ticketera térmica o impresora normal):
 * ambas se instalan en Android como "servicio de impresión" y luego aparecen igual en este diálogo,
 * que se encarga de escalar la imagen al papel de destino. */
private fun imprimirBoleta(context: Context, folio: String, bitmap: Bitmap) {
    val printHelper = PrintHelper(context).apply { scaleMode = PrintHelper.SCALE_MODE_FIT }
    printHelper.printBitmap("Boleta $folio", bitmap)
}

private fun compartirBoleta(context: Context, folio: String, bitmap: Bitmap) {
    val uri = guardarBitmapTemporal(context, folio, bitmap)
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "image/png"
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(Intent.createChooser(intent, "Compartir boleta"))
}

private fun guardarBitmapTemporal(context: Context, folio: String, bitmap: Bitmap): android.net.Uri {
    val carpeta = File(context.cacheDir, "boletas").apply { mkdirs() }
    val archivo = File(carpeta, "boleta_$folio.png")
    FileOutputStream(archivo).use { salida -> bitmap.compress(Bitmap.CompressFormat.PNG, 100, salida) }
    return FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", archivo)
}

private fun iniciales(texto: String?): String {
    if (texto.isNullOrBlank()) return "CB"
    return texto.trim().split(Regex("\\s+")).take(2).mapNotNull { it.firstOrNull()?.uppercaseChar() }.joinToString("")
}

@Composable
private fun TicketCard(boleta: BoletaDetalleDto, graphicsLayer: GraphicsLayer) {
    val container = LocalAppContainer.current
    val configuracion by container.configuracionState.collectAsStateWithLifecycle()

    // Colores fijos (no los del tema): el comprobante debe verse igual en modo claro/oscuro y,
    // sobre todo, en el bitmap que se comparte o imprime — un "papel" no cambia con el tema del teléfono.
    Card(
        modifier = Modifier.drawWithContent {
            // Vuelve a grabar la capa en cada dibujo para que el bitmap capturado al compartir/imprimir
            // siempre refleje el contenido actual (ver toImageBitmap() más arriba).
            graphicsLayer.record(size = IntSize(size.width.toInt(), size.height.toInt())) {
                this@drawWithContent.drawContent()
            }
            drawLayer(graphicsLayer)
        },
    ) {
        CompositionLocalProvider(LocalContentColor provides Ink) {
        Column(modifier = Modifier.background(Color.White).padding(20.dp)) {
            EncabezadoEmpresa(configuracion = configuracion)

            DashedDivider()

            Row(horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text("BOLETA", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                    Text(boleta.folio, style = MonoStyles.Title, color = Ink)
                }
                EstadoChip(texto = boleta.estado, colores = coloresEstadoBoleta(boleta.estado))
            }
            Text(
                formatFechaHora(boleta.fecha).uppercase(),
                style = MonoStyles.Body,
                color = TextSecondary,
                modifier = Modifier.padding(top = 2.dp),
            )

            DashedDivider()

            Text(boleta.cliente.nombreCompleto.uppercase(), style = MaterialTheme.typography.titleMedium, color = Ink)
            Text(
                "DNI ${boleta.dni ?: "—"} · ${boleta.cliente.zona}".uppercase(),
                style = MonoStyles.Body,
                color = TextSecondary,
            )
            if (boleta.registradoPor != null) {
                Text(
                    "Registrado por ${boleta.registradoPor}".uppercase(),
                    style = MonoStyles.Body,
                    color = TextSecondary,
                )
            }

            DashedDivider()

            Text("Detalle", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
            Column(modifier = Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                boleta.lineas.forEach { linea ->
                    Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                        Text(
                            "${linea.servicio} · ${linea.periodo}${if (linea.esSaldo) " (saldo)" else ""}".uppercase(),
                            style = MonoStyles.Body,
                            modifier = Modifier.weight(1f).padding(end = 8.dp),
                        )
                        Text(formatMoney(linea.montoAplicado), style = MonoStyles.Body)
                    }
                }
            }

            Column(
                modifier = Modifier
                    .padding(top = 16.dp)
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(SurfaceDim)
                    .padding(14.dp),
            ) {
                Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                    Text("TOTAL", style = MaterialTheme.typography.titleMedium)
                    Text(formatMoney(boleta.montoTotal), style = MonoStyles.Title)
                }
                Text(
                    "Pagado con ${boleta.metodoPago}".uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    color = TextSecondary,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }

            Text(
                "Gracias por su preferencia",
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(top = 18.dp),
            )
        }
        }
    }
}

@Composable
private fun EncabezadoEmpresa(configuracion: ConfiguracionDto?) {
    val container = LocalAppContainer.current
    val nombreEmpresa = configuracion?.nombreEmpresa?.takeIf { it.isNotBlank() } ?: "Cablera"
    val logoUrl = container.resolverUrlArchivo(configuracion?.logoUrl)

    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary),
            contentAlignment = Alignment.Center,
        ) {
            RemoteImage(
                url = logoUrl,
                contentDescription = null,
                modifier = Modifier.size(48.dp).clip(CircleShape),
                placeholder = {
                    Text(iniciales(nombreEmpresa), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onPrimary)
                },
            )
        }
        Text(
            nombreEmpresa.uppercase(),
            style = MaterialTheme.typography.titleLarge,
            color = Ink,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 8.dp),
        )
        if (!configuracion?.ruc.isNullOrBlank()) {
            Text("RUC ${configuracion?.ruc}", style = MonoStyles.Body, color = TextSecondary)
        }
        val contacto = listOfNotNull(configuracion?.direccionContacto, configuracion?.telefonoContacto).filter { it.isNotBlank() }
        if (contacto.isNotEmpty()) {
            Text(
                contacto.joinToString(" · "),
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
private fun DashedDivider() {
    HorizontalDivider(modifier = Modifier.padding(vertical = 14.dp), color = MaterialTheme.colorScheme.outlineVariant)
}
