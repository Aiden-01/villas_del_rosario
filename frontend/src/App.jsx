import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CrearUsuario from "./pages/CrearUsuario";
import CrearCliente from "./pages/CrearCliente";
import Clientes from "./pages/Clientes";

import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ================= LOGIN ================= */}
        <Route path="/" element={<Login />} />

        {/* ================= RUTAS PROTEGIDAS GENERALES ================= */}
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
          <Route path="/clientes/editar/:id" element={<CrearCliente />} />
        </Route>

        {/* ================= RUTAS SOLO ADMIN ================= */}
        <Route
          element={
            <ProtectedRoute roles={["admin"]}>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/usuarios/crear" element={<CrearUsuario />} />
          <Route path="/admin" element={<h1>Panel Admin</h1>} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;