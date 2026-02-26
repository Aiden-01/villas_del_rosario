import Sidebar from "../components/Sidebar";
import ClienteForm from "../components/ClienteForm";
import { useState } from "react";
import { useParams } from "react-router-dom";

export default function CrearCliente() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [menuOpen, setMenuOpen] = useState(false);

  const { id } = useParams();
  const isEdit = Boolean(id);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Sidebar menuOpen={menuOpen} setMenuOpen={setMenuOpen} role={user?.role} />

      <div className="p-8 pt-24 flex flex-col items-center gap-6">
        
        {/* 🔥 TÍTULO DINÁMICO */}
        <h1 className="text-2xl font-bold">
          {isEdit ? "Editar Cliente" : "Crear Cliente"}
        </h1>

        {/* 🔥 PASAMOS EL ID Y EL MODE */}
        <ClienteForm mode={isEdit ? "edit" : "create"} clienteId={id} />
      </div>
    </div>
  );
}