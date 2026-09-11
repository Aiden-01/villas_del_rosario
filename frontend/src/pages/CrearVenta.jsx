import { useParams } from "react-router-dom";
import VentaForm from "../components/VentaForm";

export default function CrearVenta() {
  const { prestamoId, ventaId } = useParams();
  const registroId = ventaId || prestamoId;

  return (
    <div className="flex flex-col items-center gap-4 py-2 sm:gap-6 sm:py-5">
      <h1 className="text-xl sm:text-2xl font-bold text-center">
        {registroId ? "Editar Venta" : "Crear Venta"}
      </h1>
      <VentaForm mode={registroId ? "edit" : "create"} ventaId={registroId} />
    </div>
  );
}
