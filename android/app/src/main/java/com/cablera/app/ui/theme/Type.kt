@file:OptIn(androidx.compose.ui.text.ExperimentalTextApi::class)

package com.cablera.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.cablera.app.R

/** IBM Plex Sans — toda la interfaz. Fuente variable, instanciada por peso vía [FontVariation]. */
val PlexSans = FontFamily(
    Font(R.font.ibm_plex_sans_variable, weight = FontWeight.Normal, variationSettings = FontVariation.Settings(FontVariation.weight(400))),
    Font(R.font.ibm_plex_sans_variable, weight = FontWeight.Medium, variationSettings = FontVariation.Settings(FontVariation.weight(500))),
    Font(R.font.ibm_plex_sans_variable, weight = FontWeight.SemiBold, variationSettings = FontVariation.Settings(FontVariation.weight(600))),
    Font(R.font.ibm_plex_sans_variable, weight = FontWeight.Bold, variationSettings = FontVariation.Settings(FontVariation.weight(700))),
)

/** Source Serif 4 — solo títulos de pantalla, siempre regular (nunca negrita). */
val SourceSerif4 = FontFamily(
    Font(R.font.source_serif4_variable, weight = FontWeight.Normal, variationSettings = FontVariation.Settings(FontVariation.weight(400))),
)

/** IBM Plex Mono — importes, DNI, folios, fechas cortas. */
val PlexMono = FontFamily(
    Font(R.font.ibm_plex_mono_regular, weight = FontWeight.Normal),
    Font(R.font.ibm_plex_mono_medium, weight = FontWeight.Medium),
    Font(R.font.ibm_plex_mono_semibold, weight = FontWeight.SemiBold),
)

val Typography = Typography(
    // Títulos grandes y de diálogos en la misma letra que el resto (antes Source Serif, con serifas:
    // no combinaba con el diseño en blanco y negro).
    displayLarge = TextStyle(fontFamily = PlexSans, fontWeight = FontWeight.Bold, fontSize = 30.sp, lineHeight = 36.sp, letterSpacing = (-0.02f).em),
    headlineSmall = TextStyle(fontFamily = PlexSans, fontWeight = FontWeight.Bold, fontSize = 20.sp, lineHeight = 26.sp, letterSpacing = (-0.01f).em),
    titleLarge = TextStyle(fontFamily = PlexSans, fontWeight = FontWeight.SemiBold, fontSize = 17.sp, lineHeight = 22.sp),
    titleMedium = TextStyle(fontFamily = PlexSans, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, lineHeight = 20.sp),
    bodyLarge = TextStyle(fontFamily = PlexSans, fontWeight = FontWeight.Normal, fontSize = 16.sp, lineHeight = 22.sp),
    bodyMedium = TextStyle(fontFamily = PlexSans, fontWeight = FontWeight.Normal, fontSize = 14.sp, lineHeight = 20.sp),
    bodySmall = TextStyle(fontFamily = PlexSans, fontWeight = FontWeight.Normal, fontSize = 12.5.sp, lineHeight = 17.sp),
    labelLarge = TextStyle(fontFamily = PlexSans, fontWeight = FontWeight.Medium, fontSize = 14.sp, lineHeight = 20.sp, letterSpacing = 0.1.sp),
    labelSmall = TextStyle(fontFamily = PlexSans, fontWeight = FontWeight.SemiBold, fontSize = 11.5.sp, lineHeight = 16.sp, letterSpacing = 0.8.sp),
)

/** Estilos monoespaciados fuera de la escala de Material3 (saldo/deuda/importe), con cifras tabulares. */
object MonoStyles {
    val Display = TextStyle(fontFamily = PlexMono, fontWeight = FontWeight.SemiBold, fontSize = 36.sp, lineHeight = 40.sp, fontFeatureSettings = "tnum")
    val Title = TextStyle(fontFamily = PlexMono, fontWeight = FontWeight.SemiBold, fontSize = 21.sp, lineHeight = 26.sp, fontFeatureSettings = "tnum")
    val Body = TextStyle(fontFamily = PlexMono, fontWeight = FontWeight.Normal, fontSize = 14.sp, lineHeight = 20.sp, fontFeatureSettings = "tnum")
}
