import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CrearUsuario from "./pages/CrearUsuario";
import ProtectedRoute from "./components/ProtectedRoute";
import CrearCliente from "./pages/CrearCliente";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* LOGIN */}
        <Route path="/" element={<Login />} />

        {/* DASHBOARD - cualquier usuario autenticado */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
          {/* CREAR CLIENTE - cualquier usuario autenticado */}
        <Route
          path="/clientes/crear"
          element={
            <ProtectedRoute>
              <CrearCliente />
            </ProtectedRoute>
          }
        />

        {/* SOLO ADMIN */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin"]}>
              <h1>Panel Admin</h1>
            </ProtectedRoute>
          }
        />

        {/* CREAR USUARIO - SOLO ADMIN */}
        <Route
          path="/usuarios/crear"
          element={
            <ProtectedRoute roles={["admin"]}>
              <CrearUsuario />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
