package com.cablera.app.ui.login

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cablera.app.ui.theme.Negro

// Piezas del login en blanco y negro, compartidas por el panel (LoginScreen) y el portal de campo
// (LoginTecnicoScreen): cabecera negra con marca y saludo, y una hoja blanca que sube sobre ella.
// Colores fijos, no del tema: antes de iniciar sesión no se sabe de qué empresa es la persona.
val AuthGrisTexto = Color(0xFF8A8A8E)
private val GrisBorde = Color(0xFFE3E3E6)
private val GrisCampo = Color(0xFFF7F7F8)
private val Pildora = RoundedCornerShape(percent = 50)
private val HojaShape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp)

/** Pantalla completa de autenticación. [marca] va en el cuadrito blanco de arriba (texto o ícono). */
@Composable
fun AuthLayout(
    titulo: String,
    subtitulo: String,
    marca: @Composable () -> Unit,
    contenido: @Composable ColumnScope.() -> Unit,
) {
    // Entrada: la cabecera aparece con un fundido corto y la hoja sube desde abajo.
    val progreso = remember { Animatable(0f) }
    LaunchedEffect(Unit) { progreso.animateTo(1f, tween(durationMillis = 550, easing = FastOutSlowInEasing)) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Negro)
            .imePadding(),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(start = 28.dp, end = 28.dp, top = 36.dp, bottom = 32.dp)
                .graphicsLayer {
                    alpha = progreso.value
                    translationY = (1f - progreso.value) * 24.dp.toPx()
                },
        ) {
            Box(
                modifier = Modifier
                    .size(46.dp)
                    .background(Color.White, RoundedCornerShape(14.dp)),
                contentAlignment = Alignment.Center,
            ) { marca() }
            Text(
                text = titulo,
                color = Color.White,
                style = TextStyle(fontSize = 34.sp, lineHeight = 38.sp, fontWeight = FontWeight.Bold, letterSpacing = (-0.5).sp),
                modifier = Modifier.padding(top = 26.dp),
            )
            Text(text = subtitulo, color = AuthGrisTexto, fontSize = 14.sp, modifier = Modifier.padding(top = 8.dp))
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .graphicsLayer { translationY = (1f - progreso.value) * 140.dp.toPx() }
                .background(Color.White, HojaShape)
                .verticalScroll(rememberScrollState())
                .navigationBarsPadding()
                .padding(horizontal = 24.dp, vertical = 30.dp),
            content = contenido,
        )
    }
}

/** Texto "L&J" para el cuadrito de marca. */
@Composable
fun MarcaTexto(texto: String = "L&J") {
    Text(texto, color = Negro, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
}

@Composable
fun AuthEtiqueta(texto: String) {
    Text(
        texto,
        color = Negro,
        fontSize = 14.sp,
        fontWeight = FontWeight.SemiBold,
        modifier = Modifier.padding(start = 6.dp, bottom = 8.dp),
    )
}

@Composable
fun AuthCampo(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    icono: ImageVector,
    keyboardOptions: KeyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    trailingIcon: (@Composable () -> Unit)? = null,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        placeholder = { Text(placeholder, color = AuthGrisTexto, fontSize = 14.sp) },
        leadingIcon = { Icon(icono, contentDescription = null, tint = AuthGrisTexto, modifier = Modifier.size(20.dp)) },
        trailingIcon = trailingIcon,
        singleLine = true,
        shape = Pildora,
        visualTransformation = visualTransformation,
        keyboardOptions = keyboardOptions,
        keyboardActions = keyboardActions,
        textStyle = TextStyle(fontSize = 15.sp, color = Negro),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Negro,
            unfocusedBorderColor = GrisBorde,
            focusedContainerColor = Color.White,
            unfocusedContainerColor = GrisCampo,
            cursorColor = Negro,
        ),
        modifier = Modifier.fillMaxWidth(),
    )
}

/** Campo de contraseña con el ojito para mostrarla/ocultarla. */
@Composable
fun AuthCampoPassword(
    value: String,
    onValueChange: (String) -> Unit,
    icono: ImageVector,
    onDone: () -> Unit,
) {
    var mostrar by remember { mutableStateOf(false) }
    AuthCampo(
        value = value,
        onValueChange = onValueChange,
        placeholder = "Ingresa tu contraseña",
        icono = icono,
        visualTransformation = if (mostrar) VisualTransformation.None else PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
        keyboardActions = KeyboardActions(onDone = { onDone() }),
        trailingIcon = {
            IconButton(onClick = { mostrar = !mostrar }) {
                Icon(
                    imageVector = if (mostrar) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                    contentDescription = if (mostrar) "Ocultar contraseña" else "Mostrar contraseña",
                    tint = AuthGrisTexto,
                )
            }
        },
    )
}

/** Mensaje de error que aparece/desaparece con animación. */
@Composable
fun AuthError(mensaje: String?) {
    AnimatedVisibility(
        visible = mensaje != null,
        enter = fadeIn() + expandVertically(),
        exit = fadeOut() + shrinkVertically(),
    ) {
        Text(
            text = mensaje.orEmpty(),
            color = Color(0xFFD92D20),
            fontSize = 13.sp,
            modifier = Modifier.padding(top = 12.dp, start = 6.dp),
        )
    }
}

/** Botón principal negro tipo píldora; se "hunde" un poco al presionarlo. */
@Composable
fun AuthBotonPrincipal(texto: String, cargando: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val interaccion = remember { MutableInteractionSource() }
    val presionado by interaccion.collectIsPressedAsState()
    val escala by animateFloatAsState(if (presionado) 0.97f else 1f, label = "escalaBoton")
    Button(
        onClick = onClick,
        enabled = !cargando,
        shape = Pildora,
        interactionSource = interaccion,
        colors = ButtonDefaults.buttonColors(
            containerColor = Negro,
            contentColor = Color.White,
            disabledContainerColor = Negro.copy(alpha = 0.6f),
            disabledContentColor = Color.White,
        ),
        modifier = modifier
            .fillMaxWidth()
            .padding(top = 26.dp)
            .height(56.dp)
            .graphicsLayer { scaleX = escala; scaleY = escala },
    ) {
        if (cargando) {
            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
        } else {
            Text(texto, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

/** Separador "o" y botón secundario con borde (ej. cambiar entre panel y portal técnico). */
@Composable
fun AuthAlternativa(texto: String, onClick: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 22.dp)) {
        HorizontalDivider(modifier = Modifier.weight(1f), color = GrisBorde)
        Text("o", color = AuthGrisTexto, fontSize = 13.sp, modifier = Modifier.padding(horizontal = 12.dp))
        HorizontalDivider(modifier = Modifier.weight(1f), color = GrisBorde)
    }
    OutlinedButton(
        onClick = onClick,
        shape = Pildora,
        border = BorderStroke(1.dp, GrisBorde),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = Negro),
        modifier = Modifier
            .fillMaxWidth()
            .height(54.dp),
    ) {
        Text(texto, fontSize = 15.sp, fontWeight = FontWeight.Medium)
    }
}

@Composable
fun ColumnScope.AuthPie(texto: String) {
    Text(
        text = texto,
        color = AuthGrisTexto,
        fontSize = 12.5.sp,
        modifier = Modifier
            .align(Alignment.CenterHorizontally)
            .padding(top = 22.dp),
    )
}
