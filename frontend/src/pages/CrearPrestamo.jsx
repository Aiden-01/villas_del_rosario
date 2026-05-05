import { useParams } from "react-router-dom";
import PrestamoForm from "../components/PrestamoForm";

export default function CrearPrestamo() {
  const { prestamoId, ventaId } = useParams();
  const registroId = ventaId || prestamoId;

  return (
    <div className="pt-16 flex flex-col items-center gap-6">
      <h1 className="text-2xl font-bold">
        {registroId ? "Editar Venta" : "Crear Venta"}
      </h1>
      <PrestamoForm mode={registroId ? "edit" : "create"} prestamoId={registroId} />
    </div>
  );
}
