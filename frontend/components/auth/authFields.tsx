import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import {
  errorClass,
  inputClass,
  labelClass,
  outlineButtonClass as baseOutlineButtonClass,
  primaryButtonClass as basePrimaryButtonClass,
  successClass,
} from "../ui/classes";

// Auth form styles build on the shared control styles; auth buttons are full width.
export { errorClass, inputClass, labelClass, successClass };
export const primaryButtonClass = `${basePrimaryButtonClass} w-full`;
export const outlineButtonClass = `${baseOutlineButtonClass} w-full`;
export const linkClass =
  "font-bold text-belims-blue underline underline-offset-4 transition-colors hover:text-primary";
export const subtleLinkClass =
  "flex w-full items-center justify-center text-base font-bold text-text-secondary transition-colors hover:text-text";

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
      className="shrink-0 cursor-pointer border-r-2 border-border bg-surface-muted px-2 text-lg text-text md:text-base outline-none"
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
      className="min-w-0 flex-1 bg-transparent px-3 text-lg text-text md:text-base outline-none placeholder:text-text-tertiary"
    />
  </div>
);
