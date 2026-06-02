import React from "react";
import { X } from "lucide-react";
import { BottomDrawer } from "./BottomDrawer";

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  ariaLabel: string;
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClassName?: string;
  bodyClassName?: string;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  isOpen,
  onClose,
  ariaLabel,
  icon,
  title,
  subtitle,
  children,
  footer,
  widthClassName = "w-full max-w-md",
  bodyClassName = "bg-soft",
}) => (
  <BottomDrawer
    isOpen={isOpen}
    onClose={onClose}
    ariaLabel={ariaLabel}
    placement="right"
    widthClassName={widthClassName}
    heightClassName="h-full"
    showHandle={false}
  >
    <div className="absolute right-0 top-0 bottom-0 flex h-full w-full flex-col bg-surface">
      <div className="p-4 bg-brand text-white flex justify-between items-center">
        <div className="flex items-center gap-2">
          {icon}
          <div className="flex flex-col">
            <span className="font-bold font-heading leading-tight">{title}</span>
            {subtitle ? <span className="text-xs text-white/80">{subtitle}</span> : null}
          </div>
        </div>
        <button onClick={onClose} className="text-white hover:text-white/70" aria-label={ariaLabel}>
          <X size={24} />
        </button>
      </div>

      <div className={`flex-1 overflow-y-auto ${bodyClassName}`}>{children}</div>

      {footer ? <div className="border-t bg-surface p-5">{footer}</div> : null}
    </div>
  </BottomDrawer>
);
