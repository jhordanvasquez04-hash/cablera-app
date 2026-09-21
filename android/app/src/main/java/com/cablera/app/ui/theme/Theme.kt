package com.cablera.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.cablera.app.data.remote.dto.ConfiguracionDto

val CableraShapes = Shapes(
    extraSmall = RoundedCornerShape(5.dp), // chips de estado
    small = RoundedCornerShape(10.dp), // campos y botones
    medium = RoundedCornerShape(14.dp), // tarjetas
    large = RoundedCornerShape(18.dp), // hojas inferiores y modales
    extraLarge = RoundedCornerShape(18.dp),
)

/** Solo esquinas superiores — hojas inferiores (ModalBottomSheet) y la tarjeta de login. */
val TopRoundedShape = RoundedCornerShape(topStart = 18.dp, topEnd = 18.dp)

/** "#2563EB" -> Color(0xFF2563EB). Cualquier formato inesperado cae al color por defecto. */
fun parseHexColor(hex: String?, fallback: Color): Color {
    if (hex.isNullOrBlank()) return fallback
    return try {
        Color(android.graphics.Color.parseColor(hex))
    } catch (_: IllegalArgumentException) {
        fallback
    }
}

private val LightColors = lightColorScheme(
    primary = CableraPrimary,
    secondary = CableraSecondary,
    error = CableraError,
    background = SurfaceLight,
)

private val DarkColors = darkColorScheme(
    primary = CableraPrimary,
    secondary = CableraSecondary,
    error = CableraError,
    background = SurfaceDark,
)

/**
 * El primario/secundario vienen de Configuracion (editable desde Ajustes/la web) para que la
 * marca del negocio se refleje en toda la app, igual que en el frontend web. [configuracion] nulo
 * (aún no cargó, o falló la carga) cae en los colores por defecto de la app.
 */
@Composable
fun CableraTheme(
    configuracion: ConfiguracionDto? = null,
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val primary = parseHexColor(configuracion?.colorPrimario, CableraPrimary)
    val secondary = parseHexColor(configuracion?.colorSecundario, CableraSecondary)

    val colorScheme = if (darkTheme) {
        DarkColors.copy(primary = primary, secondary = secondary)
    } else {
        LightColors.copy(primary = primary, secondary = secondary)
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        shapes = CableraShapes,
        content = content,
    )
}
