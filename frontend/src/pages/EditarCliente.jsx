import Sidebar from "../components/Sidebar";
import ClienteForm from "../components/ClienteForm";
import { useState } from "react";

export default function EditarCliente() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Sidebar menuOpen={menuOpen} setMenuOpen={setMenuOpen} role={user?.role} />
      <div className="p-8 pt-24 flex justify-center">
        <ClienteForm mode="edit" />
      </div>
    </div>
  );
}