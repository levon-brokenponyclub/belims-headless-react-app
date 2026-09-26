import React, { useState } from "react";
import { Drawer } from "./Drawer";
import { AuthModal } from "./AuthModal";
import { UserData } from "../services/authService";

interface WelcomeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  setCurrentUser: (user: UserData | null) => void;
  showToast: (message: string, type: "success" | "error") => void;
}

const ChevronRight = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M9.62 18.25L15.87 12L9.62 5.75" />
  </svg>
);

const navLinks = [
  {
    label: "Sign In / Sign Up",
    to: "/login",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M18 15l3-3m0 0-3-3m3 3H9" />
      </svg>
    ),
    wired: true,
  },
  {
    label: "Browse Stores & Leaflets",
    to: "#",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M13.5 21v-7.5A2.25 2.25 0 0 0 11.25 11.25h-1.5A2.25 2.25 0 0 0 7.5 13.5V21m0-10.5h9m-9 0a2.25 2.25 0 0 1-2.25-2.25V6.75A2.25 2.25 0 0 1 7.5 4.5h9a2.25 2.25 0 0 1 2.25 2.25v1.5A2.25 2.25 0 0 1 16.5 10.5m-9 0v10.5m9-10.5v10.5m0 0h-9" />
      </svg>
    ),
    wired: false,
  },
  {
    label: "Help Centre",
    to: "#",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
      </svg>
    ),
    wired: false,
  },
  {
    label: "Terms & Conditions",
    to: "#",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
    wired: false,
  },
  {
    label: "Privacy Statement",
    to: "#",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    wired: false,
  },
];

export const WelcomeDrawer: React.FC<WelcomeDrawerProps> = ({
  isOpen,
  onClose,
  setCurrentUser,
  showToast,
}) => {
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleNavClick = (link: (typeof navLinks)[number]) => {
    if (!link.wired) return;
    onClose();
    setAuthModalOpen(true);
  };

  return (
    <>
    <AuthModal
      isOpen={authModalOpen}
      onClose={() => setAuthModalOpen(false)}
      onSuccess={(user) => { setCurrentUser(user); setAuthModalOpen(false); }}
      showToast={showToast}
    />
    <Drawer isOpen={isOpen} onClose={onClose} title="Welcome">
      {/* Nav links */}
      <div className="border-b border-gray-100">
        {navLinks.map((link) => (
          <button
            key={link.label}
            type="button"
            onClick={() => handleNavClick(link)}
            className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-surface-muted"
          >
            <span className="text-text-tertiary">{link.icon}</span>
            <span className="flex-1 text-sm font-semibold text-text">
              {link.label}
            </span>
            <span className="text-text-tertiary">
              <ChevronRight />
            </span>
          </button>
        ))}
      </div>

      {/* Contact Support */}
      <div className="p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-tertiary">
          Contact Support
        </h3>
        <div className="flex flex-col gap-3">
          <div className="relative flex flex-col gap-2 rounded-xl border border-border bg-surface-muted p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-belims-blue/10 text-belims-blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
              </svg>
            </div>
            <h4 className="text-sm font-bold text-text">Live Chat</h4>
            <p className="text-xs text-text-secondary">
              Get instant help from our support team
            </p>
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-white hover:text-text"
              aria-label="Start live chat"
            >
              <ChevronRight />
            </button>
          </div>

          <div className="relative flex flex-col gap-2 rounded-xl border border-border bg-surface-muted p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
            <h4 className="text-sm font-bold text-text">Email Support</h4>
            <p className="text-xs text-text-secondary">
              Send us a detailed message
            </p>
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-white hover:text-text"
              aria-label="Email support"
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      </div>
    </Drawer>
    </>
  );
};
