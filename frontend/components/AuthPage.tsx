import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { ConfirmationResult } from "firebase/auth";
import { loginUser, registerUser, loginWithFirebasePhone, requestPasswordReset, UserData } from "../services/authService";
import { sendPhoneOTP, getFirebaseIdToken, clearRecaptcha, isFirebaseConfigured, signInWithGoogle, signInWithFacebook } from "../services/firebaseService";
import { loginWithFirebaseGoogle } from "../services/authService";
import { Spinner } from "./Spinner";
import {
  errorClass,
  Field,
  inputClass,
  linkClass,
  OrDivider,
  outlineButtonClass,
  PasswordInput,
  PhoneInput,
  primaryButtonClass,
  subtleLinkClass,
  successClass,
} from "./auth/authFields";

interface AuthPageProps {
  mode: "login" | "register";
  onSuccess: (user: UserData) => void;
  showToast: (message: string, type: "success" | "error") => void;
  layout?: "page" | "modal";
  onSwitchMode?: () => void;
  onClose?: () => void;
}

const DIAL_CODES = [
  { code: "+27", flag: "🇿🇦" },
  { code: "+263", flag: "🇿🇼" },
  { code: "+267", flag: "🇧🇼" },
  { code: "+260", flag: "🇿🇲" },
  { code: "+254", flag: "🇰🇪" },
  { code: "+234", flag: "🇳🇬" },
  { code: "+44", flag: "🇬🇧" },
  { code: "+1", flag: "🇺🇸" },
];

function parsePhoneIdentifier(val: string): { dialCode: string; local: string } {
  const raw = val.trim().replace(/[\s()-]/g, "");
  for (const { code } of DIAL_CODES) {
    if (raw.startsWith(code)) {
      const local = raw.slice(code.length);
      return { dialCode: code, local: local.startsWith("0") ? local.slice(1) : local };
    }
  }
  const digits = raw.replace(/^\+?/, "");
  return { dialCode: "+27", local: digits.startsWith("0") ? digits.slice(1) : digits };
}

const SIGNUP_ADDRESS_PATH = "/delivery-details/add-address?context=signup";

const welcomeDetail = (user: { first_name?: string; display_name?: string } | undefined, greeting: string) => {
  const name = user?.first_name || user?.display_name;
  return name ? `${greeting}, ${name}` : undefined;
};

export const AuthPage: React.FC<AuthPageProps> = ({ mode, onSuccess, showToast, layout = "page", onSwitchMode, onClose }) => {
  const navigate = useNavigate();
  const isRegisterMode = mode === "register";
  const isModal = layout === "modal";

  const postSuccess = () => {
    if (isModal) { onClose?.(); } else { setTimeout(() => navigate("/"), 1000); }
  };

  // Shared fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);


  // Register: international phone
  const [regDialCode, setRegDialCode] = useState("+27");
  const [regLocalPhone, setRegLocalPhone] = useState("");
  const buildRegPhone = (): string => {
    const digits = regLocalPhone.replace(/\D/g, "");
    const normalized = digits.startsWith("0") ? digits.slice(1) : digits;
    return normalized ? regDialCode + normalized : "";
  };

  // Login: unified identifier step flow
  const [loginStep, setLoginStep] = useState<"identifier" | "password" | "phone-otp" | "forgot-password">("password");
  const [loginIdentifier, setLoginIdentifier] = useState("");

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  // Social sign-in state
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Phone OTP state
  const [dialCode, setDialCode] = useState("+27");
  const [localPhone, setLocalPhone] = useState("");
  const [confirmedPhone, setConfirmedPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<"number" | "otp">("number");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [phoneSubmitting, setPhoneSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const recaptchaContainerId = "firebase-recaptcha";

  useEffect(() => {
    return () => { clearRecaptcha(recaptchaContainerId); };
  }, []);

  // --- Social sign-in ---
  const handleGoogleSignIn = async () => {
    setGoogleError(null);
    setGoogleLoading(true);
    try {
      const { idToken, email, displayName } = await signInWithGoogle();
      const result = await loginWithFirebaseGoogle(idToken, email, displayName);
      onSuccess(result.user);
      showToast("Signed in successfully", "success", { detail: welcomeDetail(result.user, "Welcome back") });
      postSuccess();
    } catch (err: any) {
      const msg = err?.message || "Google sign-in failed. Please try again.";
      setGoogleError(msg);
      showToast(msg, "error");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setGoogleError(null);
    setFacebookLoading(true);
    try {
      const { idToken, email, displayName } = await signInWithFacebook();
      const result = await loginWithFirebaseGoogle(idToken, email, displayName);
      onSuccess(result.user);
      showToast("Signed in successfully", "success", { detail: welcomeDetail(result.user, "Welcome back") });
      postSuccess();
    } catch (err: any) {
      const msg = err?.message || "Facebook sign-in failed. Please try again.";
      setGoogleError(msg);
      showToast(msg, "error");
    } finally {
      setFacebookLoading(false);
    }
  };

  // --- Login: identifier step (legacy path) ---
  const handleIdentifierContinue = (e: React.FormEvent) => {
    e.preventDefault();
    const val = loginIdentifier.trim();
    if (!val) return;
    if (!val.includes("@") && isFirebaseConfigured()) {
      const parsed = parsePhoneIdentifier(val);
      setDialCode(parsed.dialCode);
      setLocalPhone(parsed.local);
      setLoginStep("phone-otp");
      setPhoneStep("number");
    } else {
      setEmail(val);
      setLoginStep("password");
    }
  };

  // --- Forgot password ---
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    setForgotSubmitting(true);
    try {
      const result = await requestPasswordReset(forgotEmail.trim());
      setForgotSuccess(result.message);
    } catch (err: any) {
      setForgotError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setForgotSubmitting(false);
    }
  };

  // --- Register: single-step submission ---
  // New accounts go straight to the address step; the address is saved to the account there.
  const handleRegisterComplete = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await registerUser({
        email,
        password,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        phone: buildRegPhone() || undefined,
        role: "customer",
      });
      navigate(SIGNUP_ADDRESS_PATH);
      onSuccess(result.user);
      showToast("Account created", "success", { detail: "Now add your delivery address" });
      if (isModal) onClose?.();
    } catch (err: any) {
      const msg = err?.message || "Something went wrong. Please try again.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Email/password login submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      const result = await loginUser({ email, password });
      onSuccess(result.user);
      showToast("Signed in successfully", "success", { detail: welcomeDetail(result.user, "Welcome back") });
      postSuccess();
    } catch (err: any) {
      const errorMsg = err?.message || "Something went wrong. Please try again.";
      setError(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildE164 = (): string => {
    const digits = localPhone.replace(/\D/g, "");
    const normalized = digits.startsWith("0") ? digits.slice(1) : digits;
    return dialCode + normalized;
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);
    setPhoneSubmitting(true);
    const e164 = buildE164();
    setConfirmedPhone(e164);
    try {
      const result = await sendPhoneOTP(e164, recaptchaContainerId);
      setConfirmationResult(result);
      setPhoneStep("otp");
    } catch (err: any) {
      const code = err?.code ?? "";
      const msg =
        code === "auth/billing-not-enabled"
          ? "Phone sign-in is temporarily unavailable. Please use email login."
          : code === "auth/invalid-phone-number"
          ? "Invalid phone number. Use international format e.g. +27821234567."
          : code === "auth/too-many-requests"
          ? "Too many attempts. Please wait a few minutes and try again."
          : err?.message || "Failed to send OTP. Check the number and try again.";
      setPhoneError(msg);
    } finally {
      setPhoneSubmitting(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    setPhoneError(null);
    setPhoneSubmitting(true);
    try {
      await confirmationResult.confirm(otp.trim());
      const idToken = await getFirebaseIdToken();
      if (!idToken) throw new Error("Could not retrieve authentication token.");
      const result = await loginWithFirebasePhone(idToken, confirmedPhone.trim());
      onSuccess(result.user);
      showToast("Signed in successfully", "success", { detail: welcomeDetail(result.user, "Welcome") });
      postSuccess();
    } catch (err: any) {
      setPhoneError(err?.message || "Invalid code. Please try again.");
    } finally {
      setPhoneSubmitting(false);
    }
  };

  const busy = (label: string) => (
    <>
      <Spinner data-icon="inline-start" />
      {label}
    </>
  );

  const socialButtons = isFirebaseConfigured() && (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button type="button" disabled={googleLoading} onClick={handleGoogleSignIn} className={outlineButtonClass}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span>{googleLoading ? "Signing in..." : "Google"}</span>
        </button>
        <button type="button" disabled={facebookLoading} onClick={handleFacebookSignIn} className={outlineButtonClass}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" aria-hidden>
            <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
          </svg>
          <span>{facebookLoading ? "Signing in..." : "Facebook"}</span>
        </button>
      </div>
      {googleError && (
        <div role="alert" className={errorClass}>
          {googleError}
        </div>
      )}
    </div>
  );

  const switchLink = (label: string, to: "/login" | "/register") =>
    isModal ? (
      <button type="button" onClick={onSwitchMode} className={linkClass}>
        {label}
      </button>
    ) : (
      <Link to={to} className={linkClass}>
        {label}
      </Link>
    );

  const formContent = (
    <div className="space-y-6">
      <div id={recaptchaContainerId} />

      {/* Heading (right padding clears the modal's close button) */}
      <div className={isModal ? "pr-10" : ""}>
        <h1 className="text-h4 font-bold text-text">
          {isRegisterMode ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1 text-base text-text-secondary">
          {isRegisterMode
            ? "Track orders, save addresses and check out faster."
            : "Sign in to your Belims account."}
        </p>
      </div>

      {/* Register: social sign-up first, so it can skip the long form */}
      {isRegisterMode && socialButtons && (
        <div className="space-y-4">
          {socialButtons}
          <OrDivider />
        </div>
      )}

      {/* ── LOGIN FLOW ── */}
      {!isRegisterMode && (
        <div className="space-y-5">
          {/* Identifier step (legacy — not normally reached) */}
          {loginStep === "identifier" && (
            <form onSubmit={handleIdentifierContinue} className="space-y-5">
              <Field label="Email or mobile number" htmlFor="auth-identifier">
                <input
                  id="auth-identifier"
                  type="text"
                  required
                  autoFocus
                  placeholder="Enter your email or mobile number"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <button type="submit" className={primaryButtonClass}>Continue</button>
            </form>
          )}

          {/* Password step */}
          {loginStep === "password" && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Field label="Email address" htmlFor="auth-email">
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="auth-password" className="text-base font-bold text-text">Password</label>
                  <button
                    type="button"
                    onClick={() => { setForgotEmail(email); setForgotError(null); setForgotSuccess(null); setLoginStep("forgot-password"); }}
                    className="text-base font-bold text-text-secondary underline underline-offset-4 transition-colors hover:text-text"
                  >
                    Forgot password?
                  </button>
                </div>
                <PasswordInput
                  id="auth-password"
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <div role="alert" className={errorClass}>{error}</div>}
              <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
                {isSubmitting ? busy("Signing in...") : "Sign in"}
              </button>
              {isFirebaseConfigured() && (
                <div className="space-y-4">
                  <OrDivider />
                  {socialButtons}
                  <button
                    type="button"
                    onClick={() => { setLoginStep("phone-otp"); setPhoneStep("number"); setPhoneError(null); }}
                    className={outlineButtonClass}
                  >
                    Sign in with a one-time code
                  </button>
                </div>
              )}
              <p className="text-center text-base text-text-secondary">
                New to Belims? {switchLink("Create an account", "/register")}
              </p>
            </form>
          )}

          {/* Forgot password step */}
          {loginStep === "forgot-password" && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <p className="text-base text-text-secondary">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <Field label="Email address" htmlFor="auth-forgot-email">
                <input
                  id="auth-forgot-email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className={inputClass}
                />
              </Field>
              {forgotError && <div role="alert" className={errorClass}>{forgotError}</div>}
              {forgotSuccess && <div role="status" className={successClass}>{forgotSuccess}</div>}
              {!forgotSuccess && (
                <button type="submit" disabled={forgotSubmitting} className={primaryButtonClass}>
                  {forgotSubmitting ? busy("Sending...") : "Send reset link"}
                </button>
              )}
              <button
                type="button"
                onClick={() => { setLoginStep("password"); setForgotError(null); setForgotSuccess(null); }}
                className={subtleLinkClass}
              >
                ← Back to sign in
              </button>
            </form>
          )}

          {/* Phone OTP step */}
          {loginStep === "phone-otp" && (
            <div className="space-y-5">
              {phoneStep === "number" ? (
                <form onSubmit={handleSendOTP} className="space-y-5">
                  <Field label="Mobile number" htmlFor="auth-otp-phone">
                    <PhoneInput
                      id="auth-otp-phone"
                      autoFocus
                      dialCode={dialCode}
                      dialCodes={DIAL_CODES}
                      onDialCodeChange={setDialCode}
                      value={localPhone}
                      onChange={setLocalPhone}
                    />
                    <p className="text-caption text-text-tertiary">
                      Select your country code, then enter your number without the leading zero.
                    </p>
                  </Field>
                  {phoneError && <div role="alert" className={errorClass}>{phoneError}</div>}
                  <button type="submit" disabled={phoneSubmitting} className={primaryButtonClass}>
                    {phoneSubmitting ? busy("Sending...") : "Send verification code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLoginStep("password"); setPhoneError(null); clearRecaptcha(recaptchaContainerId); }}
                    className={subtleLinkClass}
                  >
                    ← Back to sign in
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-5">
                  <p className="text-base text-text-secondary">
                    Enter the 6-digit code sent to{" "}
                    <span className="font-bold text-text">{confirmedPhone}</span>.
                  </p>
                  <Field label="Verification code" htmlFor="auth-otp-code">
                    <input
                      id="auth-otp-code"
                      type="text"
                      required
                      autoFocus
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      className={`${inputClass} text-center text-lg font-bold tracking-widest`}
                    />
                  </Field>
                  {phoneError && <div role="alert" className={errorClass}>{phoneError}</div>}
                  <button type="submit" disabled={phoneSubmitting || otp.length < 6} className={primaryButtonClass}>
                    {phoneSubmitting ? busy("Verifying...") : "Verify & sign in"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPhoneStep("number"); setOtp(""); setPhoneError(null); }}
                    className={subtleLinkClass}
                  >
                    ← Use a different number
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── REGISTER FLOW ── */}
      {isRegisterMode && (
        <form onSubmit={(e) => { e.preventDefault(); handleRegisterComplete(); }} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-3">
            <Field label="First name" htmlFor="auth-first-name">
              <input
                id="auth-first-name"
                type="text"
                required
                autoFocus
                autoComplete="given-name"
                placeholder="Jane"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Last name" htmlFor="auth-last-name">
              <input
                id="auth-last-name"
                type="text"
                required
                autoComplete="family-name"
                placeholder="Smith"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Email address" htmlFor="auth-reg-email">
            <input
              id="auth-reg-email"
              type="email"
              required
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Password" htmlFor="auth-reg-password">
            <PasswordInput
              id="auth-reg-password"
              required
              autoComplete="new-password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label="Mobile number" htmlFor="auth-reg-phone">
            <PhoneInput
              id="auth-reg-phone"
              dialCode={regDialCode}
              dialCodes={DIAL_CODES}
              onDialCodeChange={setRegDialCode}
              value={regLocalPhone}
              onChange={setRegLocalPhone}
            />
          </Field>
          {error && <div role="alert" className={errorClass}>{error}</div>}
          {/* Stays visible while the modal body scrolls */}
          <div
            className={`space-y-3 ${
              isModal ? "sticky -bottom-6 -mx-6 -mb-6 border-t-2 border-border bg-white px-6 py-4" : ""
            }`}
          >
            <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
              {isSubmitting ? busy("Creating account...") : "Create account"}
            </button>
            <p className="text-center text-base text-text-secondary">
              Already have an account? {switchLink("Sign in", "/login")}
            </p>
          </div>
        </form>
      )}
    </div>
  );

  if (isModal) return formContent;

  return (
    <div className="flex min-h-screen flex-col bg-surface-muted">
      <header className="border-b-2 border-border bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link to="/" aria-label="Return to store">
              <img alt="Belims" src="/images/belims-logo-dark.webp" className="h-8 w-auto" />
            </Link>
            <div className="flex items-center gap-1.5 text-text-secondary">
              <Lock className="h-3.5 w-3.5" />
              <span className="text-caption">Secure checkout</span>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md">
          <div className="rounded-lg border-2 border-border bg-white p-6 md:p-8">{formContent}</div>
        </div>
      </main>
    </div>
  );
};
