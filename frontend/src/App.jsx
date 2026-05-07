import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CrearUsuario from "./pages/CrearUsuario";
import CrearCliente from "./pages/CrearCliente";
import Clientes from "./pages/Clientes";
import Prestamos from "./pages/Prestamos";
import CrearPrestamo from "./pages/CrearPrestamo";
import GestionUsuarios from "./pages/GestionUsuarios";
import Reportes from "./pages/Reportes";
import Historial from "./pages/Historial";
import PagosAgenda from "./pages/PagosAgenda";

import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/clientes" element={<Clientes />} />
          <Route path="/clientes/crear" element={<CrearCliente />} />
          <Route path="/clientes/editar/:clienteId" element={<CrearCliente />} />

          <Route path="/ventas" element={<Prestamos />} />
          <Route path="/ventas/crear" element={<CrearPrestamo />} />
          <Route path="/ventas/editar/:ventaId" element={<CrearPrestamo />} />
          <Route path="/pagos" element={<PagosAgenda />} />
          <Route path="/prestamos" element={<Navigate to="/ventas" replace />} />
          <Route path="/prestamos/crear" element={<Navigate to="/ventas/crear" replace />} />
          <Route path="/prestamos/editar/:prestamoId" element={<CrearPrestamo />} />
        </Route>

        <Route
          element={
            <ProtectedRoute roles={["admin"]}>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/usuarios/crear" element={<CrearUsuario />} />
          <Route path="/usuarios" element={<GestionUsuarios />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="/admin" element={<h1>Panel Admin</h1>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
