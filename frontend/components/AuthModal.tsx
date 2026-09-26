import React, { useState } from "react";
import { AuthPage } from "./AuthPage";
import { UserData } from "../services/authService";

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: "login" | "register";
  onClose: () => void;
  onSuccess: (user: UserData) => void;
  showToast: (message: string, type: "success" | "error") => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = "login",
  onClose,
  onSuccess,
  showToast,
}) => {
  const [mode, setMode] = useState<"login" | "register">(initialMode);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-neutral-200">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
              mode === "login"
                ? "border-b-2 border-neutral-950 text-neutral-950"
                : "text-neutral-400 hover:text-neutral-700"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
              mode === "register"
                ? "border-b-2 border-neutral-950 text-neutral-950"
                : "text-neutral-400 hover:text-neutral-700"
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="px-4 text-neutral-400 transition-colors hover:text-neutral-700"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M6.75 17.25L17.25 6.75M6.75 6.75L17.25 17.25" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="max-h-[80vh] overflow-y-auto p-6">
          <AuthPage
            key={mode}
            mode={mode}
            layout="modal"
            onSuccess={(user) => { onSuccess(user); onClose(); }}
            showToast={showToast}
            onSwitchMode={() => setMode(mode === "login" ? "register" : "login")}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};
