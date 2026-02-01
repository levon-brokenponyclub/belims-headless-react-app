import React, { useEffect } from "react";
import { CheckCircle, X, AlertCircle } from "lucide-react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type,
  onClose,
  duration = 4000,
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const isSuccess = type === "success";

  return (
    <div
      className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border min-w-[320px] max-w-md animate-slide-in ${
        isSuccess
          ? "bg-green-50 border-green-200 text-green-800"
          : "bg-red-50 border-red-200 text-red-800"
      }`}
    >
      {isSuccess ? (
        <CheckCircle size={20} className="flex-shrink-0" />
      ) : (
        <AlertCircle size={20} className="flex-shrink-0" />
      )}
      <p className="text-sm font-medium flex-1">{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
      >
        <X size={16} />
      </button>
    </div>
  );
};
