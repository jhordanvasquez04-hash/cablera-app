package com.cablera.app.ui.login

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Mail
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.cablera.app.LocalAppContainer
import com.cablera.app.ui.common.LambdaViewModelFactory

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onNavigateToLoginTecnico: () -> Unit = {},
    viewModel: LoginViewModel = run {
        val container = LocalAppContainer.current
        viewModel(factory = LambdaViewModelFactory { LoginViewModel(container.authRepository) })
    },
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    // Marca fija de L&J Tech (el producto), nunca la de una empresa: antes de iniciar sesión no hay
    // forma de saber a cuál de las empresas que usan esta misma app pertenece la persona.
    AuthLayout(
        titulo = "¡Bienvenido\nde nuevo!",
        subtitulo = "Ingresa para continuar con L&J Tech.",
        marca = { MarcaTexto() },
    ) {
        AuthEtiqueta("Correo")
        AuthCampo(
            value = uiState.email,
            onValueChange = viewModel::onEmailChange,
            placeholder = "Ingresa tu correo",
            icono = Icons.Outlined.Mail,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
        )
        Spacer(Modifier.height(18.dp))
        AuthEtiqueta("Contraseña")
        AuthCampoPassword(
            value = uiState.password,
            onValueChange = viewModel::onPasswordChange,
            icono = Icons.Outlined.Lock,
            onDone = { viewModel.login(onLoginSuccess) },
        )
        AuthError(uiState.error)
        AuthBotonPrincipal("Ingresar", cargando = uiState.cargando, onClick = { viewModel.login(onLoginSuccess) })
        AuthAlternativa("Soy técnico de campo", onClick = onNavigateToLoginTecnico)
        AuthPie("Ingresa con tu cuenta de gestor o cobrador")
    }
}
