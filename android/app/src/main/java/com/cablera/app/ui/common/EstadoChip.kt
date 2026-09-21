package com.cablera.app.ui.common

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.cablera.app.ui.theme.CableraError
import com.cablera.app.ui.theme.CableraErrorBg
import com.cablera.app.ui.theme.CableraNeutral
import com.cablera.app.ui.theme.CableraNeutralBg
import com.cablera.app.ui.theme.CableraSuccess
import com.cablera.app.ui.theme.CableraSuccessBg
import com.cablera.app.ui.theme.CableraWarning
import com.cablera.app.ui.theme.CableraWarningBg

data class EstadoColores(val texto: Color, val fondo: Color)

@Composable
fun EstadoChip(texto: String, colores: EstadoColores, modifier: Modifier = Modifier) {
    Text(
        text = texto.replaceFirstChar { it.uppercase() },
        color = colores.texto,
        style = MaterialTheme.typography.labelSmall,
        modifier = modifier
            .background(colores.fondo, RoundedCornerShape(5.dp))
            .padding(horizontal = 8.dp, vertical = 4.dp),
    )
}

/** Compatibilidad con el color plano usado antes de tener los pares texto/fondo del spec. */
@Composable
fun EstadoChip(texto: String, color: Color, modifier: Modifier = Modifier) {
    EstadoChip(texto = texto, colores = EstadoColores(color, color.copy(alpha = 0.12f)), modifier = modifier)
}

fun coloresEstadoServicio(estado: String): EstadoColores = when (estado) {
    "activo" -> EstadoColores(CableraSuccess, CableraSuccessBg)
    "suspendido" -> EstadoColores(CableraNeutral, CableraNeutralBg)
    else -> EstadoColores(CableraError, CableraErrorBg)
}

fun coloresEstadoCargo(estado: String): EstadoColores = when (estado) {
    "pendiente" -> EstadoColores(CableraError, CableraErrorBg)
    "parcial" -> EstadoColores(CableraWarning, CableraWarningBg)
    else -> EstadoColores(CableraSuccess, CableraSuccessBg)
}

fun coloresEstadoBoleta(estado: String): EstadoColores = when (estado) {
    "anulada" -> EstadoColores(CableraError, CableraErrorBg)
    else -> EstadoColores(CableraSuccess, CableraSuccessBg)
}

fun colorEstadoServicio(estado: String): Color = coloresEstadoServicio(estado).texto
fun colorEstadoCargo(estado: String): Color = coloresEstadoCargo(estado).texto
fun colorEstadoBoleta(estado: String): Color = coloresEstadoBoleta(estado).texto
