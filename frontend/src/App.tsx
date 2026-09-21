import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { ConfigProvider } from "./config/ConfigContext";
import { ConfirmProvider } from "./components/ConfirmContext";
import { ToastProvider } from "./components/ToastContext";
import { LoginPage } from "./pages/LoginPage";
import { CobranzaPage } from "./pages/CobranzaPage";
import { RegistrarPagoPage } from "./pages/RegistrarPagoPage";
import { BoletasPage } from "./pages/BoletasPage";
import { BoletaDetallePage } from "./pages/BoletaDetallePage";
import { CajaPage } from "./pages/CajaPage";
import { ConfiguracionPage } from "./pages/ConfiguracionPage";
import { ZonasPage } from "./pages/ZonasPage";
import { ClientesPage } from "./pages/ClientesPage";
import { ClienteFichaPage } from "./pages/ClienteFichaPage";
import { ImportacionPage } from "./pages/ImportacionPage";
import { ServiciosPage } from "./pages/ServiciosPage";
import { ServicioNuevoPage } from "./pages/ServicioNuevoPage";
import { AdminEmpresasPage } from "./pages/admin/AdminEmpresasPage";

export function App() {
  return (
    <ConfigProvider>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              {/* Panel proveedor externo: fuera de cualquier empresa, no comparte shell ni
                  rutas con el negocio de un tenant. */}
              <Route element={<ProtectedRoute roles={["super_admin"]} />}>
                <Route path="/admin" element={<AdminEmpresasPage />} />
              </Route>

              <Route element={<ProtectedRoute roles={["gestor", "cobrador"]} />}>
                <Route path="/" element={<CobranzaPage />} />
                <Route path="/pagos/nuevo" element={<RegistrarPagoPage />} />
                <Route path="/boletas" element={<BoletasPage />} />
                <Route path="/boletas/:id" element={<BoletaDetallePage />} />
                <Route path="/clientes" element={<ClientesPage />} />
                <Route path="/clientes/:id" element={<ClienteFichaPage />} />
                <Route path="/servicios" element={<ServiciosPage />} />
                <Route path="/servicios/nuevo" element={<ServicioNuevoPage />} />

                {/* Solo gestor: el backend ya rechaza estas acciones a un cobrador,
                    pero además evitamos que la página cargue rota si navega por URL directa. */}
                <Route element={<ProtectedRoute roles={["gestor"]} />}>
                  <Route path="/caja" element={<CajaPage />} />
                  <Route path="/configuracion" element={<ConfiguracionPage />} />
                  <Route path="/zonas" element={<ZonasPage />} />
                  <Route path="/importar" element={<ImportacionPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </ConfigProvider>
  );
}
