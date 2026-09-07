import test from "node:test";
import assert from "node:assert/strict";
import { construirSeccionesAgenda } from "./agendaSections.js";

test("muestra atrasados, hoy y proximos sin duplicar cobros", () => {
  const atrasado = { prestamoId: 1, proximaCuota: 2 };
  const hoy = { prestamoId: 2, proximaCuota: 1 };
  const proximo = { prestamoId: 3, proximaCuota: 4 };
  const secciones = construirSeccionesAgenda({
    hoy: "2026-09-06",
    atrasados: [atrasado],
    hoyItems: [hoy, atrasado],
    grupos: [{ fecha: "2026-09-10", total: 2, items: [proximo, hoy] }],
  });

  assert.deepEqual(secciones.map((seccion) => seccion.clave), [
    "atrasados",
    "hoy",
    "proximos-2026-09-10",
  ]);
  assert.deepEqual(secciones.flatMap((seccion) => seccion.items), [atrasado, hoy, proximo]);
});
