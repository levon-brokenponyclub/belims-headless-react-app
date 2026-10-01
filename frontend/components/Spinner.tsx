import React from "react";
import { Loader2 } from "lucide-react";

interface SpinnerProps {
  size?: number;
  className?: string;
  /** Placement inside a button — consumed by the parent's [data-icon] spacing rules. */
  "data-icon"?: "inline-start" | "inline-end";
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 16,
  className = "",
  ...rest
}) => (
  <Loader2
    size={size}
    role="status"
    aria-label="Loading"
    className={`shrink-0 animate-spin ${className}`}
    {...rest}
  />
);
