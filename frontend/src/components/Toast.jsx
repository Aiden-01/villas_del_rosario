import { useEffect } from "react";

const COLORS = {
  success: { bg: "#16a34a", icon: "✅" },
  error: { bg: "#dc2626", icon: "❌" },
  warning: { bg: "#d97706", icon: "⚠️" },
  info: { bg: "#2563eb", icon: "ℹ️" },
};

export default function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 3000);
    return () => clearTimeout(timer);
  }, []);

  const { bg, icon } = COLORS[type] || COLORS.success;

  return (
    <div
      className="fixed bottom-6 right-6 z-[999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-white font-semibold text-sm"
      style={{
        backgroundColor: bg,
        animation: "slideIn 0.3s ease-out",
        minWidth: "250px",
        maxWidth: "350px",
      }}
    >
      <span className="text-lg">{icon}</span>
      <span className="flex-1">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 opacity-70 hover:opacity-100 text-lg leading-none"
      >
        ×
      </button>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(100px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}