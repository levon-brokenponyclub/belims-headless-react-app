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
  headerClassName?: string;
  titleClassName?: string;
  closeButtonClassName?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  widthClassName = "w-full max-w-sm",
  ariaLabel,
  headerClassName = "min-h-16 border-b-0 bg-belims-blue px-6 py-5",
  titleClassName = "font-heading font-condensed text-h4 font-extrabold uppercase text-white",
  closeButtonClassName = "text-white hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white",
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
        <div className={`flex shrink-0 items-center justify-between ${headerClassName}`}>
          <h2 className={titleClassName}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className={`flex h-11 w-11 items-center justify-center rounded-md transition-colors focus-visible:outline-none ${closeButtonClassName}`}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
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
          <div className="shrink-0 border-t border-border bg-white">{footer}</div>
        )}
      </div>
    </BottomDrawer>
  );
};
