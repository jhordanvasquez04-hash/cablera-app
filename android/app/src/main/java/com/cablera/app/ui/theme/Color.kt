package com.cablera.app.ui.theme

import androidx.compose.ui.graphics.Color

// Paleta de diseno-referencia/handoff_android/ANDROID.md. Primario/secundario son el default
// cuando la empresa no personalizó nada en Configuración (ver CableraTheme).
val CableraPrimary = Color(0xFF1F3A63)
val CableraPrimaryPressed = Color(0xFF17304F)
val CableraPrimaryLight = Color(0xFFDCE6F5)
val CableraSecondary = Color(0xFF16191D)

val Ink = Color(0xFF16191D)
val InkBorder = Color(0xFF3A4149)
val InkMuted = Color(0xFFAEB5BD)

val Surface = Color(0xFFFFFFFF)
val SurfaceDim = Color(0xFFF7F8FA)
// Fondo de las pantallas: gris azulado muy suave (nada de crema/lavanda); las tarjetas van en blanco puro.
val Background = Color(0xFFEFF3F8)
val BackgroundApp = Color(0xFFEEF0F3)

val Outline = Color(0xFFE4E7EC)
val OutlineField = Color(0xFFCFD4DA)
val Divider = Color(0xFFF2F4F6)

val TextSecondary = Color(0xFF464D56)
val TextTertiary = Color(0xFF5D646D)
val TextMuted = Color(0xFF6D747E)

val CableraSuccess = Color(0xFF17703F)
val CableraSuccessBg = Color(0xFFDDF3E6)
val CableraWarning = Color(0xFF8A5A00)
val CableraWarningBg = Color(0xFFFFEBC2)
val CableraError = Color(0xFFB3261E)
val CableraErrorBg = Color(0xFFFCE1DE)
val CableraErrorLine = Color(0xFFE8B4AF)
val CableraNeutral = Color(0xFF465366)
val CableraNeutralBg = Color(0xFFE6EBF2)
// Estados "en marcha": azul (asignada) y verde azulado (en proceso)
val CableraInfo = Color(0xFF1F4E9C)
val CableraInfoBg = Color(0xFFDCE8FB)
val CableraProgress = Color(0xFF0B6B80)
val CableraProgressBg = Color(0xFFD5F0F5)

// Nombres usados por el theming dinámico existente (CableraTheme(configuracion = ...)).
val SurfaceLight = Background
val SurfaceDark = Ink
