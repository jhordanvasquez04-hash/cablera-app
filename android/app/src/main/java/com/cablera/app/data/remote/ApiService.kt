package com.cablera.app.data.remote

import com.cablera.app.data.remote.dto.AprobarGastoRequest
import com.cablera.app.data.remote.dto.BoletaCreadaDto
import com.cablera.app.data.remote.dto.BoletaDetalleDto
import com.cablera.app.data.remote.dto.BoletaResumenDto
import com.cablera.app.data.remote.dto.CargoPendienteDto
import com.cablera.app.data.remote.dto.CategoriaEgresoDto
import com.cablera.app.data.remote.dto.ClienteDto
import com.cablera.app.data.remote.dto.ComentarServicioRequest
import com.cablera.app.data.remote.dto.CreateServicioTecnicoRequest
import com.cablera.app.data.remote.dto.CreateTipoServicioTecnicoRequest
import com.cablera.app.data.remote.dto.LiquidarServicioRequest
import com.cablera.app.data.remote.dto.ServicioTecnicoDto
import com.cablera.app.data.remote.dto.TipoServicioTecnicoDto
import com.cablera.app.data.remote.dto.UpdateTipoServicioTecnicoRequest
import com.cablera.app.data.remote.dto.ClienteFichaDto
import com.cablera.app.data.remote.dto.ConfiguracionDto
import com.cablera.app.data.remote.dto.CreateCategoriaEgresoRequest
import com.cablera.app.data.remote.dto.CreateClienteRequest
import com.cablera.app.data.remote.dto.CreateMovimientoRequest
import com.cablera.app.data.remote.dto.CreateTipoServicioRequest
import com.cablera.app.data.remote.dto.CreateUsuarioRequest
import com.cablera.app.data.remote.dto.DarDeBajaRequest
import com.cablera.app.data.remote.dto.DescuentoDto
import com.cablera.app.data.remote.dto.CreateDescuentoRequest
import com.cablera.app.data.remote.dto.ServicioContratadoInput
import com.cablera.app.data.remote.dto.UpdateServicioContratadoRequest
import com.cablera.app.data.remote.dto.GastoReportadoDto
import com.cablera.app.data.remote.dto.LoginRequest
import com.cablera.app.data.remote.dto.LoginResponse
import com.cablera.app.data.remote.dto.MovimientoCajaDto
import com.cablera.app.data.remote.dto.RegistrarPagoRequest
import com.cablera.app.data.remote.dto.ReportarGastoRequest
import com.cablera.app.data.remote.dto.ResumenCajaDto
import com.cablera.app.data.remote.dto.ResumenCobranzaDto
import com.cablera.app.data.remote.dto.TipoServicioDto
import com.cablera.app.data.remote.dto.UpdateClienteRequest
import com.cablera.app.data.remote.dto.UpdateConfiguracionRequest
import com.cablera.app.data.remote.dto.UsuarioListadoDto
import com.cablera.app.data.remote.dto.ZonaDto
import okhttp3.MultipartBody
import okhttp3.ResponseBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.Streaming

interface ApiService {

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @GET("zonas")
    suspend fun listarZonas(): List<ZonaDto>

    @GET("cobranza/resumen")
    suspend fun resumenCobranza(
        @Query("zonaId") zonaId: String?,
        @Query("busqueda") busqueda: String?,
    ): ResumenCobranzaDto

    @GET("clientes")
    suspend fun listarClientes(
        @Query("zonaId") zonaId: String?,
        @Query("estado") estado: String?,
        @Query("busqueda") busqueda: String?,
    ): List<ClienteDto>

    @GET("clientes/{id}")
    suspend fun obtenerCliente(@Path("id") id: String): ClienteDto

    @GET("clientes/{id}/ficha")
    suspend fun obtenerFichaCliente(@Path("id") id: String): ClienteFichaDto

    @GET("clientes/{id}/cargos-pendientes")
    suspend fun cargosPendientesDeCliente(@Path("id") id: String): List<CargoPendienteDto>

    @POST("clientes")
    suspend fun crearCliente(@Body request: CreateClienteRequest): ClienteDto

    @PATCH("clientes/{id}")
    suspend fun actualizarCliente(@Path("id") id: String, @Body request: UpdateClienteRequest): ClienteDto

    @POST("clientes/{id}/baja")
    suspend fun darDeBajaCliente(@Path("id") id: String, @Body request: DarDeBajaRequest): ClienteDto

    @POST("clientes/{id}/suspender")
    suspend fun suspenderCliente(@Path("id") id: String): ClienteDto

    @POST("clientes/{id}/activar")
    suspend fun activarCliente(@Path("id") id: String): ClienteDto

    @POST("clientes/{id}/servicios")
    suspend fun agregarServicio(@Path("id") id: String, @Body request: ServicioContratadoInput): ClienteDto

    @PATCH("clientes/{id}/servicios/{servicioId}")
    suspend fun actualizarServicio(
        @Path("id") id: String,
        @Path("servicioId") servicioId: String,
        @Body request: UpdateServicioContratadoRequest,
    ): ClienteDto

    @POST("clientes/{id}/servicios/{servicioId}/suspender")
    suspend fun suspenderServicio(@Path("id") id: String, @Path("servicioId") servicioId: String): ClienteDto

    @POST("clientes/{id}/servicios/{servicioId}/activar")
    suspend fun activarServicio(@Path("id") id: String, @Path("servicioId") servicioId: String): ClienteDto

    @POST("clientes/{id}/servicios/{servicioId}/baja")
    suspend fun darDeBajaServicio(
        @Path("id") id: String,
        @Path("servicioId") servicioId: String,
        @Body request: DarDeBajaRequest,
    ): ClienteDto

    @GET("clientes/{id}/servicios/{servicioId}/descuentos")
    suspend fun listarDescuentosDeServicio(@Path("id") id: String, @Path("servicioId") servicioId: String): List<DescuentoDto>

    @POST("clientes/{id}/servicios/{servicioId}/descuentos")
    suspend fun aplicarDescuento(
        @Path("id") id: String,
        @Path("servicioId") servicioId: String,
        @Body request: CreateDescuentoRequest,
    ): DescuentoDto

    @POST("boletas")
    suspend fun registrarPago(@Body request: RegistrarPagoRequest): BoletaCreadaDto

    @GET("boletas")
    suspend fun listarBoletas(@Query("busqueda") busqueda: String?): List<BoletaResumenDto>

    @GET("boletas/{id}")
    suspend fun obtenerBoleta(@Path("id") id: String): BoletaDetalleDto

    @POST("boletas/{id}/anular")
    suspend fun anularBoleta(@Path("id") id: String, @Body body: Map<String, String>): BoletaDetalleDto

    @POST("caja/gastos-reportados")
    suspend fun reportarGasto(@Body request: ReportarGastoRequest): GastoReportadoDto

    @GET("configuracion")
    suspend fun obtenerConfiguracion(): ConfiguracionDto

    @PATCH("configuracion")
    suspend fun actualizarConfiguracion(@Body request: UpdateConfiguracionRequest): ConfiguracionDto

    @Multipart
    @POST("configuracion/logo")
    suspend fun subirLogo(@Part file: MultipartBody.Part): ConfiguracionDto

    @DELETE("configuracion/logo")
    suspend fun quitarLogo(): ConfiguracionDto

    @GET("usuarios")
    suspend fun listarUsuarios(): List<UsuarioListadoDto>

    @POST("usuarios")
    suspend fun crearUsuario(@Body request: CreateUsuarioRequest): UsuarioListadoDto

    @POST("usuarios/{id}/desactivar")
    suspend fun desactivarUsuario(@Path("id") id: String): UsuarioListadoDto

    @POST("usuarios/{id}/activar")
    suspend fun activarUsuario(@Path("id") id: String): UsuarioListadoDto

    @GET("tipos-servicio")
    suspend fun listarTiposServicio(): List<TipoServicioDto>

    @POST("tipos-servicio")
    suspend fun crearTipoServicio(@Body request: CreateTipoServicioRequest): TipoServicioDto

    @Streaming
    @GET("exportacion/backup-excel")
    suspend fun descargarBackupExcel(): ResponseBody

    @GET("caja/movimientos")
    suspend fun listarMovimientosCaja(@Query("desde") desde: String?, @Query("hasta") hasta: String?): List<MovimientoCajaDto>

    @POST("caja/movimientos")
    suspend fun crearMovimientoCaja(@Body request: CreateMovimientoRequest): MovimientoCajaDto

    @GET("caja/resumen")
    suspend fun resumenCaja(@Query("desde") desde: String?, @Query("hasta") hasta: String?): ResumenCajaDto

    @GET("caja/gastos-reportados")
    suspend fun listarGastosReportados(@Query("estado") estado: String?): List<GastoReportadoDto>

    @POST("caja/gastos-reportados/{id}/aprobar")
    suspend fun aprobarGasto(@Path("id") id: String, @Body request: AprobarGastoRequest): GastoReportadoDto

    @POST("caja/gastos-reportados/{id}/rechazar")
    suspend fun rechazarGasto(@Path("id") id: String): GastoReportadoDto

    @GET("categorias-egreso")
    suspend fun listarCategoriasEgreso(): List<CategoriaEgresoDto>

    @POST("categorias-egreso")
    suspend fun crearCategoriaEgreso(@Body request: CreateCategoriaEgresoRequest): CategoriaEgresoDto

    @GET("tipos-servicio-tecnico")
    suspend fun listarTiposServicioTecnico(): List<TipoServicioTecnicoDto>

    @POST("tipos-servicio-tecnico")
    suspend fun crearTipoServicioTecnico(@Body request: CreateTipoServicioTecnicoRequest): TipoServicioTecnicoDto

    @PATCH("tipos-servicio-tecnico/{id}")
    suspend fun actualizarTipoServicioTecnico(@Path("id") id: String, @Body request: UpdateTipoServicioTecnicoRequest): TipoServicioTecnicoDto

    @GET("servicios-tecnicos")
    suspend fun listarServiciosTecnicos(
        @Query("estado") estado: String?,
        @Query("tipoServicioTecnicoId") tipoServicioTecnicoId: String?,
        @Query("clienteId") clienteId: String?,
    ): List<ServicioTecnicoDto>

    @POST("servicios-tecnicos")
    suspend fun crearServicioTecnico(@Body request: CreateServicioTecnicoRequest): ServicioTecnicoDto

    @POST("servicios-tecnicos/{id}/comentar")
    suspend fun comentarServicioTecnico(@Path("id") id: String, @Body request: ComentarServicioRequest): ServicioTecnicoDto

    @POST("servicios-tecnicos/{id}/liquidar")
    suspend fun liquidarServicioTecnico(@Path("id") id: String, @Body request: LiquidarServicioRequest): ServicioTecnicoDto
}
