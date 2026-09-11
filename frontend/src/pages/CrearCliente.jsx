import ClienteForm from "../components/ClienteForm";
import { useParams } from "react-router-dom";

export default function CrearCliente() {
  const { clienteId } = useParams(); // 👈 era :id, ahora :clienteId
  const isEdit = Boolean(clienteId);

  return (
    <div className="flex flex-col items-center gap-4 py-2 sm:gap-6 sm:py-5">
      <h1 className="text-xl sm:text-2xl font-bold text-center">
        {isEdit ? "Editar Cliente" : "Crear Cliente"}
      </h1>
      <ClienteForm mode={isEdit ? "edit" : "create"} clienteId={clienteId} />
    </div>
  );
}
