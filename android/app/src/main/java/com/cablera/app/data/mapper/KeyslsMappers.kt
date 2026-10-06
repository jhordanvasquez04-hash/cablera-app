package com.cablera.app.data.mapper

import com.cablera.app.data.remote.dto.BoletaClienteDto
import com.cablera.app.data.remote.dto.BoletaDetalleDto
import com.cablera.app.data.remote.dto.BoletaLineaDto
import com.cablera.app.data.remote.dto.BoletaResumenDto
import com.cablera.app.data.remote.dto.CajaTurnoDto
import com.cablera.app.data.remote.dto.CargoPendienteDto
import com.cablera.app.data.remote.dto.ClienteDto
import com.cablera.app.data.remote.dto.ConfiguracionDto
import com.cablera.app.data.remote.dto.ContratoConDeudaDto
import com.cablera.app.data.remote.dto.ContratoDto
import com.cablera.app.data.remote.dto.ContratoResumenDto
import com.cablera.app.data.remote.dto.EquipoProductoResumenDto
import com.cablera.app.data.remote.dto.EstadosBoleta
import com.cablera.app.data.remote.dto.EstadosContrato
import com.cablera.app.data.remote.dto.EstadosServicio
import com.cablera.app.data.remote.dto.KCajaTurno
import com.cablera.app.data.remote.dto.KCargo
import com.cablera.app.data.remote.dto.KCliente
import com.cablera.app.data.remote.dto.KContrato
import com.cablera.app.data.remote.dto.KEgreso
import com.cablera.app.data.remote.dto.KEmpresa
import com.cablera.app.data.remote.dto.KMovimientoCaja
import com.cablera.app.data.remote.dto.KOrden
import com.cablera.app.data.remote.dto.KPago
import com.cablera.app.data.remote.dto.KPlan
import com.cablera.app.data.remote.dto.KProducto
import com.cablera.app.data.remote.dto.KPuntoRed
import com.cablera.app.data.remote.dto.KTecnico
import com.cablera.app.data.remote.dto.KUsuario
import com.cablera.app.data.remote.dto.MovimientoCajaDto
import com.cablera.app.data.remote.dto.OrdenServicioDto
import com.cablera.app.data.remote.dto.PerfilTecnicoDto
import com.cablera.app.data.remote.dto.PlanDto
import com.cablera.app.data.remote.dto.PlanResumenDto
import com.cablera.app.data.remote.dto.ProductoPortalDto
import com.cablera.app.data.remote.dto.PuntoRedResumenDto
import com.cablera.app.data.remote.dto.Roles
import com.cablera.app.data.remote.dto.TecnicoDto
import com.cablera.app.data.remote.dto.TecnicoInstaladorResumenDto
import com.cablera.app.data.remote.dto.TecnicoOrdenResumenDto
import com.cablera.app.data.remote.dto.TecnicoResumenDto
import com.cablera.app.data.remote.dto.UsuarioDto
import com.cablera.app.data.remote.dto.UsuarioTurnoResumenDto

/**
 * Traducción de las respuestas de Keysls (data/remote/dto/KeyslsDto.kt) a los modelos que usan las
 * pantallas. Keysls escribe los enums en MAYÚSCULA ("ACTIVO", "EFECTIVO", "INTERNET"); la app los usa
 * en minúscula, así que acá se normalizan (y [aKeysls] hace el camino inverso al enviar).
 */

private val MESES = listOf(
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
)

/** "2026-09" -> "Septiembre 2026". */
fun etiquetaPeriodo(periodo: String): String {
    val (anio, mes) = periodo.split("-").let { (it.getOrNull(0) ?: "") to (it.getOrNull(1)?.toIntOrNull() ?: 0) }
    return if (mes in 1..12) "${MESES[mes - 1]} $anio" else periodo
}

fun nombreCompleto(nombres: String, apellidos: String?): String =
    listOfNotNull(nombres.trim().ifBlank { null }, apellidos?.trim()?.ifBlank { null }).joinToString(" ")

/** Enum de Keysls -> forma de la app ("EN_PROCESO" -> "en_proceso"). */
fun String.deKeysls(): String = lowercase()

/** Forma de la app -> enum de Keysls ("en_proceso" -> "EN_PROCESO"). */
fun String.aKeysls(): String = uppercase()

// --- Sesión ---

/** ADMIN y SUPERVISOR administran todo (gestor); SECRETARIA cobra y atiende (cobrador). */
fun KUsuario.toUi() = UsuarioDto(
    id = id,
    nombre = nombreCompleto(nombre, apellido),
    email = email,
    rol = when (rol) {
        "ADMIN", "SUPERVISOR", "SUPERADMIN" -> Roles.GESTOR
        "SECRETARIA" -> Roles.COBRADOR
        else -> rol.lowercase()
    },
)

fun KTecnico.toSesion() = TecnicoDto(id = id, nombre = nombre, apellido = apellido, email = email)

fun KTecnico.toPerfil() = PerfilTecnicoDto(
    id = id, nombre = nombre, apellido = apellido, email = email,
    telefono = telefono, zona = zona, vehiculo = vehiculo,
)

fun KTecnico.toResumen() = TecnicoResumenDto(id = id, nombre = nombre, apellido = apellido, activo = activo)

// --- Catálogos ---

fun KPlan.toUi() = PlanDto(
    id = id, nombre = nombre, tipoServicio = tipoServicio.deKeysls(), mbps = mbps, precio = precio, activo = activo,
)

fun KPuntoRed.toUi() = PuntoRedResumenDto(id = id, codigo = codigo, tipo = tipo.deKeysls())

fun KProducto.toUi() = ProductoPortalDto(
    id = id.toString(), nombre = nombre, unidad = unidad, esMedible = esMedible,
    stockTotal = stockTotal, metrosDisponibles = metrosDisponibles,
)

fun KEmpresa.toUi() = ConfiguracionDto(
    id = id, nombreEmpresa = nombre, ruc = ruc, logoUrl = null,
    telefonoContacto = telefono, direccionContacto = direccion, agencia = agencia,
)

// --- Contratos ---

fun KContrato.toUi() = ContratoDto(
    id = id,
    numero = numero,
    estado = estado.deKeysls(),
    tipoServicio = tipoServicio.deKeysls(),
    clienteId = clienteId,
    clienteNombre = cliente?.let { nombreCompleto(it.nombres, it.apellidos) } ?: "",
    clienteDni = cliente?.dniRuc,
    clienteTelefono = cliente?.telefono,
    planId = planId,
    planNombre = plan?.nombre,
    mbps = mbps ?: plan?.mbps,
    costoMensual = costoMensual ?: plan?.precio ?: 0.0,
    diaCorte = diaCorte,
    deudaPendiente = deudaPendiente,
    mesesPendientes = mesesPendientes,
    direccion = direccion,
    referencia = referencia,
    sector = sector,
    ipWan = ipWan,
    mascara = mascara,
    gateway = gateway,
    pppoeUsuario = pppoeUsuario,
    pppoePassword = pppoePassword,
    latitud = latitud,
    longitud = longitud,
    precinto = precinto,
    equipoSerie = equipoSerie,
    puntoRedId = puntoRedId,
    puntoRed = puntoRed?.toUi(),
    tecnicoInstaladorId = tecnicoInstaladorId,
    tecnicoInstalador = tecnicoInstalador?.let { TecnicoInstaladorResumenDto(it.id, it.nombre, it.apellido) },
    equipoProducto = equipoProducto?.let { EquipoProductoResumenDto(it.id.toString(), it.nombre, it.codigo) },
    fechaInstalacion = fechaInstalacion,
    motivoBaja = motivoBaja,
    fechaCorte = fechaCorte,
)

// --- Clientes ---

/** Estado del cliente deducido de su propia ficha y de sus contratos (ver ClienteDto). */
private fun estadoCliente(activo: Boolean, contratos: List<ContratoDto>): String {
    if (!activo) return EstadosServicio.RETIRADO
    if (contratos.isEmpty()) return EstadosServicio.ACTIVO
    val vigentes = contratos.filter { it.estado != EstadosContrato.BAJA }
    return when {
        vigentes.isEmpty() -> EstadosServicio.RETIRADO
        vigentes.none { it.estado == EstadosContrato.ACTIVO } -> EstadosServicio.SUSPENDIDO
        else -> EstadosServicio.ACTIVO
    }
}

fun KCliente.toUi(contratos: List<KContrato> = emptyList()): ClienteDto {
    val propios = contratos.map { it.toUi() }
    return ClienteDto(
        id = id,
        dni = dniRuc,
        nombreCompleto = nombreCompleto(nombres, apellidos),
        telefono = telefono,
        email = email,
        direccion = direccion,
        latitud = latitud,
        longitud = longitud,
        activo = activo,
        estadoServicio = estadoCliente(activo, propios),
        fechaAlta = createdAt ?: "",
        contratos = propios,
        deudaTotal = propios.sumOf { it.deudaPendiente },
    )
}

// --- Cobranza ---

/** Sectores distintos y ordenados, sin vacíos: decide si se muestra el filtro por zonas. */
fun sectoresDe(sectores: List<String?>): List<String> =
    sectores.mapNotNull { it?.trim()?.takeIf { s -> s.isNotEmpty() } }.distinct().sorted()

fun etiquetaMesesPendientes(meses: Int): String = if (meses == 1) "1 mes" else "$meses meses"

fun ContratoDto.toContratoConDeuda() = ContratoConDeudaDto(
    contratoId = id,
    clienteId = clienteId,
    clienteNombre = clienteNombre,
    dni = clienteDni,
    telefono = clienteTelefono,
    numero = numero,
    tipoServicio = tipoServicio,
    sector = sector?.trim()?.takeIf { it.isNotEmpty() },
    montoBase = costoMensual,
    suspendido = estado != EstadosContrato.ACTIVO,
    mesesPendientes = etiquetaMesesPendientes(mesesPendientes),
    deudaTotal = deudaPendiente,
)

/** Cargos a mostrar/cobrar: "pagado", "anulado" y "exonerado" no dejan saldo, se descartan. */
fun KCargo.toPendienteUi(numeroContrato: String? = null, tipoServicio: String? = null): CargoPendienteDto {
    val (anio, mes) = periodo.split("-").let { (it.getOrNull(0)?.toIntOrNull() ?: 0) to (it.getOrNull(1)?.toIntOrNull() ?: 0) }
    return CargoPendienteDto(
        id = id,
        anio = anio,
        mes = mes,
        montoCorrespondiente = monto,
        montoPagado = (monto - saldo).coerceAtLeast(0.0),
        saldo = saldo,
        estado = estado.deKeysls(),
        contratoId = contratoId,
        numeroContrato = numeroContrato,
        tipoServicio = tipoServicio,
    )
}

// --- Pagos ("boletas") ---

/** Folio del servidor (001-00001). Solo si un servidor viejo no lo manda se arma uno corto a partir del id. */
private fun KPago.folioDe() = folio ?: ("P-" + id.take(8).uppercase())

private fun KPago.cliente(): BoletaClienteDto {
    val c = cargos.firstOrNull()?.cargo?.contrato?.cliente
    return BoletaClienteDto(
        nombreCompleto = c?.let { nombreCompleto(it.nombres, it.apellidos) } ?: "",
        dni = c?.dniRuc,
        telefono = c?.telefono,
    )
}

private fun KPago.concepto(): String {
    val periodos = cargos.map { etiquetaPeriodo(it.cargo.periodo) }.distinct()
    return if (periodos.isEmpty()) "Pago" else periodos.joinToString(", ")
}

/** Un pago anulado se ve como "anulada"; sus líneas conservan el importe original (`montoAnulado`). */
private fun KPago.estadoBoleta() = if (anulado) EstadosBoleta.ANULADA else EstadosBoleta.EMITIDA

fun KPago.toBoletaResumen() = BoletaResumenDto(
    id = id,
    folio = folioDe(),
    fecha = fecha,
    cliente = cliente(),
    concepto = concepto(),
    metodoPago = metodoPago.deKeysls(),
    montoTotal = monto,
    estado = estadoBoleta(),
)

fun KPago.toBoletaDetalle() = BoletaDetalleDto(
    id = id,
    folio = folioDe(),
    fecha = fecha,
    cliente = cliente(),
    concepto = concepto(),
    metodoPago = metodoPago.deKeysls(),
    montoTotal = monto,
    estado = estadoBoleta(),
    dni = cliente().dni,
    registradoPor = usuario?.let { nombreCompleto(it.nombre, it.apellido) },
    lineas = cargos.map {
        BoletaLineaDto(
            periodo = etiquetaPeriodo(it.cargo.periodo),
            servicio = "${it.cargo.contrato.tipoServicio.deKeysls().replaceFirstChar(Char::uppercase)} · ${it.cargo.contrato.numero}",
            montoAplicado = it.montoAnulado ?: it.monto,
            esSaldo = (it.montoAnulado ?: it.monto) < it.cargo.monto,
        )
    },
    motivoAnulacion = motivoAnulacion,
    fechaAnulacion = fechaAnulacion,
)

// --- Caja ---

fun KCajaTurno.toUi() = CajaTurnoDto(
    id = id,
    usuarioApertura = UsuarioTurnoResumenDto(id = "", nombre = usuarioApertura?.let { nombreCompleto(it.nombre, it.apellido) } ?: ""),
    fechaApertura = fechaApertura,
    montoInicial = montoInicial,
    usuarioCierre = usuarioCierre?.let { UsuarioTurnoResumenDto(id = "", nombre = nombreCompleto(it.nombre, it.apellido)) },
    fechaCierre = fechaCierre,
    montoEsperado = montoEsperado ?: if (estado == "ABIERTA") montoEsperadoActual else null,
    montoContado = montoContado,
    diferencia = diferencia,
    observacion = observacion,
    estado = estado.deKeysls().let { if (it == "abierta") "abierta" else "cerrada" },
)

fun KMovimientoCaja.toUi() = MovimientoCajaDto(
    id = id,
    tipo = tipo.deKeysls(),
    fecha = fecha,
    monto = monto,
    metodoPago = metodoPago.deKeysls(),
    categoria = categoria,
    descripcion = concepto,
    origen = origen.deKeysls(),
)

fun KEgreso.toMovimiento() = MovimientoCajaDto(
    id = id,
    fecha = fecha,
    monto = monto,
    metodoPago = metodoPago.deKeysls(),
    categoria = categoria,
    descripcion = concepto,
)

// --- Órdenes de servicio ---

private val SUFIJO_A_SERVICIO = mapOf("I" to "internet", "C" to "cable", "D" to "duo")

/** "AVERIA_I" -> ("averia", "internet"). Los tipos sin sufijo de servicio quedan con el de su contrato. */
private fun separarTipoOrden(tipoOrden: String, tipoServicioContrato: String?): Pair<String, String> {
    val sufijo = tipoOrden.substringAfterLast('_', "")
    if (sufijo in SUFIJO_A_SERVICIO) {
        return tipoOrden.removeSuffix("_$sufijo").lowercase() to SUFIJO_A_SERVICIO.getValue(sufijo)
    }
    return tipoOrden.lowercase() to (tipoServicioContrato?.lowercase() ?: "")
}

fun KOrden.toUi(): OrdenServicioDto {
    val (tipo, servicio) = separarTipoOrden(tipoOrden, contrato?.tipoServicio)
    return OrdenServicioDto(
        id = id,
        nServicio = nServicio,
        tipoOrden = tipo,
        tipoServicio = servicio,
        estado = estado.deKeysls(),
        contratoId = contratoId,
        contrato = contrato?.let { ContratoResumenDto(id = it.id, numero = it.numero) },
        fechaServicio = fechaServicio,
        abonado = abonado,
        dni = dni,
        direccion = direccion,
        referencia = referencia,
        sector = sector,
        celular = celular,
        observacion = observacion,
        tecnicoId = tecnicoId,
        tecnico = tecnico?.let { TecnicoOrdenResumenDto(it.id, it.nombre, it.apellido) },
        fechaAsignacion = fechaAsignacion,
        fechaAceptacion = fechaAceptacion,
        fechaInicio = fechaInicio,
        fechaFin = fechaFin,
        tiempoInstalacionMin = tiempoInstalacion,
        ipWan = ipWan,
        mascara = mascara,
        gateway = gateway,
        pppoeUsuario = pppoeUsuario,
        pppoePassword = pppoePassword,
        latitud = latitud,
        longitud = longitud,
        precinto = precinto,
        mensualidad = mensualidad,
        mbps = mbps,
        planId = planId,
        plan = plan?.let { PlanResumenDto(it.id, it.nombre) },
    )
}
