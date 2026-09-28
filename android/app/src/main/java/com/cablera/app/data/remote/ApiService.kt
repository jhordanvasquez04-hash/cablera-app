package com.cablera.app.data.remote

import com.cablera.app.data.remote.dto.KAbrirCajaRequest
import com.cablera.app.data.remote.dto.KAnularPagoRequest
import com.cablera.app.data.remote.dto.KCajaTurno
import com.cablera.app.data.remote.dto.KCambiarEstadoOrdenRequest
import com.cablera.app.data.remote.dto.KCargo
import com.cablera.app.data.remote.dto.KCerrarCajaRequest
import com.cablera.app.data.remote.dto.KCliente
import com.cablera.app.data.remote.dto.KClienteRequest
import com.cablera.app.data.remote.dto.KContrato
import com.cablera.app.data.remote.dto.KContratoRequest
import com.cablera.app.data.remote.dto.KEgreso
import com.cablera.app.data.remote.dto.KEgresoRequest
import com.cablera.app.data.remote.dto.KEmpresa
import com.cablera.app.data.remote.dto.KEmpresaRequest
import com.cablera.app.data.remote.dto.KKpisResponse
import com.cablera.app.data.remote.dto.KReportePagos
import com.cablera.app.data.remote.dto.KLoginResponse
import com.cablera.app.data.remote.dto.KMovimientoCaja
import com.cablera.app.data.remote.dto.KOrden
import com.cablera.app.data.remote.dto.KOrdenRequest
import com.cablera.app.data.remote.dto.KPago
import com.cablera.app.data.remote.dto.KPlan
import com.cablera.app.data.remote.dto.KPuntoRed
import com.cablera.app.data.remote.dto.KRegistrarPagoRequest
import com.cablera.app.data.remote.dto.KTecnico
import com.cablera.app.data.remote.dto.LoginRequest
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * API de Keysls (Express) bajo `/api`. Solo lo que usa la app del celular; las respuestas se
 * traducen a los modelos de UI en `data/mapper/KeyslsMappers.kt`.
 */
interface ApiService {

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): KLoginResponse

    // Los listados aceptan limit/offset (paginación) y filtros; sin limit devuelven todo, como la web.
    @GET("clientes")
    suspend fun listarClientes(
        @Query("q") q: String? = null,
        @Query("sector") sector: String? = null,
        @Query("limit") limit: Int? = null,
        @Query("offset") offset: Int? = null,
    ): List<KCliente>

    @GET("clientes/{id}")
    suspend fun obtenerCliente(@Path("id") id: String): KCliente

    @POST("clientes")
    suspend fun crearCliente(@Body request: KClienteRequest): KCliente

    @PUT("clientes/{id}")
    suspend fun actualizarCliente(@Path("id") id: String, @Body request: KClienteRequest): KCliente

    @GET("contratos")
    suspend fun listarContratos(
        @Query("q") q: String? = null,
        @Query("sector") sector: String? = null,
        @Query("conDeuda") conDeuda: Boolean? = null,
        @Query("clienteIds") clienteIds: String? = null,
        @Query("limit") limit: Int? = null,
        @Query("offset") offset: Int? = null,
    ): List<KContrato>

    // Zonas que usa la empresa (sectores distintos de sus contratos); vacío = no usa zonas.
    @GET("contratos/sectores")
    suspend fun listarSectores(): List<String>

    @GET("contratos/{id}")
    suspend fun obtenerContrato(@Path("id") id: String): KContrato

    @POST("contratos")
    suspend fun crearContrato(@Body request: KContratoRequest): KContrato

    // La API exige el objeto completo también al editar (no acepta cambios parciales).
    @PUT("contratos/{id}")
    suspend fun actualizarContrato(@Path("id") id: String, @Body request: KContratoRequest): KContrato

    @GET("cargos/contrato/{id}")
    suspend fun cargosDeContrato(@Path("id") id: String): List<KCargo>

    @GET("pagos")
    suspend fun listarPagos(
        @Query("q") q: String? = null,
        @Query("fechaDesde") fechaDesde: String? = null,
        @Query("fechaHasta") fechaHasta: String? = null,
        @Query("contratoId") contratoId: String? = null,
        @Query("limit") limit: Int? = null,
        @Query("offset") offset: Int? = null,
    ): List<KPago>

    @GET("pagos/{id}")
    suspend fun obtenerPago(@Path("id") id: String): KPago

    // Anular no borra el pago: queda en el historial como anulado y su monto vuelve a ser deuda.
    @POST("pagos/{id}/anular")
    suspend fun anularPago(@Path("id") id: String, @Body request: KAnularPagoRequest): KPago

    @GET("pagos/reporte")
    suspend fun reportePagos(
        @Query("fechaDesde") fechaDesde: String? = null,
        @Query("fechaHasta") fechaHasta: String? = null,
    ): KReportePagos

    @GET("dashboard/kpis")
    suspend fun kpis(): KKpisResponse

    @POST("pagos")
    suspend fun registrarPago(@Body request: KRegistrarPagoRequest): KPago

    @GET("caja/actual")
    suspend fun cajaActual(): KCajaTurno?

    @GET("caja/historial")
    suspend fun cajaHistorial(): List<KCajaTurno>

    @POST("caja/abrir")
    suspend fun abrirCaja(@Body request: KAbrirCajaRequest): KCajaTurno

    @POST("caja/cerrar")
    suspend fun cerrarCaja(@Body request: KCerrarCajaRequest): KCajaTurno

    @GET("egresos")
    suspend fun listarEgresos(
        @Query("fechaDesde") fechaDesde: String? = null,
        @Query("fechaHasta") fechaHasta: String? = null,
        @Query("limit") limit: Int? = null,
        @Query("offset") offset: Int? = null,
    ): List<KEgreso>

    @POST("egresos")
    suspend fun crearEgreso(@Body request: KEgresoRequest): KEgreso

    // Ingreso externo: plata que entra sin ser el pago de un cliente (mismo cuerpo que un egreso).
    @POST("ingresos")
    suspend fun crearIngreso(@Body request: KEgresoRequest): KEgreso

    @GET("ingresos")
    suspend fun listarIngresos(
        @Query("fechaDesde") fechaDesde: String? = null,
        @Query("fechaHasta") fechaHasta: String? = null,
        @Query("limit") limit: Int? = null,
        @Query("offset") offset: Int? = null,
    ): List<KEgreso>

    // Lista unificada (cobros + ingresos externos + egresos), filtrable por tipo: "INGRESO" | "EGRESO".
    @GET("caja/movimientos")
    suspend fun movimientosCaja(
        @Query("tipo") tipo: String? = null,
        @Query("fechaDesde") fechaDesde: String? = null,
        @Query("fechaHasta") fechaHasta: String? = null,
        @Query("limit") limit: Int? = null,
        @Query("offset") offset: Int? = null,
    ): List<KMovimientoCaja>

    @GET("ordenes-servicio")
    suspend fun listarOrdenes(
        @Query("estado") estado: String? = null,
        @Query("q") q: String? = null,
        @Query("limit") limit: Int? = null,
        @Query("offset") offset: Int? = null,
        @Query("contratoIds") contratoIds: String? = null,
        /** "prioridad": abiertas primero, luego canceladas y al final completadas. */
        @Query("orden") orden: String? = null,
    ): List<KOrden>

    @GET("ordenes-servicio/{id}")
    suspend fun obtenerOrden(@Path("id") id: String): KOrden

    @POST("ordenes-servicio")
    suspend fun crearOrden(@Body request: KOrdenRequest): KOrden

    @PATCH("ordenes-servicio/{id}/estado")
    suspend fun cambiarEstadoOrden(@Path("id") id: String, @Body request: KCambiarEstadoOrdenRequest): KOrden

    @GET("tecnicos")
    suspend fun listarTecnicos(): List<KTecnico>

    @GET("puntos-red")
    suspend fun listarPuntosRed(): List<KPuntoRed>

    @GET("planes")
    suspend fun listarPlanes(): List<KPlan>

    @GET("empresa")
    suspend fun obtenerEmpresa(): KEmpresa

    @PUT("empresa")
    suspend fun actualizarEmpresa(@Body request: KEmpresaRequest): KEmpresa
}
