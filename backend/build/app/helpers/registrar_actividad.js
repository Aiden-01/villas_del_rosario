import Actividad from '#models/actividad';
export async function registrarActividad({ usuarioId, tipo, entidad, entidadId, descripcion, detalle, trx, }) {
    try {
        await Actividad.create({
            usuarioId,
            tipo,
            entidad,
            entidadId: entidadId || null,
            descripcion,
            detalle: detalle || null,
        }, trx ? { client: trx } : {});
    }
    catch (error) {
        if (trx)
            throw error;
        console.error('Error registrando actividad:', error);
    }
}
//# sourceMappingURL=registrar_actividad.js.map