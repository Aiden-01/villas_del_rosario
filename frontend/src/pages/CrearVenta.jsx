import { ArrowLeft } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import VentaForm from "../components/VentaForm";

export default function CrearVenta() {
  const { prestamoId, ventaId } = useParams();
  const [searchParams] = useSearchParams();
  const registroId = ventaId || prestamoId;
  const desdeMapa = !registroId && searchParams.has("loteId");

  return (
    <div className="flex flex-col items-center gap-4 py-2 sm:gap-6 sm:py-5">
      {desdeMapa && (
        <div className="w-full min-w-0 max-w-md">
          <Link
            to="/mapa"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold shadow-sm transition hover:opacity-80 sm:w-auto"
          >
            <ArrowLeft size={17} />
            Volver al mapa
          </Link>
        </div>
      )}
      <h1 className="text-xl sm:text-2xl font-bold text-center">
        {registroId ? "Editar Venta" : "Crear Venta"}
      </h1>
      <VentaForm mode={registroId ? "edit" : "create"} ventaId={registroId} />
    </div>
  );
}
