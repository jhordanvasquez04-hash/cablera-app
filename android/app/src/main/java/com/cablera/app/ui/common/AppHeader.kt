package com.cablera.app.ui.common

import com.cablera.app.ui.theme.colorCabecera
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/** Cabecera negra fija (título + subtítulo opcional + acciones), con espacio opcional debajo
 * para buscador o filtros. Termina en una curva: el contenido de la pantalla "sube" sobre el negro
 * como una hoja con esquinas redondeadas, igual que en el login. */
@Composable
fun AppHeader(
    titulo: String,
    subtitulo: String? = null,
    onBack: (() -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {},
    contenidoExtra: (@Composable () -> Unit)? = null,
    // false cuando la pantalla sigue con un bloque negro pegado a la cabecera (ej. Ficha del cliente)
    curva: Boolean = true,
) {
    Surface(color = colorCabecera(), contentColor = Color.White) {
      Column {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 6.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (onBack != null) {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = Color.White)
                        }
                    }
                    Column {
                        Text(titulo, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Color.White)
                        if (subtitulo != null) {
                            Text(
                                subtitulo,
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.White.copy(alpha = 0.75f),
                            )
                        }
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically, content = actions)
            }
            if (contenidoExtra != null) {
                Column(modifier = Modifier.padding(top = 10.dp)) { contenidoExtra() }
            }
        }
        // Curva inferior: borde superior redondeado del fondo de la pantalla, sobre el negro
        if (curva) Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(22.dp)
                .background(MaterialTheme.colorScheme.background, RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)),
        )
      }
    }
}

/** Buscador blanco dentro de la cabecera negra (fondo sólido para contraste sobre el primario). */
@Composable
fun HeaderSearchField(value: String, onValueChange: (String) -> Unit, placeholder: String) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        placeholder = { Text(placeholder) },
        leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
        singleLine = true,
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = MaterialTheme.colorScheme.surface,
            unfocusedContainerColor = MaterialTheme.colorScheme.surface,
            focusedBorderColor = MaterialTheme.colorScheme.surface,
            unfocusedBorderColor = MaterialTheme.colorScheme.surface,
        ),
        modifier = Modifier.fillMaxWidth(),
    )
}
