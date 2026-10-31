import React from "react";

/** Save / remove feedback. `status` for success (polite), `alert` for errors. */
export const Notice: React.FC<{ type: "success" | "error"; children: React.ReactNode }> = ({ type, children }) => (
  <div
    role={type === "success" ? "status" : "alert"}
    className={`rounded-md border-l-4 bg-surface-muted p-4 font-semibold ${
      type === "success" ? "border-success text-text" : "border-error text-error"
    }`}
  >
    {children}
  </div>
);
