package com.cablera.app.ui.common

import android.graphics.BitmapFactory
import androidx.compose.foundation.Image
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import com.cablera.app.LocalAppContainer
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Request

/**
 * Descarga y decodifica una imagen remota a mano (sin Coil/Glide: la única imagen remota de la
 * app es el logo de Configuración, no justifica una librería aparte). No cachea en disco.
 */
@Composable
fun RemoteImage(
    url: String?,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    placeholder: @Composable () -> Unit = {},
) {
    val container = LocalAppContainer.current
    val bitmap by produceState<ImageBitmap?>(initialValue = null, url) {
        value = null
        if (url != null) {
            value = withContext(Dispatchers.IO) {
                try {
                    container.okHttpClient.newCall(Request.Builder().url(url).build()).execute().use { respuesta ->
                        val bytes = respuesta.body?.bytes()
                        bytes?.let { BitmapFactory.decodeByteArray(it, 0, it.size)?.asImageBitmap() }
                    }
                } catch (_: Exception) {
                    null
                }
            }
        }
    }

    if (bitmap != null) {
        Image(bitmap = bitmap!!, contentDescription = contentDescription, modifier = modifier, contentScale = ContentScale.Crop)
    } else {
        placeholder()
    }
}
