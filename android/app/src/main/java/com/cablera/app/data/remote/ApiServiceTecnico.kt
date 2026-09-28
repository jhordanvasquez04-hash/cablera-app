package com.cablera.app.data.remote

import com.cablera.app.data.remote.dto.KCompletarOrdenRequest
import com.cablera.app.data.remote.dto.KOrden
import com.cablera.app.data.remote.dto.KPaginado
import com.cablera.app.data.remote.dto.KProducto
import com.cablera.app.data.remote.dto.KTecnicoLoginResponse
import com.cablera.app.data.remote.dto.KTecnicoMe
import com.cablera.app.data.remote.dto.LoginRequest
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Portal de campo — endpoints aparte de [ApiService] a propósito, para que sea imposible
 * mezclar por error un token de técnico con una llamada del panel (o viceversa): cada uno vive
 * en su propio cliente Retrofit/OkHttp, con su propio interceptor de auth (ver AppContainer).
 */
interface ApiServiceTecnico {

    @POST("auth/tecnico/login")
    suspend fun login(@Body request: LoginRequest): KTecnicoLoginResponse

    @GET("auth/tecnico/me")
    suspend fun perfil(): KTecnicoMe

    // Pendientes sin asignar + las órdenes propias asignadas o en proceso.
    @GET("tecnico/ordenes")
    suspend fun listarOrdenes(): List<KOrden>

    // Las últimas completadas/canceladas del propio técnico.
    @GET("tecnico/ordenes/historial")
    suspend fun historialOrdenes(): List<KOrden>

    @GET("tecnico/ordenes/{id}")
    suspend fun obtenerOrden(@Path("id") id: String): KOrden

    @POST("tecnico/ordenes/{id}/tomar")
    suspend fun tomarOrden(@Path("id") id: String): KOrden

    @PATCH("tecnico/ordenes/{id}/aceptar")
    suspend fun aceptarOrden(@Path("id") id: String): KOrden

    @PATCH("tecnico/ordenes/{id}/iniciar")
    suspend fun iniciarOrden(@Path("id") id: String): KOrden

    @PATCH("tecnico/ordenes/{id}/completar")
    suspend fun completarOrden(@Path("id") id: String, @Body request: KCompletarOrdenRequest): KOrden

    // El catálogo de productos acepta también el token del técnico (para registrar consumos).
    @GET("productos/catalogo")
    suspend fun listarProductos(@Query("limit") limit: Int = 200): KPaginado<KProducto>
}
