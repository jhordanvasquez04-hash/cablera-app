package com.cablera.app.ui.navigation

object Routes {
    const val LOGIN = "login"
    const val HOME = "home"
    const val CLIENTES = "clientes"
    const val CLIENTE_NUEVO = "clientes/nuevo"
    const val BOLETAS = "boletas"
    const val CAJA = "caja"
    const val SERVICIOS = "servicios"
    const val SERVICIO_NUEVO = "servicios/nuevo"
    const val REPORTAR_GASTO = "gastos/reportar"
    const val CONFIGURACION = "configuracion"
    const val PERFIL = "perfil"

    const val CLIENTE_FICHA = "clientes/{clienteId}"
    const val REGISTRAR_PAGO = "clientes/{clienteId}/pago"
    const val BOLETA_DETALLE = "boletas/{boletaId}"
    const val SERVICIO_NUEVO_PARA_CLIENTE = "servicios/nuevo/{clienteId}"

    fun clienteFicha(clienteId: String) = "clientes/$clienteId"
    fun registrarPago(clienteId: String) = "clientes/$clienteId/pago"
    fun boletaDetalle(boletaId: String) = "boletas/$boletaId"
    fun servicioNuevoParaCliente(clienteId: String) = "servicios/nuevo/$clienteId"
}
