import { useState } from "react";

export default function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const closeToast = () => setToast(null);

  return { toast, showToast, closeToast };
}