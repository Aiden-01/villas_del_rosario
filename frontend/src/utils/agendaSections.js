const claveItem = (item) => `${item.prestamoId}:${item.proximaCuota}`;

export function construirSeccionesAgenda(datos) {
  if (!datos) return [];

  const vistos = new Set();
  const unicos = (items = []) =>
    items.filter((item) => {
      const clave = claveItem(item);
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    });

  const secciones = [
    {
      clave: "atrasados",
      titulo: "Atrasados acumulados",
      descripcion: "Cobros vencidos, incluidos los de meses anteriores",
      items: unicos(datos.atrasados),
    },
    {
      clave: "hoy",
      titulo: "Cobros de hoy",
      descripcion: "Cobros cuya fecha efectiva es hoy",
      fecha: datos.hoy,
      items: unicos(datos.hoyItems),
    },
    ...(datos.grupos || []).map((grupo) => {
      const items = unicos(grupo.items);
      return {
        clave: `proximos-${grupo.fecha}`,
        titulo: `Próximos · ${grupo.fecha}`,
        descripcion: `${items.length} ${items.length === 1 ? "cliente pendiente" : "clientes pendientes"}`,
        fecha: grupo.fecha,
        items,
      };
    }),
  ];

  return secciones.filter((seccion) => seccion.items.length > 0);
}
