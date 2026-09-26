import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { ConfirmationResult } from "firebase/auth";
import { loginUser, registerUser, loginWithFirebasePhone, requestPasswordReset, saveBillingAddress, UserData } from "../services/authService";
import { sendPhoneOTP, getFirebaseIdToken, clearRecaptcha, isFirebaseConfigured, signInWithGoogle, signInWithFacebook } from "../services/firebaseService";
import { loginWithFirebaseGoogle } from "../services/authService";
import { ShippingAddress } from "../types";

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

const inputClass =
  "flex h-12 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10 disabled:cursor-not-allowed disabled:opacity-50";
const labelClass = "text-[14px] font-medium text-neutral-950";
const primaryButtonClass =
  "group inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-belims-blue px-4 text-base font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
const outlineButtonClass =
  "flex h-12 w-full items-center justify-center rounded-md border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-50 disabled:pointer-events-none disabled:opacity-50";
const errorClass =
  "rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700";
const successClass =
  "rounded-md border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700";
const orDivider = (
  <div className="flex items-center gap-4">
    <div className="h-px flex-1 bg-neutral-200" />
    <span className="text-xs font-medium text-neutral-400">or</span>
    <div className="h-px flex-1 bg-neutral-200" />
  </div>
);

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

  // Register multi-step
  const [registerStep, setRegisterStep] = useState<1 | 2 | 3>(1);
  const [addressStreet, setAddressStreet] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressProvince, setAddressProvince] = useState("");
  const [addressPostcode, setAddressPostcode] = useState("");

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
      showToast(result.message || "Signed in with Google!", "success");
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
      showToast(result.message || "Signed in with Facebook!", "success");
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

  // --- Register: advance step 1 → 2 ---
  const handleRegisterStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRegisterStep(2);
  };

  // --- Register: final submission ---
  const handleRegisterComplete = async (includeAddress: boolean) => {
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
      if (includeAddress && addressStreet.trim()) {
        try {
          await saveBillingAddress({
            street: addressStreet,
            city: addressCity,
            province: addressProvince,
            postalCode: addressPostcode,
            country: "ZA",
          } as ShippingAddress);
        } catch { /* non-fatal — account still created */ }
      }
      onSuccess(result.user);
      showToast(result.message || "Account created successfully!", "success");
      postSuccess();
    } catch (err: any) {
      const msg = err?.message || "Something went wrong. Please try again.";
      setError(msg);
      showToast(msg, "error");
      setRegisterStep(1);
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
      showToast(result.message || "Welcome back!", "success");
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
      showToast(result.message || "Welcome!", "success");
      postSuccess();
    } catch (err: any) {
      setPhoneError(err?.message || "Invalid code. Please try again.");
    } finally {
      setPhoneSubmitting(false);
    }
  };

  const formContent = (
    <div className="space-y-6">
      <div id={recaptchaContainerId} />

          {/* Heading */}
          <div>
            <h1 className="text-2xl font-semibold text-neutral-950">
              {isRegisterMode ? "Create Account" : "Sign In"}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              {isRegisterMode
                ? "Create an account and verify your details to start using."
                : "Welcome back."
              }
            </p>
          </div>

          {/* Social sign-in */}
          {isFirebaseConfigured() && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={googleLoading}
                  onClick={handleGoogleSignIn}
                  className="flex h-12 w-full items-center justify-center gap-2.5 rounded-md border border-neutral-200 bg-white text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-50 disabled:pointer-events-none disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>{googleLoading ? "Signing in..." : "Continue with Google"}</span>
                </button>

                <button
                  type="button"
                  disabled={facebookLoading}
                  onClick={handleFacebookSignIn}
                  className="flex h-12 w-full items-center justify-center gap-2.5 rounded-md border border-neutral-200 bg-white text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-50 disabled:pointer-events-none disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
                  </svg>
                  <span>{facebookLoading ? "Signing in..." : "Continue with Facebook"}</span>
                </button>
              </div>

              {googleError && (
                <div className={errorClass}>{googleError}</div>
              )}

              {orDivider}
            </div>
          )}

          {/* ── LOGIN FLOW ── */}
          {!isRegisterMode && (
            <div className="space-y-5">

              {/* Identifier step (legacy — not normally reached) */}
              {loginStep === "identifier" && (
                <form onSubmit={handleIdentifierContinue} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className={labelClass}>Email or Mobile Number</label>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="Enter your email or mobile number"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <button type="submit" className={primaryButtonClass}>Continue</button>
                </form>
              )}

              {/* Password step */}
              {loginStep === "password" && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className={labelClass}>Email address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className={labelClass}>Password</label>
                      <button
                        type="button"
                        onClick={() => { setForgotEmail(email); setForgotError(null); setForgotSuccess(null); setLoginStep("forgot-password"); }}
                        className="text-[14px] font-medium text-neutral-500 transition-colors hover:text-neutral-950"
                      >
                        Forgot your password?
                      </button>
                    </div>
                    <input
                      type="password"
                      required
                      autoFocus
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  {error && <div className={errorClass}>{error}</div>}
                  {isFirebaseConfigured() && (
                    <>
                      {orDivider}
                      <button
                        type="button"
                        onClick={() => { setLoginStep("phone-otp"); setPhoneStep("number"); setPhoneError(null); }}
                        className={outlineButtonClass}
                      >
                        Log In with a One-Time Code
                      </button>
                    </>
                  )}
                  <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
                    {isSubmitting ? "Please wait..." : "Sign In"}
                  </button>
                  <p className="text-center text-sm text-neutral-500">
                    Don't have an account?{" "}
                    {isModal ? (
                      <button type="button" onClick={onSwitchMode} className="font-medium text-neutral-950 hover:underline">Create one</button>
                    ) : (
                      <Link to="/register" className="font-medium text-neutral-950 hover:underline">Create one</Link>
                    )}
                    .
                  </p>
                </form>
              )}

              {/* Forgot password step */}
              {loginStep === "forgot-password" && (
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div className="space-y-1.5">
                    <p className="text-sm text-neutral-500">
                      Enter your email address and we'll send you a link to reset your password.
                    </p>
                    <label className={labelClass}>Email address</label>
                    <input
                      type="email"
                      required
                      autoFocus
                      placeholder="name@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  {forgotError && <div className={errorClass}>{forgotError}</div>}
                  {forgotSuccess && <div className={successClass}>{forgotSuccess}</div>}
                  {!forgotSuccess && (
                    <button type="submit" disabled={forgotSubmitting} className={primaryButtonClass}>
                      {forgotSubmitting ? "Sending..." : "Send reset link"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setLoginStep("password"); setForgotError(null); setForgotSuccess(null); }}
                    className="flex w-full items-center justify-center text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-950"
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
                      <div className="space-y-1.5">
                        <label className={labelClass}>Mobile number</label>
                        <div className="flex h-12 overflow-hidden rounded-md border border-neutral-200 transition-colors focus-within:border-neutral-950 focus-within:ring-2 focus-within:ring-neutral-950/10">
                          <select
                            value={dialCode}
                            onChange={(e) => setDialCode(e.target.value)}
                            className="shrink-0 border-r border-neutral-200 bg-neutral-50 px-2 py-2 text-sm outline-none"
                            aria-label="Country code"
                          >
                            {DIAL_CODES.map(({ code, flag }) => (
                              <option key={code} value={code}>{flag} {code}</option>
                            ))}
                          </select>
                          <input
                            type="tel"
                            required
                            autoFocus
                            placeholder="82 123 4567"
                            value={localPhone}
                            onChange={(e) => setLocalPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                            className="min-w-0 flex-1 px-3 py-2 text-sm text-neutral-950 outline-none placeholder:text-neutral-400"
                            inputMode="numeric"
                          />
                        </div>
                        <p className="text-xs text-neutral-400">
                          Select your country code, then enter your number without the leading zero.
                        </p>
                      </div>
                      {phoneError && <div className={errorClass}>{phoneError}</div>}
                      <button type="submit" disabled={phoneSubmitting} className={primaryButtonClass}>
                        {phoneSubmitting ? "Sending..." : "Send verification code"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setLoginStep("password"); setPhoneError(null); clearRecaptcha(recaptchaContainerId); }}
                        className="flex w-full items-center justify-center text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-950"
                      >
                        ← Back to sign in
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOTP} className="space-y-5">
                      <p className="text-sm text-neutral-500">
                        Enter the 6-digit code sent to{" "}
                        <span className="font-semibold text-neutral-950">{confirmedPhone}</span>.
                      </p>
                      <div className="space-y-1.5">
                        <label className={labelClass}>Verification code</label>
                        <input
                          type="text"
                          required
                          autoFocus
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="000000"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                          className="flex h-12 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-center text-lg font-bold tracking-widest text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
                        />
                      </div>
                      {phoneError && <div className={errorClass}>{phoneError}</div>}
                      <button
                        type="submit"
                        disabled={phoneSubmitting || otp.length < 6}
                        className={primaryButtonClass}
                      >
                        {phoneSubmitting ? "Verifying..." : "Verify & Sign In"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPhoneStep("number"); setOtp(""); setPhoneError(null); }}
                        className="flex w-full items-center justify-center text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-950"
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
            <div className="space-y-6">
              {/* Step progress bar */}
              <div className="flex items-center gap-1.5">
                {([1, 2] as const).map((s) => (
                  <div
                    key={s}
                    className={`h-1 flex-1 rounded-full transition-colors ${s <= registerStep ? "bg-neutral-950" : "bg-neutral-200"}`}
                  />
                ))}
              </div>

              {/* Step 1: Credentials */}
              {registerStep === 1 && (
                <form onSubmit={handleRegisterStep1} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className={labelClass}>Email address</label>
                    <input
                      type="email"
                      required
                      autoFocus
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelClass}>Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <button type="submit" className={primaryButtonClass}>
                    Create Account
                  </button>
                  <p className="text-center text-sm text-neutral-500">
                    Already have an account?{" "}
                    {isModal ? (
                      <button type="button" onClick={onSwitchMode} className="font-medium text-neutral-950 hover:underline">Log in here</button>
                    ) : (
                      <Link to="/login" className="font-medium text-neutral-950 hover:underline">Log in here</Link>
                    )}
                    .
                  </p>
                </form>
              )}

              {/* Step 2: Personal Details */}
              {registerStep === 2 && (
                <form onSubmit={(e) => { e.preventDefault(); handleRegisterComplete(false); }} className="space-y-5">
                  <h2 className="text-xl font-semibold text-neutral-950">Personal Details</h2>
                  <div className="space-y-1.5">
                    <label className={labelClass}>First name</label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelClass}>Last name</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelClass}>Mobile number</label>
                    <div className="flex h-12 overflow-hidden rounded-md border border-neutral-200 transition-colors focus-within:border-neutral-950 focus-within:ring-2 focus-within:ring-neutral-950/10">
                      <select
                        value={regDialCode}
                        onChange={(e) => setRegDialCode(e.target.value)}
                        className="shrink-0 border-r border-neutral-200 bg-neutral-50 px-2 py-2 text-sm outline-none"
                        aria-label="Country code"
                      >
                        {DIAL_CODES.map(({ code, flag }) => (
                          <option key={code} value={code}>{flag} {code}</option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        required
                        placeholder="82 123 4567"
                        value={regLocalPhone}
                        onChange={(e) => setRegLocalPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                        className="min-w-0 flex-1 px-3 py-2 text-sm text-neutral-950 outline-none placeholder:text-neutral-400"
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                  {error && <div className={errorClass}>{error}</div>}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRegisterStep(1)}
                      className={outlineButtonClass}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={primaryButtonClass}
                    >
                      {isSubmitting ? "Please wait..." : "Register"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

    </div>
  );

  if (isModal) return formContent;

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <header className="bg-white border-b border-neutral-200">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link to="/" aria-label="Return to store">
              <img alt="Belims" src="/images/belims-logo-dark.png" className="h-8 w-auto" />
            </Link>
            <div className="flex items-center gap-1.5 text-neutral-500">
              <Lock className="h-3.5 w-3.5" />
              <span className="text-xs">Secure checkout</span>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md">
          <div className="rounded-lg border border-neutral-200 bg-white p-6 md:p-8">
            {formContent}
          </div>
        </div>
      </main>
    </div>
  );
};
