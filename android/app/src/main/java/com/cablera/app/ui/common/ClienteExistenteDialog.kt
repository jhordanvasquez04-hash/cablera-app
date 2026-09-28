package com.cablera.app.ui.common

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PersonSearch
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.cablera.app.data.remote.dto.ClienteDto
import com.cablera.app.ui.theme.CableraError
import com.cablera.app.util.formatMoney
import com.cablera.app.ui.theme.CableraErrorBg
import com.cablera.app.ui.theme.CableraInfo
import com.cablera.app.ui.theme.CableraInfoBg
import com.cablera.app.ui.theme.CableraSuccess
import com.cablera.app.ui.theme.CableraSuccessBg
import com.cablera.app.ui.theme.MonoStyles

/**
 * Aviso de "este DNI/RUC ya está registrado": muestra al cliente existente y ofrece seguir con él
 * (crearle un contrato / usarlo en el contrato) o cancelar. Diálogo propio para usar la tipografía de la app.
 */
@Composable
fun ClienteExistenteDialog(
    existente: ClienteDto,
    pregunta: String,
    textoConfirmar: String,
    onConfirmar: () -> Unit,
    onCancelar: () -> Unit,
) {
    Dialog(onDismissRequest = onCancelar) {
        Surface(shape = RoundedCornerShape(24.dp), color = MaterialTheme.colorScheme.surface, tonalElevation = 6.dp) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 22.dp, vertical = 24.dp),
            ) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.size(56.dp).background(CableraInfoBg, CircleShape)) {
                    Icon(Icons.Filled.PersonSearch, contentDescription = null, tint = CableraInfo, modifier = Modifier.size(28.dp))
                }
                Text("Este cliente ya está registrado", style = MaterialTheme.typography.titleLarge, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 16.dp))
                Text(
                    "El DNI/RUC que ingresaste ya pertenece a un cliente.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(top = 6.dp),
                )

                Surface(shape = RoundedCornerShape(16.dp), color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.fillMaxWidth().padding(top = 18.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(14.dp)) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.size(42.dp).background(MaterialTheme.colorScheme.primary, CircleShape)) {
                            Text(existente.nombreCompleto.trim().take(1).uppercase(), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onPrimary)
                        }
                        Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
                            Text(existente.nombreCompleto, style = MaterialTheme.typography.titleMedium, maxLines = 2)
                            Text(existente.dni ?: "", style = MonoStyles.Body, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }

                // ¿Tiene deuda? Sirve para decidir si conviene crearle otro contrato.
                val conDeuda = existente.deudaTotal > 0
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (conDeuda) CableraErrorBg else CableraSuccessBg,
                    modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
                ) {
                    Row(horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp)) {
                        Text(if (conDeuda) "Tiene deuda pendiente" else "Sin deuda pendiente", style = MaterialTheme.typography.labelLarge, color = if (conDeuda) CableraError else CableraSuccess)
                        if (conDeuda) Text(formatMoney(existente.deudaTotal), style = MonoStyles.Body, color = CableraError)
                    }
                }

                Text(pregunta, style = MaterialTheme.typography.bodyLarge, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 18.dp))

                Column(verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth().padding(top = 18.dp)) {
                    Button(onClick = onConfirmar, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth().height(50.dp)) {
                        Text(textoConfirmar, style = MaterialTheme.typography.labelLarge)
                    }
                    TextButton(onClick = onCancelar, modifier = Modifier.fillMaxWidth().height(46.dp)) {
                        Text("Cancelar", style = MaterialTheme.typography.labelLarge)
                    }
                }
            }
        }
    }
}
