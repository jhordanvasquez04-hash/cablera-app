package com.cablera.app.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.RequestQuote
import androidx.compose.material.icons.filled.Savings
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.compose.currentBackStackEntryAsState
import com.cablera.app.LocalAppContainer
import com.cablera.app.data.remote.dto.Roles

private data class TabItem(val route: String, val label: String, val icon: ImageVector)

private val tabsComunes = listOf(
    TabItem(Routes.HOME, "Cobranza", Icons.Filled.RequestQuote),
    TabItem(Routes.CLIENTES, "Clientes", Icons.Filled.People),
    TabItem(Routes.SERVICIOS, "Servicios", Icons.Filled.Build),
)
private val tabsAdmin = tabsComunes + listOf(
    TabItem(Routes.CAJA, "Caja", Icons.Filled.Savings),
    TabItem(Routes.CONFIGURACION, "Ajustes", Icons.Filled.Settings),
)
private val tabsCobrador = tabsComunes + TabItem(Routes.PERFIL, "Perfil", Icons.Filled.AccountCircle)

@Composable
fun CableraBottomBar(navController: NavHostController) {
    val container = LocalAppContainer.current
    val session by container.authRepository.session.collectAsStateWithLifecycle(initialValue = null)
    val tabs = if (session?.usuario?.rol == Roles.GESTOR) tabsAdmin else tabsCobrador

    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    NavigationBar {
        tabs.forEach { tab ->
            NavigationBarItem(
                selected = currentRoute == tab.route,
                onClick = {
                    if (currentRoute != tab.route) {
                        navController.navigate(tab.route) {
                            popUpTo(Routes.HOME) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                },
                icon = { Icon(tab.icon, contentDescription = tab.label) },
                label = { Text(tab.label) },
            )
        }
    }
}
