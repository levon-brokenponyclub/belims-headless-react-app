import React from "react";

export type PillTone = "success" | "warning" | "info" | "danger" | "neutral";

const TONE_CLASSES: Record<PillTone, string> = {
  success: "bg-green-100 text-green-700",
  warning: "bg-orange-100 text-orange-700",
  info: "bg-blue-100 text-blue-700",
  danger: "bg-red-100 text-red-700",
  neutral: "bg-grey-light text-grey-medium",
};

interface PillProps {
  tone?: PillTone;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export const Pill: React.FC<PillProps> = ({
  tone = "neutral",
  icon,
  className = "",
  children,
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${TONE_CLASSES[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
};
