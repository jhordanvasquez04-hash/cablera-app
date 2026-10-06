package com.cablera.app.ui.common

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

@Composable
fun <T> StateContent(
    state: UiState<T>,
    modifier: Modifier = Modifier,
    onRetry: (() -> Unit)? = null,
    content: @Composable (T) -> Unit,
) {
    // Fundido entre "cargando", "error" y el contenido. contentKey = tipo de estado: si solo cambian
    // los datos (ej. al refrescar) no se repite la animación, se actualiza en el lugar.
    AnimatedContent(
        targetState = state,
        contentKey = { it::class },
        transitionSpec = { fadeIn(tween(260)) togetherWith fadeOut(tween(160)) },
        label = "estadoPantalla",
    ) { actual ->
        when (actual) {
            is UiState.Loading -> LoadingBox(modifier)
            is UiState.Error -> ErrorBox(message = actual.message, modifier = modifier, onRetry = onRetry)
            is UiState.Success -> Box(modifier = modifier) { content(actual.data) }
        }
    }
}

@Composable
fun LoadingBox(modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}

@Composable
fun ErrorBox(message: String, modifier: Modifier = Modifier, onRetry: (() -> Unit)? = null) {
    Box(modifier = modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(text = message, textAlign = TextAlign.Center, style = MaterialTheme.typography.bodyLarge)
            if (onRetry != null) {
                Button(onClick = onRetry) { Text("Reintentar") }
            }
        }
    }
}
