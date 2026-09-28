package com.cablera.app.ui.common

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * Chips para filtrar por zona. Keysls no tiene zonas propias: se usa el sector de cada contrato, y
 * cada empresa decide si lo usa. Quien lo llama solo lo muestra si hay sectores (ver sectoresDe).
 */
@Composable
fun FiltroZonas(sectores: List<String>, seleccionado: String?, onSeleccionar: (String?) -> Unit, modifier: Modifier = Modifier) {
    LazyRow(modifier = modifier, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        item {
            FilterChip(selected = seleccionado == null, onClick = { onSeleccionar(null) }, label = { Text("Todas las zonas") })
        }
        items(sectores) { sector ->
            FilterChip(selected = seleccionado == sector, onClick = { onSeleccionar(sector) }, label = { Text(sector) })
        }
    }
}
