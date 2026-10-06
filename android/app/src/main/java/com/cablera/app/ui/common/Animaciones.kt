package com.cablera.app.ui.common

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.lazy.LazyItemScope
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier

/**
 * Elemento de lista animado: aparece con un fundido y un leve deslizamiento hacia arriba, y cuando la
 * lista cambia (filtros, búsqueda, un pago registrado...) se reacomoda con animación (animateItem)
 * en vez de saltar. Usar dentro de `items(...) { ItemAnimado { ... } }` de una LazyColumn.
 */
@Composable
fun LazyItemScope.ItemAnimado(content: @Composable () -> Unit) {
    val estado = remember { MutableTransitionState(false).apply { targetState = true } }
    AnimatedVisibility(
        visibleState = estado,
        enter = fadeIn(tween(260)) + slideInVertically(tween(300)) { it / 6 },
        modifier = Modifier.animateItem(),
    ) {
        content()
    }
}
