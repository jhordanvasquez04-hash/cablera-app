package com.cablera.app.ui.configuracion

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cablera.app.data.remote.dto.ConfiguracionDto
import com.cablera.app.data.remote.dto.CreateUsuarioRequest
import com.cablera.app.data.remote.dto.FormatosBoleta
import com.cablera.app.data.remote.dto.ModosCaja
import com.cablera.app.data.remote.dto.Roles
import com.cablera.app.data.remote.dto.TipoServicioDto
import com.cablera.app.data.remote.dto.TipoServicioTecnicoDto
import com.cablera.app.data.remote.dto.UpdateConfiguracionRequest
import com.cablera.app.data.remote.dto.UsuarioListadoDto
import com.cablera.app.data.repository.ConfiguracionRepository
import com.cablera.app.data.repository.ServiciosTecnicosRepository
import com.cablera.app.ui.common.UiState
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MultipartBody

data class ConfiguracionUiState(
    val configuracion: UiState<ConfiguracionDto> = UiState.Loading,
    val guardando: Boolean = false,
    val subiendoLogo: Boolean = false,
    val mensaje: String? = null,
    val error: String? = null,
    val nombreEmpresa: String = "",
    val ruc: String = "",
    val colorPrimario: String = "#1F3A63",
    val colorSecundario: String = "#16191D",
    val telefonoContacto: String = "",
    val emailContacto: String = "",
    val direccionContacto: String = "",
    val fechaFacturacionGlobal: String = "1",
    val formatoBoletaDefault: String = FormatosBoleta.A4,
    val modoCaja: String = ModosCaja.RESUMEN,
    val usuarios: List<UsuarioListadoDto> = emptyList(),
    val cargandoUsuarios: Boolean = true,
    val mostrarFormUsuario: Boolean = false,
    val nuevoNombre: String = "",
    val nuevoEmail: String = "",
    val nuevoPassword: String = "",
    val nuevoRol: String = Roles.COBRADOR,
    val creandoUsuario: Boolean = false,
    val errorUsuario: String? = null,
    /** id del usuario cuya desactivación/activación está en curso (para el spinner de esa fila). */
    val usuarioAccionandoId: String? = null,
    val tiposServicio: List<TipoServicioDto> = emptyList(),
    val mostrarNuevoTipo: Boolean = false,
    val nuevoTipoNombre: String = "",
    val creandoTipo: Boolean = false,
    val descargandoBackup: Boolean = false,
    val tiposServicioTecnico: List<TipoServicioTecnicoDto> = emptyList(),
    val mostrarNuevoTipoTecnico: Boolean = false,
    val nuevoTipoTecnicoNombre: String = "",
    val nuevoTipoTecnicoCampos: String = "",
    val creandoTipoTecnico: Boolean = false,
)

class ConfiguracionViewModel(
    private val configuracionRepository: ConfiguracionRepository,
    private val configuracionCompartida: MutableStateFlow<ConfiguracionDto?>,
    private val serviciosTecnicosRepository: ServiciosTecnicosRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ConfiguracionUiState())
    val uiState: StateFlow<ConfiguracionUiState> = _uiState.asStateFlow()

    init {
        cargarConfiguracion()
        cargarUsuarios()
        cargarTiposServicio()
        cargarTiposServicioTecnico()
    }

    fun cargarConfiguracion() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(configuracion = UiState.Loading)
            configuracionRepository.obtener()
                .onSuccess { config ->
                    configuracionCompartida.value = config
                    _uiState.value = _uiState.value.copy(
                        configuracion = UiState.Success(config),
                        nombreEmpresa = config.nombreEmpresa,
                        ruc = config.ruc ?: "",
                        colorPrimario = config.colorPrimario,
                        colorSecundario = config.colorSecundario,
                        telefonoContacto = config.telefonoContacto ?: "",
                        emailContacto = config.emailContacto ?: "",
                        direccionContacto = config.direccionContacto ?: "",
                        fechaFacturacionGlobal = config.fechaFacturacionGlobal.toString(),
                        formatoBoletaDefault = config.formatoBoletaDefault,
                        modoCaja = config.modoCaja,
                    )
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(configuracion = UiState.Error(e.message ?: "No se pudo cargar la configuración"))
                }
        }
    }

    fun onNombreEmpresaChange(valor: String) { _uiState.value = _uiState.value.copy(nombreEmpresa = valor, mensaje = null) }
    fun onRucChange(valor: String) { _uiState.value = _uiState.value.copy(ruc = valor, mensaje = null) }
    fun onColorPrimarioChange(valor: String) { _uiState.value = _uiState.value.copy(colorPrimario = valor, mensaje = null) }
    fun onColorSecundarioChange(valor: String) { _uiState.value = _uiState.value.copy(colorSecundario = valor, mensaje = null) }
    fun onTelefonoChange(valor: String) { _uiState.value = _uiState.value.copy(telefonoContacto = valor, mensaje = null) }
    fun onEmailChange(valor: String) { _uiState.value = _uiState.value.copy(emailContacto = valor, mensaje = null) }
    fun onDireccionChange(valor: String) { _uiState.value = _uiState.value.copy(direccionContacto = valor, mensaje = null) }
    fun onFechaFacturacionChange(valor: String) { _uiState.value = _uiState.value.copy(fechaFacturacionGlobal = valor, mensaje = null) }
    fun onFormatoBoletaChange(valor: String) { _uiState.value = _uiState.value.copy(formatoBoletaDefault = valor, mensaje = null) }
    fun onModoCajaChange(valor: String) { _uiState.value = _uiState.value.copy(modoCaja = valor, mensaje = null) }

    fun guardar() {
        val estado = _uiState.value
        val dia = estado.fechaFacturacionGlobal.toIntOrNull()?.coerceIn(1, 28)
        val colorHexRegex = Regex("^#[0-9A-Fa-f]{6}$")
        if (!colorHexRegex.matches(estado.colorPrimario) || !colorHexRegex.matches(estado.colorSecundario)) {
            _uiState.value = estado.copy(error = "Los colores deben tener el formato #RRGGBB")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(guardando = true, mensaje = null, error = null)
            configuracionRepository.actualizar(
                UpdateConfiguracionRequest(
                    nombreEmpresa = estado.nombreEmpresa.ifBlank { null },
                    ruc = estado.ruc.ifBlank { null },
                    colorPrimario = estado.colorPrimario,
                    colorSecundario = estado.colorSecundario,
                    telefonoContacto = estado.telefonoContacto.ifBlank { null },
                    emailContacto = estado.emailContacto.ifBlank { null },
                    direccionContacto = estado.direccionContacto.ifBlank { null },
                    fechaFacturacionGlobal = dia,
                    formatoBoletaDefault = estado.formatoBoletaDefault,
                    modoCaja = estado.modoCaja,
                ),
            )
                .onSuccess { config ->
                    configuracionCompartida.value = config
                    _uiState.value = _uiState.value.copy(guardando = false, configuracion = UiState.Success(config), mensaje = "Guardado correctamente")
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(guardando = false, error = e.message ?: "No se pudo guardar")
                }
        }
    }

    fun subirLogo(archivo: MultipartBody.Part) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(subiendoLogo = true, error = null)
            configuracionRepository.subirLogo(archivo)
                .onSuccess { config ->
                    configuracionCompartida.value = config
                    _uiState.value = _uiState.value.copy(subiendoLogo = false, configuracion = UiState.Success(config))
                }
                .onFailure { e -> _uiState.value = _uiState.value.copy(subiendoLogo = false, error = e.message ?: "No se pudo subir el logo") }
        }
    }

    fun quitarLogo() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(subiendoLogo = true, error = null)
            configuracionRepository.quitarLogo()
                .onSuccess { config ->
                    configuracionCompartida.value = config
                    _uiState.value = _uiState.value.copy(subiendoLogo = false, configuracion = UiState.Success(config))
                }
                .onFailure { e -> _uiState.value = _uiState.value.copy(subiendoLogo = false, error = e.message ?: "No se pudo quitar el logo") }
        }
    }

    fun cargarUsuarios() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(cargandoUsuarios = true)
            configuracionRepository.listarUsuarios()
                .onSuccess { usuarios -> _uiState.value = _uiState.value.copy(usuarios = usuarios, cargandoUsuarios = false) }
                .onFailure { _uiState.value = _uiState.value.copy(cargandoUsuarios = false) }
        }
    }

    fun onMostrarFormUsuario(mostrar: Boolean) {
        _uiState.value = _uiState.value.copy(
            mostrarFormUsuario = mostrar,
            nuevoNombre = "",
            nuevoEmail = "",
            nuevoPassword = "",
            nuevoRol = Roles.COBRADOR,
            errorUsuario = null,
        )
    }

    fun onNuevoNombreChange(valor: String) { _uiState.value = _uiState.value.copy(nuevoNombre = valor, errorUsuario = null) }
    fun onNuevoEmailChange(valor: String) { _uiState.value = _uiState.value.copy(nuevoEmail = valor, errorUsuario = null) }
    fun onNuevoPasswordChange(valor: String) { _uiState.value = _uiState.value.copy(nuevoPassword = valor, errorUsuario = null) }
    fun onNuevoRolChange(valor: String) { _uiState.value = _uiState.value.copy(nuevoRol = valor, errorUsuario = null) }

    fun crearUsuario() {
        val estado = _uiState.value
        if (estado.nuevoNombre.isBlank() || estado.nuevoEmail.isBlank() || estado.nuevoPassword.length < 6) {
            _uiState.value = estado.copy(errorUsuario = "Completa nombre, correo y una contraseña de al menos 6 caracteres")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(creandoUsuario = true, errorUsuario = null)
            configuracionRepository.crearUsuario(
                CreateUsuarioRequest(nombre = estado.nuevoNombre, email = estado.nuevoEmail, password = estado.nuevoPassword, rol = estado.nuevoRol),
            )
                .onSuccess {
                    _uiState.value = _uiState.value.copy(creandoUsuario = false, mostrarFormUsuario = false)
                    cargarUsuarios()
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(creandoUsuario = false, errorUsuario = e.message ?: "No se pudo crear el usuario")
                }
        }
    }

    /** "Eliminar" en la pantalla: desactiva la cuenta (bloquea su login, conserva su historial). */
    fun desactivarUsuario(id: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(usuarioAccionandoId = id, errorUsuario = null)
            configuracionRepository.desactivarUsuario(id)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(usuarioAccionandoId = null)
                    cargarUsuarios()
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(usuarioAccionandoId = null, errorUsuario = e.message ?: "No se pudo desactivar el usuario")
                }
        }
    }

    fun activarUsuario(id: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(usuarioAccionandoId = id, errorUsuario = null)
            configuracionRepository.activarUsuario(id)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(usuarioAccionandoId = null)
                    cargarUsuarios()
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(usuarioAccionandoId = null, errorUsuario = e.message ?: "No se pudo activar el usuario")
                }
        }
    }

    fun cargarTiposServicio() {
        viewModelScope.launch {
            configuracionRepository.listarTiposServicio()
                .onSuccess { tipos -> _uiState.value = _uiState.value.copy(tiposServicio = tipos) }
        }
    }

    fun onMostrarNuevoTipo(mostrar: Boolean) {
        _uiState.value = _uiState.value.copy(mostrarNuevoTipo = mostrar, nuevoTipoNombre = "")
    }

    fun onNuevoTipoNombreChange(valor: String) {
        _uiState.value = _uiState.value.copy(nuevoTipoNombre = valor)
    }

    fun crearTipoServicio() {
        val nombre = _uiState.value.nuevoTipoNombre.trim()
        if (nombre.isBlank()) return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(creandoTipo = true)
            configuracionRepository.crearTipoServicio(nombre)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(creandoTipo = false, mostrarNuevoTipo = false, nuevoTipoNombre = "")
                    cargarTiposServicio()
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(creandoTipo = false, error = e.message ?: "No se pudo crear el tipo de servicio")
                }
        }
    }

    fun cargarTiposServicioTecnico() {
        viewModelScope.launch {
            serviciosTecnicosRepository.listarTipos().onSuccess { tipos -> _uiState.value = _uiState.value.copy(tiposServicioTecnico = tipos) }
        }
    }

    fun onMostrarNuevoTipoTecnico(mostrar: Boolean) {
        _uiState.value = _uiState.value.copy(mostrarNuevoTipoTecnico = mostrar, nuevoTipoTecnicoNombre = "", nuevoTipoTecnicoCampos = "")
    }

    fun onNuevoTipoTecnicoNombreChange(valor: String) { _uiState.value = _uiState.value.copy(nuevoTipoTecnicoNombre = valor) }
    fun onNuevoTipoTecnicoCamposChange(valor: String) { _uiState.value = _uiState.value.copy(nuevoTipoTecnicoCampos = valor) }

    fun crearTipoServicioTecnico() {
        val estado = _uiState.value
        val nombre = estado.nuevoTipoTecnicoNombre.trim()
        if (nombre.isBlank()) return
        val campos = estado.nuevoTipoTecnicoCampos.split(",").map { it.trim() }.filter { it.isNotBlank() }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(creandoTipoTecnico = true)
            serviciosTecnicosRepository.crearTipo(nombre, campos)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(creandoTipoTecnico = false, mostrarNuevoTipoTecnico = false)
                    cargarTiposServicioTecnico()
                }
                .onFailure { e -> _uiState.value = _uiState.value.copy(creandoTipoTecnico = false, error = e.message ?: "No se pudo crear el tipo") }
        }
    }

    /** Descarga el backup a memoria y entrega los bytes a [onListo] (la UI se encarga de escribirlos, ya que
     * elegir dónde guardar el archivo requiere un Context/Activity que este ViewModel no debe conocer). */
    fun descargarBackup(onListo: (ByteArray) -> Unit) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(descargandoBackup = true, error = null)
            configuracionRepository.descargarBackup()
                .onSuccess { body ->
                    val bytes = withContext(Dispatchers.IO) { body.bytes() }
                    _uiState.value = _uiState.value.copy(descargandoBackup = false)
                    onListo(bytes)
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(descargandoBackup = false, error = e.message ?: "No se pudo generar el backup")
                }
        }
    }
}
