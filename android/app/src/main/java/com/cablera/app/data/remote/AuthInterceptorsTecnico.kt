package com.cablera.app.data.remote

import com.cablera.app.data.session.TecnicoSessionManager
import okhttp3.Interceptor
import okhttp3.Response

/** Igual que AuthHeaderInterceptor pero leyendo el token de [TecnicoSessionManager] — este es el
 * cliente OkHttp separado del portal de campo (ver AppContainer). */
class TecnicoAuthHeaderInterceptor(
    private val sessionManager: TecnicoSessionManager,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        if (original.url.encodedPath.endsWith("/auth/tecnico/login")) {
            return chain.proceed(original)
        }
        val token = sessionManager.tokenBlocking()
        val request = if (token != null) {
            original.newBuilder().addHeader("Authorization", "Bearer $token").build()
        } else {
            original
        }
        return chain.proceed(request)
    }
}

class TecnicoSessionExpiredInterceptor(
    private val sessionManager: TecnicoSessionManager,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val response = chain.proceed(request)
        if (response.code == 401 && !request.url.encodedPath.endsWith("/auth/tecnico/login")) {
            sessionManager.clearBlocking()
        }
        return response
    }
}
