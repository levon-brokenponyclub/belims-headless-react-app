import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// Shared form styles for AuthPage (page + modal layouts).
export const inputClass =
  "flex h-12 w-full rounded-md border-2 border-border bg-white px-3 text-base text-text outline-none transition-colors placeholder:text-text-tertiary focus:border-belims-blue disabled:cursor-not-allowed disabled:opacity-50";
export const labelClass = "text-base font-bold text-text";
export const primaryButtonClass =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-belims-blue px-4 font-heading font-condensed text-button font-bold uppercase tracking-wide text-white transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-belims-blue focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
export const outlineButtonClass =
  "inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-md border-2 border-border bg-white px-4 text-base font-bold text-text transition-colors hover:border-text disabled:pointer-events-none disabled:opacity-50";
export const linkClass =
  "font-bold text-belims-blue underline underline-offset-4 transition-colors hover:text-primary";
export const subtleLinkClass =
  "flex w-full items-center justify-center text-base font-bold text-text-secondary transition-colors hover:text-text";
export const errorClass =
  "rounded-md border-2 border-primary/40 bg-primary/5 px-3 py-2.5 text-base text-primary";
export const successClass =
  "rounded-md border-2 border-stock-ok/40 bg-stock-ok/5 px-3 py-2.5 text-base text-stock-ok";

export const OrDivider: React.FC = () => (
  <div className="flex items-center gap-4" aria-hidden>
    <div className="h-0.5 flex-1 bg-border" />
    <span className="text-caption font-bold uppercase text-text-tertiary">or</span>
    <div className="h-0.5 flex-1 bg-border" />
  </div>
);

export const Field: React.FC<{ label: React.ReactNode; htmlFor: string; children: React.ReactNode }> = ({
  label,
  htmlFor,
  children,
}) => (
  <div className="space-y-1.5">
    <label htmlFor={htmlFor} className={labelClass}>
      {label}
    </label>
    {children}
  </div>
);

type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "className">;

export const PasswordInput: React.FC<PasswordInputProps> = (props) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`${inputClass} pr-12`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute right-0 top-0 grid h-12 w-12 place-items-center text-text-tertiary transition-colors hover:text-text"
      >
        {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
      </button>
    </div>
  );
};

interface PhoneInputProps {
  id: string;
  dialCode: string;
  dialCodes: { code: string; flag: string }[];
  onDialCodeChange: (code: string) => void;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  id,
  dialCode,
  dialCodes,
  onDialCodeChange,
  value,
  onChange,
  autoFocus,
}) => (
  <div className="flex h-12 overflow-hidden rounded-md border-2 border-border bg-white transition-colors focus-within:border-belims-blue">
    <select
      value={dialCode}
      onChange={(e) => onDialCodeChange(e.target.value)}
      aria-label="Country code"
      className="shrink-0 cursor-pointer border-r-2 border-border bg-surface-muted px-2 text-base text-text outline-none"
    >
      {dialCodes.map(({ code, flag }) => (
        <option key={code} value={code}>
          {flag} {code}
        </option>
      ))}
    </select>
    <input
      id={id}
      type="tel"
      required
      autoFocus={autoFocus}
      autoComplete="tel-national"
      inputMode="numeric"
      placeholder="82 123 4567"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^\d\s]/g, ""))}
      className="min-w-0 flex-1 bg-transparent px-3 text-base text-text outline-none placeholder:text-text-tertiary"
    />
  </div>
);
