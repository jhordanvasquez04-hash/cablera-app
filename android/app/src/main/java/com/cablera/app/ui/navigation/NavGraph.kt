package com.cablera.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.cablera.app.data.repository.AuthRepository
import com.cablera.app.data.session.Session
import com.cablera.app.ui.boletas.BoletaDetalleScreen
import com.cablera.app.ui.boletas.BoletasListScreen
import com.cablera.app.ui.caja.CajaScreen
import com.cablera.app.ui.clientes.ClienteFichaScreen
import com.cablera.app.ui.clientes.ClienteNuevoScreen
import com.cablera.app.ui.clientes.ClientesListScreen
import com.cablera.app.ui.configuracion.ConfiguracionScreen
import com.cablera.app.ui.gastos.ReportarGastoScreen
import com.cablera.app.ui.home.HomeScreen
import com.cablera.app.ui.login.LoginScreen
import com.cablera.app.ui.pagos.RegistrarPagoScreen
import com.cablera.app.ui.perfil.PerfilScreen
import com.cablera.app.ui.servicios.ServicioNuevoScreen
import com.cablera.app.ui.servicios.ServiciosListScreen
import kotlinx.coroutines.launch

@Composable
fun CableraNavHost(
    authRepository: AuthRepository,
    startDestination: String,
    sesionInicial: Session?,
    navController: NavHostController = rememberNavController(),
) {
    val scope = rememberCoroutineScope()
    val session by authRepository.session.collectAsStateWithLifecycle(initialValue = sesionInicial)

    LaunchedEffect(session) {
        val currentRoute = navController.currentDestination?.route
        if (session == null && currentRoute != null && currentRoute != Routes.LOGIN) {
            navController.navigate(Routes.LOGIN) {
                popUpTo(0) { inclusive = true }
            }
        }
    }

    NavHost(navController = navController, startDestination = startDestination) {
        composable(Routes.LOGIN) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                },
            )
        }
        composable(Routes.HOME) {
            HomeScreen(
                navController = navController,
                onLogout = { scope.launch { authRepository.logout() } },
            )
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
        composable(Routes.REPORTAR_GASTO) {
            ReportarGastoScreen(navController = navController)
        }
        composable(Routes.CONFIGURACION) {
            ConfiguracionScreen(navController = navController)
        }
        composable(Routes.PERFIL) {
            PerfilScreen(navController = navController)
        }
        composable(Routes.SERVICIOS) {
            ServiciosListScreen(navController = navController)
        }
        composable(Routes.SERVICIO_NUEVO) {
            ServicioNuevoScreen(navController = navController)
        }
        composable(
            route = Routes.SERVICIO_NUEVO_PARA_CLIENTE,
            arguments = listOf(navArgument("clienteId") { type = NavType.StringType }),
        ) { backStackEntry ->
            val clienteId = checkNotNull(backStackEntry.arguments?.getString("clienteId"))
            ServicioNuevoScreen(navController = navController, clienteIdFijo = clienteId)
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
            arguments = listOf(navArgument("clienteId") { type = NavType.StringType }),
        ) { backStackEntry ->
            val clienteId = checkNotNull(backStackEntry.arguments?.getString("clienteId"))
            RegistrarPagoScreen(
                navController = navController,
                clienteId = clienteId,
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
