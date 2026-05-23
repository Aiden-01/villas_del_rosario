import Actividad from '#models/actividad';
export async function registrarActividad({ usuarioId, tipo, entidad, entidadId, descripcion, detalle, }) {
    try {
        await Actividad.create({
            usuarioId,
            tipo,
            entidad,
            entidadId: entidadId || null,
            descripcion,
            detalle: detalle || null,
        });
    }
    catch (error) {
        console.error('Error registrando actividad:', error);
    }
}
//# sourceMappingURL=registrar_actividad.js.map