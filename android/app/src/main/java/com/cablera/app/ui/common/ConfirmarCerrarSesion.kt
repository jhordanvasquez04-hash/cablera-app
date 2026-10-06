package com.cablera.app.ui.common

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.cablera.app.ui.theme.CableraError
import com.cablera.app.ui.theme.CableraErrorBg
import com.cablera.app.ui.theme.Negro
import com.cablera.app.ui.theme.PlexSans
import com.cablera.app.ui.theme.TextMuted

/**
 * Pregunta antes de cerrar sesión (Ajustes, Perfil y Perfil del técnico). Mismo estilo que el login:
 * tarjeta blanca redondeada, ícono en círculo, título en negrita y botones tipo píldora apilados.
 */
@Composable
fun ConfirmarCerrarSesionDialog(onConfirmar: () -> Unit, onCancelar: () -> Unit) {
    Dialog(onDismissRequest = onCancelar) {
        // Entrada: aparece con un leve "pop" (escala + fundido)
        val entrada = remember { Animatable(0f) }
        LaunchedEffect(Unit) { entrada.animateTo(1f, tween(260, easing = FastOutSlowInEasing)) }

        Surface(
            shape = RoundedCornerShape(28.dp),
            color = Color.White,
            modifier = Modifier.graphicsLayer {
                alpha = entrada.value
                val escala = 0.92f + 0.08f * entrada.value
                scaleX = escala
                scaleY = escala
            },
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(start = 24.dp, end = 24.dp, top = 28.dp, bottom = 20.dp),
            ) {
                Box(
                    modifier = Modifier.size(64.dp).background(CableraErrorBg, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, tint = CableraError, modifier = Modifier.size(28.dp))
                }
                Text(
                    "¿Cerrar sesión?",
                    fontFamily = PlexSans,
                    fontWeight = FontWeight.Bold,
                    fontSize = 21.sp,
                    color = Negro,
                    modifier = Modifier.padding(top = 18.dp),
                )
                Text(
                    "Tendrás que volver a ingresar tu correo y contraseña para usar la app.",
                    fontFamily = PlexSans,
                    fontSize = 14.sp,
                    lineHeight = 20.sp,
                    color = TextMuted,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(top = 8.dp),
                )
                Button(
                    onClick = onConfirmar,
                    shape = RoundedCornerShape(percent = 50),
                    colors = ButtonDefaults.buttonColors(containerColor = Negro, contentColor = Color.White),
                    modifier = Modifier.fillMaxWidth().padding(top = 24.dp).height(52.dp),
                ) {
                    Text("Sí, cerrar sesión", fontFamily = PlexSans, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                }
                OutlinedButton(
                    onClick = onCancelar,
                    shape = RoundedCornerShape(percent = 50),
                    border = BorderStroke(1.dp, Color(0xFFE3E3E6)),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Negro),
                    modifier = Modifier.fillMaxWidth().padding(top = 10.dp).height(52.dp),
                ) {
                    Text("Cancelar", fontFamily = PlexSans, fontWeight = FontWeight.Medium, fontSize = 15.sp)
                }
            }
        }
    }
}
