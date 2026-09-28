package com.cablera.app.ui.common

/** Compartido entre el panel (gestor/cobrador, ver OrdenesServicioListScreen) y el portal de
 * campo (ver OrdenesTecnicoListScreen) — ambos leen el mismo OrdenServicioDto (los tipos son los de Keysls sin el sufijo de servicio). */
val ETIQUETAS_TIPO_ORDEN = mapOf(
    "instalacion" to "Instalación",
    "alta_servicio" to "Alta de servicio",
    "atencion_noc" to "Atención NOC",
    "baja_servicio" to "Baja de servicio",
    "cambio_contrasena" to "Cambio de contraseña",
    "averia" to "Avería",
    "cambio_domicilio" to "Cambio de domicilio",
    "cambio_equipo" to "Cambio de equipo",
    "cambio_plan" to "Cambio de plan",
    "cambio_titular" to "Cambio de titular",
    "corte_solicitud" to "Corte a solicitud",
    "corte_deuda" to "Corte por deuda",
    "reconexion" to "Reconexión",
    "retiro_equipo" to "Retiro de equipo",
    "traslado" to "Traslado",
    "instalacion_anexo" to "Instalación de anexo",
    "migracion_ftth" to "Migración a FTTH",
    "supervision" to "Supervisión",
    "otro" to "Otro",
)
