import { useRef, useState } from "react";

/**
 * useDragSort — drag & drop con soporte real para iOS
 *
 * Funciona con:
 *  - Mouse (desktop)
 *  - Touch Android
 *  - Touch iOS (Safari) — usa touchmove con coordenadas reales
 *
 * Uso:
 *   const { dragHandlers, dragOverIndex, isDragging } = useDragSort({
 *     items,
 *     onReorder: (newItems) => setItems(newItems),
 *   });
 *
 *   En cada item del listado:
 *   <div {...dragHandlers(index)} ...>
 */
export function useDragSort({ items, onReorder }) {
  const dragIndex    = useRef(null);   // índice que se está arrastrando
  const [dragOver, setDragOver] = useState(null); // índice sobre el que se pasa
  const [dragging, setDragging] = useState(false);

  // ── Utilidad: reordenar array ────────────────────────────────────────────────
  const reorder = (from, to) => {
    if (from === to || from === null || to === null) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
  };

  // ── Encontrar índice a partir de coordenadas de pantalla (para iOS) ─────────
  const getIndexFromPoint = (x, y, containerSelector) => {
    // Busca todos los elementos con data-drag-index dentro del contenedor
    const els = document.querySelectorAll(`[data-drag-index]`);
    for (const el of els) {
      const rect = el.getBoundingClientRect();
      if (
        x >= rect.left && x <= rect.right &&
        y >= rect.top  && y <= rect.bottom
      ) {
        return Number(el.getAttribute("data-drag-index"));
      }
    }
    return null;
  };

  // ── Handlers de mouse (desktop) ─────────────────────────────────────────────
  const onMouseDragStart = (index) => (e) => {
    dragIndex.current = index;
    setDragging(true);
    e.dataTransfer.effectAllowed = "move";
  };

  const onMouseDragOver = (index) => (e) => {
    e.preventDefault();
    setDragOver(index);
  };

  const onMouseDrop = (index) => (e) => {
    e.preventDefault();
    reorder(dragIndex.current, index);
    dragIndex.current = null;
    setDragOver(null);
    setDragging(false);
  };

  const onMouseDragEnd = () => {
    dragIndex.current = null;
    setDragOver(null);
    setDragging(false);
  };

  // ── Handlers de touch (iOS + Android) ───────────────────────────────────────
  const onTouchStart = (index) => (e) => {
    dragIndex.current = index;
    setDragging(true);
    // No preventDefault aquí para no bloquear el scroll inicial
  };

  const onTouchMove = (e) => {
    // preventDefault aquí sí — evita que la página haga scroll mientras arrastra
    e.preventDefault();
    const touch = e.touches[0];
    const over  = getIndexFromPoint(touch.clientX, touch.clientY);
    if (over !== null) setDragOver(over);
  };

  const onTouchEnd = (e) => {
    const touch = e.changedTouches[0];
    const dropIndex = getIndexFromPoint(touch.clientX, touch.clientY);
    reorder(dragIndex.current, dropIndex ?? dragIndex.current);
    dragIndex.current = null;
    setDragOver(null);
    setDragging(false);
  };

  // ── Función que retorna todos los props para un item ─────────────────────────
  const dragHandlers = (index) => ({
    "data-drag-index": index,          // selector que usa getIndexFromPoint
    draggable: true,

    // Mouse
    onDragStart: onMouseDragStart(index),
    onDragOver:  onMouseDragOver(index),
    onDrop:      onMouseDrop(index),
    onDragEnd:   onMouseDragEnd,

    // Touch (iOS + Android)
    onTouchStart: onTouchStart(index),
    onTouchMove:  onTouchMove,         // mismo handler para todos
    onTouchEnd:   onTouchEnd,

    // Estilo visual mientras se arrastra
    style: {
      opacity:   dragIndex.current === index ? 0.4 : 1,
      transform: dragOver === index && dragIndex.current !== index
        ? "scale(1.02)"
        : "scale(1)",
      transition: "opacity 0.15s, transform 0.15s",
      cursor: "grab",
      touchAction: "none",             // clave en iOS: desactiva scroll nativo en el elemento
    },
  });

  return {
    dragHandlers,
    dragOverIndex: dragOver,
    isDragging:    dragging,
  };
}