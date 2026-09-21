package com.cablera.app.util

import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

private val LOCALE_PE: Locale = Locale.Builder().setLanguage("es").setRegion("PE").build()

// Perú no usa horario de verano (siempre UTC-5): la app siempre muestra la hora de Lima sin
// importar en qué huso esté configurado el teléfono, igual que hace el backend con sus reportes.
val ZONA_PERU: ZoneId = ZoneId.of("America/Lima")

private val fechaCortaFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy", LOCALE_PE)
private val fechaHoraFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", LOCALE_PE)

val NOMBRES_MES = listOf(
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre",
)

fun formatMoney(monto: Double): String = "S/ %.2f".format(LOCALE_PE, monto)

fun nombreMes(mes: Int): String = NOMBRES_MES.getOrElse(mes - 1) { "" }

fun formatFechaCorta(iso: String): String = try {
    OffsetDateTime.parse(iso).toLocalDate().format(fechaCortaFormatter)
} catch (_: Exception) {
    try {
        LocalDate.parse(iso.take(10)).format(fechaCortaFormatter)
    } catch (_: Exception) {
        iso
    }
}

/** Fecha y hora exacta de un evento (boleta, movimiento de caja, servicio técnico...), siempre en
 * hora de Lima: estos campos sí representan un instante real, a diferencia de los que solo llevan
 * fecha (ver [formatFechaCorta]), así que aquí sí corresponde convertir el huso horario. */
fun formatFechaHora(iso: String): String = try {
    OffsetDateTime.parse(iso).atZoneSameInstant(ZONA_PERU).format(fechaHoraFormatter)
} catch (_: Exception) {
    iso
}
