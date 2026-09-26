import React from "react";
import { BottomDrawer } from "./BottomDrawer";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClassName?: string;
  ariaLabel?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  widthClassName = "w-full max-w-sm",
  ariaLabel,
}) => {
  return (
    <BottomDrawer
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={ariaLabel ?? title}
      placement="right"
      widthClassName={widthClassName}
      heightClassName="h-full"
      showHandle={false}
    >
      <div className="flex h-full flex-col bg-white">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-bold text-text">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-surface-muted hover:text-text"
          >
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
              <path d="M6.75 17.25L17.25 6.75M6.75 6.75L17.25 17.25" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">{children}</div>

        {footer && (
          <div className="shrink-0 border-t border-gray-100">{footer}</div>
        )}
      </div>
    </BottomDrawer>
  );
};
