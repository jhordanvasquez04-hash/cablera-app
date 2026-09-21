package com.cablera.app.ui.configuracion

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.cablera.app.LocalAppContainer
import com.cablera.app.data.remote.dto.FormatosBoleta
import com.cablera.app.data.remote.dto.ModosCaja
import com.cablera.app.data.remote.dto.Roles
import com.cablera.app.data.remote.dto.TipoServicioDto
import com.cablera.app.data.remote.dto.UsuarioListadoDto
import com.cablera.app.ui.common.AppHeader
import com.cablera.app.ui.common.EmptyState
import com.cablera.app.ui.common.EstadoChip
import com.cablera.app.ui.common.LambdaViewModelFactory
import com.cablera.app.ui.common.RemoteImage
import com.cablera.app.ui.common.StateContent
import com.cablera.app.ui.common.UiState
import com.cablera.app.ui.navigation.CableraBottomBar
import com.cablera.app.ui.theme.CableraPrimary
import com.cablera.app.ui.theme.CableraSecondary
import com.cablera.app.ui.theme.parseHexColor
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ConfiguracionScreen(
    navController: NavHostController,
    viewModel: ConfiguracionViewModel = run {
        val container = LocalAppContainer.current
        viewModel(
            factory = LambdaViewModelFactory {
                ConfiguracionViewModel(container.configuracionRepository, container.configuracionState, container.serviciosTecnicosRepository)
            },
        )
    },
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val container = LocalAppContainer.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val seleccionarImagen = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri != null) {
            val resolver = context.contentResolver
            val mimeType = resolver.getType(uri) ?: "image/jpeg"
            val bytes = resolver.openInputStream(uri)?.use { it.readBytes() }
            if (bytes != null) {
                val extension = when (mimeType) {
                    "image/png" -> "png"
                    "image/webp" -> "webp"
                    else -> "jpg"
                }
                val body = bytes.toRequestBody(mimeType.toMediaTypeOrNull())
                viewModel.subirLogo(MultipartBody.Part.createFormData("file", "logo.$extension", body))
            }
        }
    }

    var backupPendiente by remember { mutableStateOf<ByteArray?>(null) }
    val crearArchivoBackup = rememberLauncherForActivityResult(
        ActivityResultContracts.CreateDocument("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    ) { uri: Uri? ->
        val bytes = backupPendiente
        if (uri != null && bytes != null) {
            scope.launch(Dispatchers.IO) {
                context.contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
            }
        }
        backupPendiente = null
    }

    Scaffold(
        topBar = { AppHeader(titulo = "Ajustes") },
        bottomBar = { CableraBottomBar(navController) },
    ) { padding ->
        StateContent(state = uiState.configuracion, modifier = Modifier.padding(padding), onRetry = viewModel::cargarConfiguracion) { _ ->
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                item {
                    val logoUrl = (uiState.configuracion as? UiState.Success)?.data?.logoUrl
                    SeccionIdentidad(
                        uiState = uiState,
                        logoUrl = container.resolverUrlArchivo(logoUrl),
                        onNombreChange = viewModel::onNombreEmpresaChange,
                        onRucChange = viewModel::onRucChange,
                        onColorPrimarioChange = viewModel::onColorPrimarioChange,
                        onColorSecundarioChange = viewModel::onColorSecundarioChange,
                        onTelefonoChange = viewModel::onTelefonoChange,
                        onEmailChange = viewModel::onEmailChange,
                        onDireccionChange = viewModel::onDireccionChange,
                        onCambiarLogo = { seleccionarImagen.launch("image/*") },
                        onQuitarLogo = viewModel::quitarLogo,
                    )
                }
                item {
                    SeccionBoleta(
                        fechaFacturacionGlobal = uiState.fechaFacturacionGlobal,
                        formatoBoletaDefault = uiState.formatoBoletaDefault,
                        modoCaja = uiState.modoCaja,
                        onFechaChange = viewModel::onFechaFacturacionChange,
                        onFormatoChange = viewModel::onFormatoBoletaChange,
                        onModoCajaChange = viewModel::onModoCajaChange,
                    )
                }
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Button(onClick = viewModel::guardar, enabled = !uiState.guardando, modifier = Modifier.fillMaxWidth()) {
                            Text(if (uiState.guardando) "Guardando..." else "Guardar cambios")
                        }
                        if (uiState.mensaje != null) {
                            Text(uiState.mensaje ?: "", color = MaterialTheme.colorScheme.primary)
                        }
                        if (uiState.error != null) {
                            Text(uiState.error ?: "", color = MaterialTheme.colorScheme.error)
                        }
                    }
                }
                item {
                    SeccionCatalogos(
                        tipos = uiState.tiposServicio,
                        mostrarNuevo = uiState.mostrarNuevoTipo,
                        nuevoNombre = uiState.nuevoTipoNombre,
                        creando = uiState.creandoTipo,
                        onMostrarNuevo = viewModel::onMostrarNuevoTipo,
                        onNombreChange = viewModel::onNuevoTipoNombreChange,
                        onCrear = viewModel::crearTipoServicio,
                    )
                }
                item {
                    SeccionTiposServicioTecnico(
                        tipos = uiState.tiposServicioTecnico,
                        mostrarNuevo = uiState.mostrarNuevoTipoTecnico,
                        nombre = uiState.nuevoTipoTecnicoNombre,
                        campos = uiState.nuevoTipoTecnicoCampos,
                        creando = uiState.creandoTipoTecnico,
                        onMostrarNuevo = viewModel::onMostrarNuevoTipoTecnico,
                        onNombreChange = viewModel::onNuevoTipoTecnicoNombreChange,
                        onCamposChange = viewModel::onNuevoTipoTecnicoCamposChange,
                        onCrear = viewModel::crearTipoServicioTecnico,
                    )
                }
                item {
                    SeccionUsuarios(
                        usuarios = uiState.usuarios,
                        mostrarForm = uiState.mostrarFormUsuario,
                        nombre = uiState.nuevoNombre,
                        email = uiState.nuevoEmail,
                        password = uiState.nuevoPassword,
                        rol = uiState.nuevoRol,
                        creando = uiState.creandoUsuario,
                        error = uiState.errorUsuario,
                        onMostrarForm = viewModel::onMostrarFormUsuario,
                        onNombreChange = viewModel::onNuevoNombreChange,
                        onEmailChange = viewModel::onNuevoEmailChange,
                        onPasswordChange = viewModel::onNuevoPasswordChange,
                        onRolChange = viewModel::onNuevoRolChange,
                        onCrear = viewModel::crearUsuario,
                    )
                }
                item {
                    SeccionBackup(
                        descargando = uiState.descargandoBackup,
                        onDescargar = {
                            viewModel.descargarBackup { bytes ->
                                backupPendiente = bytes
                                val fecha = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                                crearArchivoBackup.launch("backup-cablera-$fecha.xlsx")
                            }
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun Tarjeta(titulo: String, content: @Composable () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(titulo, style = MaterialTheme.typography.titleMedium)
            content()
        }
    }
}

@Composable
private fun SeccionIdentidad(
    uiState: ConfiguracionUiState,
    logoUrl: String?,
    onNombreChange: (String) -> Unit,
    onRucChange: (String) -> Unit,
    onColorPrimarioChange: (String) -> Unit,
    onColorSecundarioChange: (String) -> Unit,
    onTelefonoChange: (String) -> Unit,
    onEmailChange: (String) -> Unit,
    onDireccionChange: (String) -> Unit,
    onCambiarLogo: () -> Unit,
    onQuitarLogo: () -> Unit,
) {
    Tarjeta(titulo = "Identidad de la empresa") {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer)
                    .clickable(enabled = !uiState.subiendoLogo, onClick = onCambiarLogo),
                contentAlignment = Alignment.Center,
            ) {
                if (uiState.subiendoLogo) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp))
                } else {
                    RemoteImage(
                        url = logoUrl,
                        contentDescription = "Logo",
                        modifier = Modifier.size(64.dp).clip(CircleShape),
                        placeholder = { Icon(Icons.Filled.Business, contentDescription = null) },
                    )
                }
            }
            Column {
                TextButton(onClick = onCambiarLogo, enabled = !uiState.subiendoLogo) { Text("Cambiar logo") }
                if (logoUrl != null) {
                    TextButton(onClick = onQuitarLogo, enabled = !uiState.subiendoLogo) { Text("Quitar logo") }
                }
            }
        }

        OutlinedTextField(
            value = uiState.nombreEmpresa,
            onValueChange = onNombreChange,
            label = { Text("Nombre de la empresa") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = uiState.ruc,
            onValueChange = onRucChange,
            label = { Text("RUC") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = uiState.telefonoContacto,
            onValueChange = onTelefonoChange,
            label = { Text("Teléfono") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = uiState.emailContacto,
            onValueChange = onEmailChange,
            label = { Text("Correo de contacto") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = uiState.direccionContacto,
            onValueChange = onDireccionChange,
            label = { Text("Dirección") },
            modifier = Modifier.fillMaxWidth(),
        )
        Text(
            "Estos datos aparecen en la boleta que se emite al registrar un pago.",
            style = MaterialTheme.typography.labelLarge,
        )

        Text("Colores de marca", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 6.dp))
        SelectorColor(etiqueta = "Primario", valorHex = uiState.colorPrimario, onValorChange = onColorPrimarioChange)
        SelectorColor(etiqueta = "Secundario", valorHex = uiState.colorSecundario, onValorChange = onColorSecundarioChange)
        Text(
            "Se aplican en toda la app y en la boleta al guardar.",
            style = MaterialTheme.typography.labelLarge,
        )
    }
}

private val PALETA_COLORES = listOf(
    "#1F3A63", "#16191D", "#8F2C22", "#7C5312", "#1F5C45",
    "#430F0F", "#0F3D91", "#5B2A86", "#0F5C4A", "#3A4149",
)

@Composable
private fun SelectorColor(etiqueta: String, valorHex: String, onValorChange: (String) -> Unit) {
    val colorValido = Regex("^#[0-9A-Fa-f]{6}$").matches(valorHex)
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(parseHexColor(valorHex, CableraPrimary))
                    .border(1.dp, MaterialTheme.colorScheme.outline, CircleShape),
            )
            OutlinedTextField(
                value = valorHex,
                onValueChange = onValorChange,
                label = { Text(etiqueta) },
                singleLine = true,
                isError = !colorValido,
                supportingText = if (!colorValido) { { Text("Formato #RRGGBB") } } else null,
                modifier = Modifier.weight(1f),
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            PALETA_COLORES.forEach { hex ->
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(parseHexColor(hex, CableraSecondary))
                        .clickable { onValorChange(hex) }
                        .border(
                            width = if (valorHex.equals(hex, ignoreCase = true)) 2.dp else 1.dp,
                            color = if (valorHex.equals(hex, ignoreCase = true)) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline,
                            shape = CircleShape,
                        ),
                )
            }
        }
    }
}

@Composable
private fun SeccionBoleta(
    fechaFacturacionGlobal: String,
    formatoBoletaDefault: String,
    modoCaja: String,
    onFechaChange: (String) -> Unit,
    onFormatoChange: (String) -> Unit,
    onModoCajaChange: (String) -> Unit,
) {
    Tarjeta(titulo = "Facturación y boleta") {
        var mostrarDias by remember { mutableStateOf(false) }
        Box {
            OutlinedTextField(
                value = fechaFacturacionGlobal,
                onValueChange = {},
                readOnly = true,
                label = { Text("Día de facturación global") },
                trailingIcon = { Icon(Icons.Filled.ArrowDropDown, contentDescription = null) },
                modifier = Modifier.fillMaxWidth().clickable { mostrarDias = true },
            )
            DropdownMenu(expanded = mostrarDias, onDismissRequest = { mostrarDias = false }) {
                (1..28).forEach { dia ->
                    DropdownMenuItem(text = { Text(dia.toString()) }, onClick = { onFechaChange(dia.toString()); mostrarDias = false })
                }
            }
        }
        Text("Formato de boleta por defecto", style = MaterialTheme.typography.labelLarge)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(FormatosBoleta.A4 to "Hoja A4", FormatosBoleta.TICKET to "Ticket 80mm").forEach { (valor, etiqueta) ->
                val seleccionado = formatoBoletaDefault == valor
                if (seleccionado) {
                    Button(onClick = { onFormatoChange(valor) }) { Text(etiqueta) }
                } else {
                    OutlinedButton(onClick = { onFormatoChange(valor) }) { Text(etiqueta) }
                }
            }
        }
        Text("Modo de caja", style = MaterialTheme.typography.labelLarge)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(ModosCaja.RESUMEN to "Resumen", ModosCaja.APERTURA_CIERRE to "Apertura/cierre").forEach { (valor, etiqueta) ->
                val seleccionado = modoCaja == valor
                if (seleccionado) {
                    Button(onClick = { onModoCajaChange(valor) }) { Text(etiqueta) }
                } else {
                    OutlinedButton(onClick = { onModoCajaChange(valor) }) { Text(etiqueta) }
                }
            }
        }
    }
}

@Composable
private fun SeccionUsuarios(
    usuarios: List<UsuarioListadoDto>,
    mostrarForm: Boolean,
    nombre: String,
    email: String,
    password: String,
    rol: String,
    creando: Boolean,
    error: String?,
    onMostrarForm: (Boolean) -> Unit,
    onNombreChange: (String) -> Unit,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onRolChange: (String) -> Unit,
    onCrear: () -> Unit,
) {
    Tarjeta(titulo = "Usuarios y accesos") {
        if (usuarios.isEmpty()) {
            EmptyState(mensaje = "Aún no hay cobradores registrados.", icon = Icons.Filled.Person)
        }
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            usuarios.forEach { usuario ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(8.dp))
                        .padding(10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column {
                        Text(usuario.nombre, style = MaterialTheme.typography.bodyLarge)
                        Text(usuario.email, style = MaterialTheme.typography.labelLarge)
                    }
                    EstadoChip(
                        texto = if (usuario.rol == Roles.GESTOR) "administrador" else usuario.rol,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }
        }

        if (mostrarForm) {
            OutlinedTextField(value = nombre, onValueChange = onNombreChange, label = { Text("Nombre") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(
                value = email,
                onValueChange = onEmailChange,
                label = { Text("Correo") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = password,
                onValueChange = onPasswordChange,
                label = { Text("Contraseña temporal") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(Roles.COBRADOR to "Cobrador", Roles.GESTOR to "Administrador").forEach { (valor, etiqueta) ->
                    if (rol == valor) {
                        Button(onClick = { onRolChange(valor) }) { Text(etiqueta) }
                    } else {
                        OutlinedButton(onClick = { onRolChange(valor) }) { Text(etiqueta) }
                    }
                }
            }
            if (error != null) {
                Text(error, color = MaterialTheme.colorScheme.error)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onCrear, enabled = !creando) { Text(if (creando) "Creando..." else "Crear usuario") }
                TextButton(onClick = { onMostrarForm(false) }) { Text("Cancelar") }
            }
        } else {
            OutlinedButton(onClick = { onMostrarForm(true) }, modifier = Modifier.fillMaxWidth()) {
                Text("+ Nuevo usuario")
            }
        }
    }
}

@Composable
private fun SeccionCatalogos(
    tipos: List<TipoServicioDto>,
    mostrarNuevo: Boolean,
    nuevoNombre: String,
    creando: Boolean,
    onMostrarNuevo: (Boolean) -> Unit,
    onNombreChange: (String) -> Unit,
    onCrear: () -> Unit,
) {
    Tarjeta(titulo = "Catálogos") {
        Text("Tipos de servicio", style = MaterialTheme.typography.labelLarge)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            tipos.forEach { tipo ->
                FilterChip(selected = false, onClick = {}, label = { Text(tipo.nombre) })
            }
        }
        if (mostrarNuevo) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = nuevoNombre,
                    onValueChange = onNombreChange,
                    label = { Text("Ej. internet") },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
                Button(onClick = onCrear, enabled = !creando) { Text(if (creando) "..." else "Agregar") }
                TextButton(onClick = { onMostrarNuevo(false) }) { Text("Cancelar") }
            }
        } else {
            OutlinedButton(onClick = { onMostrarNuevo(true) }, modifier = Modifier.fillMaxWidth()) {
                Text("+ Nuevo tipo de servicio")
            }
        }
        Text(
            "Las zonas/caseríos y las categorías de egreso se administran desde el sistema web.",
            style = MaterialTheme.typography.labelLarge,
        )
    }
}

@Composable
private fun SeccionTiposServicioTecnico(
    tipos: List<com.cablera.app.data.remote.dto.TipoServicioTecnicoDto>,
    mostrarNuevo: Boolean,
    nombre: String,
    campos: String,
    creando: Boolean,
    onMostrarNuevo: (Boolean) -> Unit,
    onNombreChange: (String) -> Unit,
    onCamposChange: (String) -> Unit,
    onCrear: () -> Unit,
) {
    Tarjeta(titulo = "Tipos de servicio técnico") {
        Text(
            "Cada tipo define qué campos propios se piden al crear un servicio técnico (instalación, reparación, etc.).",
            style = MaterialTheme.typography.bodyMedium,
        )
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            tipos.forEach { tipo ->
                Row(
                    modifier = Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(8.dp)).padding(10.dp),
                ) {
                    Column {
                        Text(tipo.nombre, style = MaterialTheme.typography.bodyLarge)
                        if (tipo.camposDefinicion.isNotEmpty()) {
                            Text(tipo.camposDefinicion.joinToString(", "), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
        if (mostrarNuevo) {
            OutlinedTextField(value = nombre, onValueChange = onNombreChange, label = { Text("Nombre del tipo") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(
                value = campos,
                onValueChange = onCamposChange,
                label = { Text("Campos propios (separados por coma)") },
                placeholder = { Text("Modelo de router, Número de serie") },
                modifier = Modifier.fillMaxWidth(),
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onCrear, enabled = !creando) { Text(if (creando) "..." else "Agregar") }
                TextButton(onClick = { onMostrarNuevo(false) }) { Text("Cancelar") }
            }
        } else {
            OutlinedButton(onClick = { onMostrarNuevo(true) }, modifier = Modifier.fillMaxWidth()) {
                Text("+ Nuevo tipo de servicio técnico")
            }
        }
    }
}

@Composable
private fun SeccionBackup(descargando: Boolean, onDescargar: () -> Unit) {
    Tarjeta(titulo = "Copia de seguridad") {
        Text(
            "Descarga un Excel con clientes, cargos mensuales, boletas, caja y gastos reportados.",
            style = MaterialTheme.typography.bodyMedium,
        )
        OutlinedButton(onClick = onDescargar, enabled = !descargando, modifier = Modifier.fillMaxWidth()) {
            Text(if (descargando) "Generando..." else "Descargar backup Excel")
        }
    }
}
