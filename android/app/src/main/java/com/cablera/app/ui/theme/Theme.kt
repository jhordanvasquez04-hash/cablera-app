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

// Tema claro completo: fondo gris azulado suave y superficies (tarjetas, barra inferior, hojas, diálogos)
// en blanco puro. Sin esto Material usa sus tonos por defecto, que se ven crema/lavanda.
private val LightColors = lightColorScheme(
    primary = CableraPrimary,
    onPrimary = Color.White,
    primaryContainer = CableraPrimaryLight,
    onPrimaryContainer = CableraPrimary,
    secondary = CableraSecondary,
    secondaryContainer = CableraPrimaryLight,
    onSecondaryContainer = CableraPrimary,
    background = SurfaceLight,
    onBackground = Ink,
    surface = Color.White,
    onSurface = Ink,
    surfaceVariant = Color(0xFFE8EEF6),
    onSurfaceVariant = TextSecondary,
    surfaceTint = Color.White,
    surfaceContainerLowest = Color.White,
    surfaceContainerLow = Color.White,
    surfaceContainer = Color.White,
    surfaceContainerHigh = Color.White,
    surfaceContainerHighest = Color.White,
    outline = Color(0xFFB9C4D2),
    outlineVariant = Outline,
    error = CableraError,
    errorContainer = CableraErrorBg,
    onErrorContainer = CableraError,
)

private val DarkColors = darkColorScheme(
    primary = CableraPrimary,
    secondary = CableraSecondary,
    error = CableraError,
    background = SurfaceDark,
)

/**
 * Keysls no guarda colores de marca por empresa, así que la app usa siempre los suyos. El parámetro
 * [configuracion] se conserva para no tocar a quien llama, pero ya no cambia los colores.
 */
@Composable
fun CableraTheme(
    configuracion: ConfiguracionDto? = null,
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val primary = CableraPrimary
    val secondary = CableraSecondary

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
