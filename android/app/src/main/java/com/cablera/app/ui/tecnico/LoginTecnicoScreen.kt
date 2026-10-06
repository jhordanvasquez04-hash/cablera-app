package com.cablera.app.ui.tecnico

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Mail
import androidx.compose.material3.Icon
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
import com.cablera.app.ui.login.AuthAlternativa
import com.cablera.app.ui.login.AuthBotonPrincipal
import com.cablera.app.ui.login.AuthCampo
import com.cablera.app.ui.login.AuthCampoPassword
import com.cablera.app.ui.login.AuthEtiqueta
import com.cablera.app.ui.login.AuthError
import com.cablera.app.ui.login.AuthLayout
import com.cablera.app.ui.login.AuthPie
import com.cablera.app.ui.theme.Negro

/** Portal de campo — pantalla de login APARTE de [com.cablera.app.ui.login.LoginScreen]: mismo
 * diseño (componentes de AuthComponents.kt), pero habla con TecnicoAuthRepository, no AuthRepository. */
@Composable
fun LoginTecnicoScreen(
    onLoginSuccess: () -> Unit,
    onVolverAPanel: () -> Unit,
    viewModel: LoginTecnicoViewModel = run {
        val container = LocalAppContainer.current
        viewModel(factory = LambdaViewModelFactory { LoginTecnicoViewModel(container.tecnicoAuthRepository) })
    },
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    AuthLayout(
        titulo = "Portal\nTécnico",
        subtitulo = "Ingresa con tu cuenta de técnico de campo.",
        marca = { Icon(Icons.Filled.Build, contentDescription = null, tint = Negro, modifier = Modifier.size(22.dp)) },
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
        AuthAlternativa("Soy gestor o cobrador", onClick = onVolverAPanel)
        AuthPie("Solo para técnicos de campo")
    }
}
