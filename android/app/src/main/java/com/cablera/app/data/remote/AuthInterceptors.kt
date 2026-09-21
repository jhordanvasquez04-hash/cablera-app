package com.cablera.app.data.remote

import com.cablera.app.data.session.SessionManager
import okhttp3.Interceptor
import okhttp3.Response

/** Agrega el Bearer token guardado en sesión a toda request, salvo el login. */
class AuthHeaderInterceptor(
    private val sessionManager: SessionManager,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        if (original.url.encodedPath.endsWith("/auth/login")) {
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

/**
 * Ante un 401 (token inválido o vencido) limpia la sesión guardada, igual que hace
 * frontend/src/api/client.ts con el interceptor de axios: en vez de dejar la app en un
 * estado roto, la pantalla de navegación observa la sesión y redirige a Login.
 */
class SessionExpiredInterceptor(
    private val sessionManager: SessionManager,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val response = chain.proceed(request)
        if (response.code == 401 && !request.url.encodedPath.endsWith("/auth/login")) {
            sessionManager.clearBlocking()
        }
        return response
    }
}
