package com.cablera.app.ui.navigation

object Routes {
    const val LOGIN = "login"
    const val HOME = "home"
    const val CLIENTES = "clientes"
    const val CLIENTE_NUEVO = "clientes/nuevo"
    const val BOLETAS = "boletas"
    const val CAJA = "caja"
    const val CONFIGURACION = "configuracion"
    const val PERFIL = "perfil"

    // Alcance del panel en el celular ("solo lo esencial"): Órdenes de servicio (ver/asignar/cancelar)
    // y Contratos.
    const val ORDENES_SERVICIO = "ordenes-servicio"
    const val ORDEN_SERVICIO_DETALLE = "ordenes-servicio/{ordenId}"
    const val CONTRATOS = "contratos"
    const val CONTRATO_DETALLE = "contratos/{contratoId}"
    // "Nuevo contrato" (fusión con Keysls, tal cual Contratos.jsx): busca o crea un cliente y
    // le crea un contrato — desde cualquier parte de la app, o ya con el cliente fijo (cuando se
    // abre desde su ficha, ver "+ Nuevo contrato").
    const val CONTRATO_NUEVO = "contratos/nuevo"
    const val CONTRATO_NUEVO_PARA_CLIENTE = "contratos/nuevo/{clienteId}"

    // Nuevo servicio técnico (= orden de servicio de Keysls). contratoId opcional: desde el detalle de un
    // contrato llega ya con el contrato fijo; desde la lista de servicios técnicos se elige cliente y contrato.
    const val NUEVA_ORDEN = "nueva-orden?contratoId={contratoId}&clienteId={clienteId}"

    fun nuevaOrden(contratoId: String? = null, clienteId: String? = null): String {
        val params = listOfNotNull(contratoId?.let { "contratoId=$it" }, clienteId?.let { "clienteId=$it" })
        return "nueva-orden" + if (params.isEmpty()) "" else "?" + params.joinToString("&")
    }
    fun ordenServicioDetalle(ordenId: String) = "ordenes-servicio/$ordenId"
    fun contratoDetalle(contratoId: String) = "contratos/$contratoId"
    fun contratoNuevoParaCliente(clienteId: String) = "contratos/nuevo/$clienteId"

    const val CLIENTE_FICHA = "clientes/{clienteId}"
    // contratoId opcional: cuando se llega desde una tarjeta de Cobranza (un contrato puntual),
    // acota la pantalla a los cargos de ESE contrato — no a todos los del cliente.
    const val REGISTRAR_PAGO = "clientes/{clienteId}/pago?contratoId={contratoId}"
    const val BOLETA_DETALLE = "boletas/{boletaId}"

    fun clienteFicha(clienteId: String) = "clientes/$clienteId"
    fun registrarPago(clienteId: String, contratoId: String? = null) =
        "clientes/$clienteId/pago" + (contratoId?.let { "?contratoId=$it" } ?: "")
    fun boletaDetalle(boletaId: String) = "boletas/$boletaId"

    // Portal de campo (fusión con Keysls) — todas bajo el prefijo "tecnico/" a propósito: así
    // esRutaTecnico() en NavGraph.kt puede distinguirlas de las del panel con un simple prefijo,
    // sin tener que mantener una lista aparte sincronizada a mano.
    const val LOGIN_TECNICO = "tecnico/login"
    const val ORDENES_TECNICO = "tecnico/ordenes"
    const val PERFIL_TECNICO = "tecnico/perfil"
    const val ORDEN_TECNICO_DETALLE = "tecnico/ordenes/{ordenId}"

    fun ordenTecnicoDetalle(ordenId: String) = "tecnico/ordenes/$ordenId"

    fun esRutaTecnico(route: String?): Boolean = route != null && route.startsWith("tecnico/")
}
