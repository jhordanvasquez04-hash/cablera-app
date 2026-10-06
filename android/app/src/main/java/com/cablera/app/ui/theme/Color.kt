package com.cablera.app.ui.theme

import androidx.compose.ui.graphics.Color

// Diseño en blanco y negro (mismo estilo que el login): primario casi negro, fondos y bordes en
// grises neutros. Los colores de estado (éxito, alerta, error, info) se mantienen para que se lean.
val Negro = Color(0xFF0B0B0C)
val CableraPrimary = Negro
val CableraPrimaryPressed = Color(0xFF2B2B2E)
val CableraPrimaryLight = Color(0xFFEDEDEF)
val CableraSecondary = Negro

val Ink = Color(0xFF111113)
val InkBorder = Color(0xFF3A4149)
val InkMuted = Color(0xFFAEB5BD)

val Surface = Color(0xFFFFFFFF)
val SurfaceDim = Color(0xFFF7F7F8)
// Fondo de las pantallas: gris neutro muy suave; las tarjetas van en blanco puro.
val Background = Color(0xFFF4F4F5)
val BackgroundApp = Color(0xFFF4F4F5)

val Outline = Color(0xFFE6E6E9)
val OutlineField = Color(0xFFD6D6DA)
val Divider = Color(0xFFF1F1F3)

val TextSecondary = Color(0xFF48484D)
val TextTertiary = Color(0xFF5E5E63)
val TextMuted = Color(0xFF8A8A8E)

val CableraSuccess = Color(0xFF17703F)
val CableraSuccessBg = Color(0xFFDDF3E6)
val CableraWarning = Color(0xFF8A5A00)
val CableraWarningBg = Color(0xFFFFEBC2)
val CableraError = Color(0xFFB3261E)
val CableraErrorBg = Color(0xFFFCE1DE)
val CableraErrorLine = Color(0xFFE8B4AF)
val CableraNeutral = Color(0xFF48484D)
val CableraNeutralBg = Color(0xFFECECEE)
// Estados "en marcha": azul (asignada) y verde azulado (en proceso)
val CableraInfo = Color(0xFF1F4E9C)
val CableraInfoBg = Color(0xFFDCE8FB)
val CableraProgress = Color(0xFF0B6B80)
val CableraProgressBg = Color(0xFFD5F0F5)

// Nombres usados por el theming dinámico existente (CableraTheme(configuracion = ...)).
val SurfaceLight = Background
val SurfaceDark = Ink
