package com.cablera.app.ui.navigation

import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavBackStackEntry
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.cablera.app.data.repository.AuthRepository
import com.cablera.app.data.repository.TecnicoAuthRepository
import com.cablera.app.data.session.Session
import com.cablera.app.data.session.TecnicoSession
import com.cablera.app.ui.boletas.BoletaDetalleScreen
import com.cablera.app.ui.boletas.BoletasListScreen
import com.cablera.app.ui.caja.CajaScreen
import com.cablera.app.ui.clientes.ClienteFichaScreen
import com.cablera.app.ui.clientes.ClienteNuevoScreen
import com.cablera.app.ui.clientes.ClientesListScreen
import com.cablera.app.ui.configuracion.ConfiguracionScreen
import com.cablera.app.ui.contratos.ContratoDetalleScreen
import com.cablera.app.ui.contratos.ContratoNuevoScreen
import com.cablera.app.ui.contratos.ContratosListScreen
import com.cablera.app.ui.home.HomeScreen
import com.cablera.app.ui.login.LoginScreen
import com.cablera.app.ui.ordenes.NuevaOrdenScreen
import com.cablera.app.ui.ordenes.OrdenServicioDetalleScreen
import com.cablera.app.ui.ordenes.OrdenesServicioListScreen
import com.cablera.app.ui.pagos.RegistrarPagoScreen
import com.cablera.app.ui.perfil.PerfilScreen
import com.cablera.app.ui.tecnico.LoginTecnicoScreen
import com.cablera.app.ui.tecnico.OrdenTecnicoDetalleScreen
import com.cablera.app.ui.tecnico.OrdenesTecnicoListScreen
import com.cablera.app.ui.tecnico.PerfilTecnicoScreen
import kotlinx.coroutines.launch

@Composable
fun CableraNavHost(
    authRepository: AuthRepository,
    tecnicoAuthRepository: TecnicoAuthRepository,
    startDestination: String,
    sesionInicial: Session?,
    sesionTecnicoInicial: TecnicoSession?,
    navController: NavHostController = rememberNavController(),
) {
    val scope = rememberCoroutineScope()
    val session by authRepository.session.collectAsStateWithLifecycle(initialValue = sesionInicial)
    val sesionTecnico by tecnicoAuthRepository.session.collectAsStateWithLifecycle(initialValue = sesionTecnicoInicial)

    // Dos árboles de sesión independientes (panel vs portal de campo, ver TecnicoSessionManager):
    // cada uno solo redirige las rutas de SU propio lado, para no interferir con el otro.
    LaunchedEffect(session) {
        val currentRoute = navController.currentDestination?.route
        val enRutaPanel = currentRoute != null && !Routes.esRutaTecnico(currentRoute) && currentRoute != Routes.LOGIN
        if (session == null && enRutaPanel) {
            navController.navigate(Routes.LOGIN) {
                popUpTo(0) { inclusive = true }
            }
        }
    }
    LaunchedEffect(sesionTecnico) {
        val currentRoute = navController.currentDestination?.route
        val enRutaTecnico = Routes.esRutaTecnico(currentRoute) && currentRoute != Routes.LOGIN_TECNICO
        if (sesionTecnico == null && enRutaTecnico) {
            navController.navigate(Routes.LOGIN_TECNICO) {
                popUpTo(0) { inclusive = true }
            }
        }
    }

    NavHost(
        navController = navController,
        startDestination = startDestination,
        enterTransition = { if (entreTabs()) fadeIn(tween(220)) else slideInHorizontally(tween(320, easing = FastOutSlowInEasing)) { it / 3 } + fadeIn(tween(320)) },
        exitTransition = { if (entreTabs()) fadeOut(tween(160)) else slideOutHorizontally(tween(320, easing = FastOutSlowInEasing)) { -it / 5 } + fadeOut(tween(260)) },
        popEnterTransition = { if (entreTabs()) fadeIn(tween(220)) else slideInHorizontally(tween(320, easing = FastOutSlowInEasing)) { -it / 5 } + fadeIn(tween(320)) },
        popExitTransition = { if (entreTabs()) fadeOut(tween(160)) else slideOutHorizontally(tween(320, easing = FastOutSlowInEasing)) { it / 3 } + fadeOut(tween(260)) },
    ) {
        composable(Routes.LOGIN) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                },
                onNavigateToLoginTecnico = { navController.navigate(Routes.LOGIN_TECNICO) },
            )
        }
        composable(Routes.LOGIN_TECNICO) {
            LoginTecnicoScreen(
                onLoginSuccess = {
                    navController.navigate(Routes.ORDENES_TECNICO) {
                        popUpTo(Routes.LOGIN_TECNICO) { inclusive = true }
                    }
                },
                onVolverAPanel = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(Routes.LOGIN_TECNICO) { inclusive = true }
                    }
                },
            )
        }
        composable(Routes.ORDENES_TECNICO) {
            OrdenesTecnicoListScreen(navController = navController)
        }
        composable(Routes.PERFIL_TECNICO) {
            PerfilTecnicoScreen(navController = navController)
        }
        composable(
            route = Routes.ORDEN_TECNICO_DETALLE,
            arguments = listOf(navArgument("ordenId") { type = NavType.StringType }),
        ) { backStackEntry ->
            val ordenId = checkNotNull(backStackEntry.arguments?.getString("ordenId"))
            OrdenTecnicoDetalleScreen(navController = navController, ordenId = ordenId)
        }
        composable(Routes.HOME) {
            HomeScreen(navController = navController)
        }
        composable(
            route = Routes.NUEVA_ORDEN,
            arguments = listOf(
                navArgument("contratoId") { type = NavType.StringType; nullable = true; defaultValue = null },
                navArgument("clienteId") { type = NavType.StringType; nullable = true; defaultValue = null },
            ),
        ) { backStackEntry ->
            NuevaOrdenScreen(
                navController = navController,
                contratoIdFijo = backStackEntry.arguments?.getString("contratoId"),
                clienteIdFijo = backStackEntry.arguments?.getString("clienteId"),
            )
        }
        composable(Routes.ORDENES_SERVICIO) {
            OrdenesServicioListScreen(navController = navController, onBack = { navController.popBackStack() })
        }
        composable(
            route = Routes.ORDEN_SERVICIO_DETALLE,
            arguments = listOf(navArgument("ordenId") { type = NavType.StringType }),
        ) { backStackEntry ->
            val ordenId = checkNotNull(backStackEntry.arguments?.getString("ordenId"))
            OrdenServicioDetalleScreen(navController = navController, ordenId = ordenId)
        }
        composable(Routes.CONTRATOS) {
            ContratosListScreen(navController = navController)
        }
        composable(
            route = Routes.CONTRATO_DETALLE,
            arguments = listOf(navArgument("contratoId") { type = NavType.StringType }),
        ) { backStackEntry ->
            val contratoId = checkNotNull(backStackEntry.arguments?.getString("contratoId"))
            ContratoDetalleScreen(navController = navController, contratoId = contratoId)
        }
        composable(Routes.CONTRATO_NUEVO) {
            ContratoNuevoScreen(navController = navController)
        }
        composable(
            route = Routes.CONTRATO_NUEVO_PARA_CLIENTE,
            arguments = listOf(navArgument("clienteId") { type = NavType.StringType }),
        ) { backStackEntry ->
            val clienteId = checkNotNull(backStackEntry.arguments?.getString("clienteId"))
            ContratoNuevoScreen(navController = navController, clienteIdFijo = clienteId)
        }
        composable(Routes.CLIENTES) {
            ClientesListScreen(navController = navController)
        }
        composable(Routes.CLIENTE_NUEVO) {
            ClienteNuevoScreen(navController = navController)
        }
        composable(Routes.BOLETAS) {
            BoletasListScreen(
                navController = navController,
                onBack = { navController.popBackStack() },
                onVerBoleta = { boletaId -> navController.navigate(Routes.boletaDetalle(boletaId)) },
            )
        }
        composable(Routes.CAJA) {
            CajaScreen(navController = navController)
        }
        composable(Routes.CONFIGURACION) {
            ConfiguracionScreen(navController = navController)
        }
        composable(Routes.PERFIL) {
            PerfilScreen(navController = navController)
        }
        composable(
            route = Routes.CLIENTE_FICHA,
            arguments = listOf(navArgument("clienteId") { type = NavType.StringType }),
        ) { backStackEntry ->
            val clienteId = checkNotNull(backStackEntry.arguments?.getString("clienteId"))
            ClienteFichaScreen(navController = navController, clienteId = clienteId)
        }
        composable(
            route = Routes.REGISTRAR_PAGO,
            arguments = listOf(
                navArgument("clienteId") { type = NavType.StringType },
                navArgument("contratoId") { type = NavType.StringType; nullable = true; defaultValue = null },
            ),
        ) { backStackEntry ->
            val clienteId = checkNotNull(backStackEntry.arguments?.getString("clienteId"))
            val contratoId = backStackEntry.arguments?.getString("contratoId")
            RegistrarPagoScreen(
                navController = navController,
                clienteId = clienteId,
                contratoIdFiltro = contratoId,
                onPagoRegistrado = { boletaId ->
                    navController.navigate(Routes.boletaDetalle(boletaId)) {
                        popUpTo(Routes.REGISTRAR_PAGO) { inclusive = true }
                    }
                },
            )
        }
        composable(
            route = Routes.BOLETA_DETALLE,
            arguments = listOf(navArgument("boletaId") { type = NavType.StringType }),
        ) { backStackEntry ->
            val boletaId = checkNotNull(backStackEntry.arguments?.getString("boletaId"))
            BoletaDetalleScreen(navController = navController, boletaId = boletaId)
        }
    }
}

// Pantallas de la barra inferior: entre ellas se cambia con un fundido (como pestañas); todo lo
// demás (detalles, formularios, login) entra deslizándose desde la derecha.
private val RUTAS_TABS = setOf(
    Routes.HOME, Routes.CLIENTES, Routes.CONTRATOS, Routes.CAJA, Routes.CONFIGURACION, Routes.PERFIL,
    Routes.ORDENES_TECNICO, Routes.PERFIL_TECNICO,
)

private fun AnimatedContentTransitionScope<NavBackStackEntry>.entreTabs(): Boolean =
    initialState.destination.route in RUTAS_TABS && targetState.destination.route in RUTAS_TABS
