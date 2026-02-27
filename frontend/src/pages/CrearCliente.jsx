import ClienteForm from "../components/ClienteForm";
import { useParams } from "react-router-dom";

export default function CrearCliente() {
  const { clienteId } = useParams(); // 👈 era :id, ahora :clienteId
  const isEdit = Boolean(clienteId);

  return (
    <div className="pt-16 flex flex-col items-center gap-6">
      <h1 className="text-2xl font-bold">
        {isEdit ? "Editar Cliente" : "Crear Cliente"}
      </h1>
      <ClienteForm mode={isEdit ? "edit" : "create"} clienteId={clienteId} />
    </div>
  );
}