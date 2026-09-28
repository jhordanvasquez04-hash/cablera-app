package com.cablera.app.ui.common

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.cablera.app.data.repository.TAMANO_PAGINA

/**
 * Pie de un listado paginado: los listados muestran de a [TAMANO_PAGINA] para que la app siga
 * fluida aunque la empresa tenga miles de registros. "Ver más" trae la siguiente página; para ir
 * directo a uno en particular está el buscador de la pantalla.
 */
@Composable
fun VerMas(cargando: Boolean, onVerMas: () -> Unit, modifier: Modifier = Modifier) {
    Row(modifier = modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.Center) {
        if (cargando) {
            CircularProgressIndicator(modifier = Modifier.padding(8.dp))
        } else {
            OutlinedButton(onClick = onVerMas) { Text("Ver $TAMANO_PAGINA más") }
        }
    }
}

/** Agrega al final de un LazyColumn el pie "Ver más" (si hay más) o el aviso del buscador (si no). */
fun LazyListScope.pieDeLista(hayMas: Boolean, cargandoMas: Boolean, onVerMas: () -> Unit) {
    if (hayMas) {
        item(key = "ver-mas") { VerMas(cargando = cargandoMas, onVerMas = onVerMas) }
        item(key = "ver-mas-hint") {
            Text(
                "¿Buscas a alguien en particular? Usa el buscador de arriba.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
            )
        }
    }
}

/** Cargando dentro de una lista: ocupa lo justo (LoadingBox ocupa toda la pantalla y no sirve en un LazyColumn). */
@Composable
fun CargandoItem(modifier: Modifier = Modifier) {
    Row(modifier = modifier.fillMaxWidth().padding(24.dp), horizontalArrangement = Arrangement.Center) {
        CircularProgressIndicator()
    }
}

/** Error dentro de una lista, con "Reintentar" (ErrorBox ocupa toda la pantalla y no sirve en un LazyColumn). */
@Composable
fun ErrorItem(message: String, onRetry: (() -> Unit)? = null, modifier: Modifier = Modifier) {
    Column(modifier = modifier.fillMaxWidth().padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(text = message, textAlign = TextAlign.Center, style = MaterialTheme.typography.bodyLarge)
        if (onRetry != null) Button(onClick = onRetry) { Text("Reintentar") }
    }
}
