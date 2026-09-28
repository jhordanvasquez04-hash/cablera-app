package com.cablera.app.ui.contratos

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.cablera.app.LocalAppContainer
import com.cablera.app.data.remote.dto.ContratoDto
import com.cablera.app.ui.common.AppHeader
import com.cablera.app.ui.common.EstadoChip
import com.cablera.app.ui.common.LambdaViewModelFactory
import com.cablera.app.ui.common.StateContent
import com.cablera.app.ui.common.coloresEstadoOrden
import com.cablera.app.ui.navigation.Routes

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContratoDetalleScreen(
    navController: NavHostController,
    contratoId: String,
    viewModel: ContratoDetalleViewModel = run {
        val container = LocalAppContainer.current
        viewModel(factory = LambdaViewModelFactory { ContratoDetalleViewModel(contratoId, container.contratosRepository) })
    },
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(topBar = { AppHeader(titulo = "Contrato", onBack = { navController.popBackStack() }) }) { padding ->
        StateContent(state = uiState, modifier = Modifier.padding(padding), onRetry = viewModel::cargar) { contrato ->
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                CabeceraContrato(contrato)
                FichaTecnica(contrato)
                OutlinedButton(onClick = { navController.navigate(Routes.nuevaOrden(contrato.id)) }, modifier = Modifier.fillMaxWidth()) {
                    Text("Nuevo servicio técnico")
                }
            }
        }
    }
}

@Composable
private fun CabeceraContrato(contrato: ContratoDto) {
    Card {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(contrato.clienteNombre, style = MaterialTheme.typography.titleLarge)
            EstadoChip(texto = contrato.estado, colores = coloresEstadoOrden(if (contrato.estado == "activo") "completada" else contrato.estado))
            Text("Contrato ${contrato.numero}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(contrato.tipoServicio.replaceFirstChar(Char::uppercase), style = MaterialTheme.typography.bodyMedium)
            contrato.clienteTelefono?.let { Text("Tel: $it", style = MaterialTheme.typography.bodySmall) }
            if (!contrato.motivoBaja.isNullOrBlank()) {
                Text("Motivo de baja: ${contrato.motivoBaja}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
            }
        }
    }
}

@Composable
private fun FichaTecnica(contrato: ContratoDto) {
    Card {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("Ficha técnica", style = MaterialTheme.typography.labelLarge)
            if (!contrato.direccion.isNullOrBlank()) Text(contrato.direccion, style = MaterialTheme.typography.bodySmall)
            if (!contrato.referencia.isNullOrBlank()) Text("Ref: ${contrato.referencia}", style = MaterialTheme.typography.bodySmall)
            if (!contrato.sector.isNullOrBlank()) Text("Sector: ${contrato.sector}", style = MaterialTheme.typography.bodySmall)

            if (!contrato.ipWan.isNullOrBlank() || !contrato.pppoeUsuario.isNullOrBlank()) {
                HorizontalDivider(modifier = Modifier.padding(vertical = 6.dp))
                if (!contrato.ipWan.isNullOrBlank()) Text("IP WAN: ${contrato.ipWan}", style = MaterialTheme.typography.bodySmall)
                if (!contrato.pppoeUsuario.isNullOrBlank()) Text("Usuario PPPoE: ${contrato.pppoeUsuario}", style = MaterialTheme.typography.bodySmall)
                if (!contrato.precinto.isNullOrBlank()) Text("Precinto: ${contrato.precinto}", style = MaterialTheme.typography.bodySmall)
            }

            if (contrato.puntoRed != null || contrato.tecnicoInstalador != null || contrato.equipoProducto != null) {
                HorizontalDivider(modifier = Modifier.padding(vertical = 6.dp))
                contrato.puntoRed?.let { Text("Punto de red: ${it.codigo} (${it.tipo})", style = MaterialTheme.typography.bodySmall) }
                contrato.tecnicoInstalador?.let { Text("Instalado por: ${it.nombre} ${it.apellido}", style = MaterialTheme.typography.bodySmall) }
                contrato.equipoProducto?.let { Text("Equipo: ${it.nombre}" + (contrato.equipoSerie?.let { serie -> " (serie $serie)" } ?: ""), style = MaterialTheme.typography.bodySmall) }
            }
        }
    }
}
