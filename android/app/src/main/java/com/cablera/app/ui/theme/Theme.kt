package com.cablera.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.cablera.app.data.remote.dto.ConfiguracionDto

// Esquinas más redondeadas, como el login. Los botones de Material 3 ya son tipo píldora.
val CableraShapes = Shapes(
    extraSmall = RoundedCornerShape(12.dp), // campos de texto y chips de estado
    small = RoundedCornerShape(14.dp),
    medium = RoundedCornerShape(20.dp), // tarjetas
    large = RoundedCornerShape(28.dp), // hojas inferiores y modales
    extraLarge = RoundedCornerShape(28.dp), // diálogos
)

/** Solo esquinas superiores — hojas inferiores (ModalBottomSheet). */
val TopRoundedShape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)

/** "#2563EB" -> Color(0xFF2563EB). Cualquier formato inesperado cae al color por defecto. */
fun parseHexColor(hex: String?, fallback: Color): Color {
    if (hex.isNullOrBlank()) return fallback
    return try {
        Color(android.graphics.Color.parseColor(hex))
    } catch (_: IllegalArgumentException) {
        fallback
    }
}

// Tema claro completo: fondo gris neutro suave y superficies (tarjetas, barra inferior, hojas, diálogos)
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
    surfaceVariant = Color(0xFFF1F1F3),
    onSurfaceVariant = TextSecondary,
    surfaceTint = Color.White,
    surfaceContainerLowest = Color.White,
    surfaceContainerLow = Color.White,
    surfaceContainer = Color.White,
    surfaceContainerHigh = Color.White,
    surfaceContainerHighest = Color.White,
    outline = Color(0xFFC7C7CC),
    outlineVariant = Outline,
    error = CableraError,
    errorContainer = CableraErrorBg,
    onErrorContainer = CableraError,
)

// Tema oscuro: fondo casi negro, tarjetas gris carbón y botones BLANCOS con letras negras (para
// que resalten). Las cabeceras y bloques oscuros no usan `primary` sino colorCabecera().
private val DarkColors = darkColorScheme(
    primary = Color(0xFFF2F2F3),
    onPrimary = Negro,
    primaryContainer = Color(0xFF2A2A2E),
    onPrimaryContainer = Color(0xFFF2F2F3),
    secondary = Color(0xFFF2F2F3),
    onSecondary = Negro,
    secondaryContainer = Color(0xFF2E2E33),
    onSecondaryContainer = Color(0xFFF2F2F3),
    background = Color(0xFF0B0B0C),
    onBackground = Color(0xFFEDEDEF),
    surface = Color(0xFF1A1A1D),
    onSurface = Color(0xFFEDEDEF),
    surfaceVariant = Color(0xFF26262A),
    onSurfaceVariant = Color(0xFFA9A9AE),
    surfaceTint = Color(0xFF1A1A1D),
    surfaceContainerLowest = Color(0xFF141416),
    surfaceContainerLow = Color(0xFF1A1A1D),
    surfaceContainer = Color(0xFF1A1A1D),
    surfaceContainerHigh = Color(0xFF222225),
    surfaceContainerHighest = Color(0xFF26262A),
    outline = Color(0xFF4A4A50),
    outlineVariant = Color(0xFF2E2E33),
    error = Color(0xFFFF7A70),
    onError = Negro,
    errorContainer = Color(0xFF3A1A1D),
    onErrorContainer = Color(0xFFFFB4AB),
)

/** true si la app se está mostrando en modo oscuro (lo decide el sistema del teléfono). */
val LocalTemaOscuro = staticCompositionLocalOf { false }

/** Fondo de las cabeceras y bloques oscuros (cabecera, ficha del cliente, sesión, caja...):
 * negro en modo claro y gris carbón en oscuro. El contenido encima siempre va en blanco. */
@Composable
fun colorCabecera(): Color = if (LocalTemaOscuro.current) Color(0xFF1C1C1F) else Negro

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

    // Claro u oscuro según el teléfono. En oscuro los botones pasan a blancos (ver DarkColors).
    val colorScheme = if (darkTheme) DarkColors else LightColors.copy(primary = primary, secondary = secondary)

    CompositionLocalProvider(LocalTemaOscuro provides darkTheme) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = Typography,
            shapes = CableraShapes,
            content = content,
        )
    }
}
