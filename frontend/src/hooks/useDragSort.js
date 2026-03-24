import { useRef, useState } from "react";

export function useDragSort({ items, onReorder }) {
  const dragIndex = useRef(null);
  const [dragOver, setDragOver] = useState(null);
  const [dragging, setDragging] = useState(false);

  const reorder = (from, to) => {
    if (from === to || from === null || to === null) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
  };

  const getIndexFromPoint = (x, y) => {
    const els = document.querySelectorAll(`[data-drag-index]`);
    for (const el of els) {
      const rect = el.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return Number(el.getAttribute("data-drag-index"));
      }
    }
    return null;
  };

  // ── Handlers para el CONTENEDOR (card completo) ──────────────────────────────
  // Solo recibe dragOver y drop — NO bloquea scroll
  const containerHandlers = (index) => ({
    "data-drag-index": index,
    onDragOver: (e) => { e.preventDefault(); setDragOver(index); },
    onDrop: (e) => {
      e.preventDefault();
      reorder(dragIndex.current, index);
      dragIndex.current = null;
      setDragOver(null);
      setDragging(false);
    },
    style: {
      opacity: dragIndex.current === index ? 0.4 : 1,
      transform: dragOver === index && dragIndex.current !== index ? "scale(1.02)" : "scale(1)",
      transition: "opacity 0.15s, transform 0.15s",
      // ✅ SIN touchAction: "none" aquí — permite scroll normal
    },
  });

  // ── Handlers para el HANDLE (solo el ícono GripVertical) ─────────────────────
  // Aquí sí va draggable, touch events y touchAction: none
  const handleHandlers = (index) => ({
    draggable: true,
    onDragStart: (e) => {
      dragIndex.current = index;
      setDragging(true);
      e.dataTransfer.effectAllowed = "move";
      // Necesario para que el drag funcione desde el handle hacia el container
      e.stopPropagation();
    },
    onDragEnd: () => {
      dragIndex.current = null;
      setDragOver(null);
      setDragging(false);
    },
    onTouchStart: (e) => {
      dragIndex.current = index;
      setDragging(true);
      // ✅ No stopPropagation aquí — dejar que el card lo maneje si hace falta
    },
    onTouchMove: (e) => {
      e.preventDefault(); // ✅ Solo bloquea scroll cuando toca el handle
      const touch = e.touches[0];
      const over = getIndexFromPoint(touch.clientX, touch.clientY);
      if (over !== null) setDragOver(over);
    },
    onTouchEnd: (e) => {
      const touch = e.changedTouches[0];
      const dropIndex = getIndexFromPoint(touch.clientX, touch.clientY);
      reorder(dragIndex.current, dropIndex ?? dragIndex.current);
      dragIndex.current = null;
      setDragOver(null);
      setDragging(false);
    },
    style: {
      touchAction: "none", // ✅ Solo aquí — solo el handle bloquea scroll
      cursor: "grab",
    },
  });

  // ── Mantener dragHandlers por compatibilidad con código existente ─────────────
  const dragHandlers = (index) => ({
    ...containerHandlers(index),
    ...handleHandlers(index),
    draggable: true,
  });

  return {
    dragHandlers,
    containerHandlers,
    handleHandlers,
    dragOverIndex: dragOver,
    isDragging: dragging,
  };
}