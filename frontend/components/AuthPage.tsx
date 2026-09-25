import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ConfirmationResult } from "firebase/auth";
import { loginUser, registerUser, loginWithFirebasePhone, UserData } from "../services/authService";
import { sendPhoneOTP, getFirebaseIdToken, clearRecaptcha, isFirebaseConfigured, signInWithGoogle, signInWithFacebook } from "../services/firebaseService";
import { loginWithFirebaseGoogle } from "../services/authService";

interface AuthPageProps {
  mode: "login" | "register";
  onSuccess: (user: UserData) => void;
  showToast: (message: string, type: "success" | "error") => void;
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

export const AuthPage: React.FC<AuthPageProps> = ({ mode, onSuccess, showToast }) => {
  const navigate = useNavigate();
  const isRegisterMode = mode === "register";

  // Shared fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Login: unified identifier step flow
  const [loginStep, setLoginStep] = useState<"identifier" | "password" | "phone-otp">("identifier");
  const [loginIdentifier, setLoginIdentifier] = useState("");

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
      setTimeout(() => navigate("/"), 1000);
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
      setTimeout(() => navigate("/"), 1000);
    } catch (err: any) {
      const msg = err?.message || "Facebook sign-in failed. Please try again.";
      setGoogleError(msg);
      showToast(msg, "error");
    } finally {
      setFacebookLoading(false);
    }
  };

  // --- Login: identifier step ---
  const handleIdentifierContinue = (e: React.FormEvent) => {
    e.preventDefault();
    const val = loginIdentifier.trim();
    if (!val) return;

    if (!val.includes("@") && isFirebaseConfigured()) {
      // Phone number: parse and go to phone OTP flow
      const parsed = parsePhoneIdentifier(val);
      setDialCode(parsed.dialCode);
      setLocalPhone(parsed.local);
      setLoginStep("phone-otp");
      setPhoneStep("number");
    } else {
      // Email: set email state and go to password step
      setEmail(val);
      setLoginStep("password");
    }
  };

  // --- Email/password login submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      if (isRegisterMode) {
        const result = await registerUser({
          email,
          password,
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          phone: phone || undefined,
          role: "customer",
        });
        onSuccess(result.user);
        showToast(result.message || "Account created successfully!", "success");
        setTimeout(() => navigate("/"), 1000);
      } else {
        const result = await loginUser({ email, password });
        onSuccess(result.user);
        showToast(result.message || "Welcome back!", "success");
        setTimeout(() => navigate("/"), 1000);
      }
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
      setTimeout(() => navigate("/"), 1000);
    } catch (err: any) {
      setPhoneError(err?.message || "Invalid code. Please try again.");
    } finally {
      setPhoneSubmitting(false);
    }
  };

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 overflow-hidden bg-white">
      <div className="pointer-events-none absolute right-0 top-0 h-[340px] w-[340px] rounded-full" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[320px] w-[320px] rounded-full" />

      <div className="container mx-auto flex h-full min-h-full flex-1 px-4">
        <div className="mx-auto grid h-full min-h-full w-full flex-1 overflow-hidden bg-white lg:grid-cols-2">
          <div className="order-2 flex h-full flex-col justify-between border-t border-gray-200 bg-gray-900 px-8 py-10 text-white lg:order-1 lg:border-t-0 lg:border-r">
            <div>
              <p className="mt-6 text-lg font-semibold leading-relaxed">
                Placeholder text for a compelling marketing message.
              </p>
            </div>
            <p className="mt-12 text-sm text-gray-300">
              You can also contact us via{" "}
              <a
                href="mailto:info@belims.co.za"
                className="font-semibold text-white underline underline-offset-2"
              >
                info@belims.co.za
              </a>
            </p>
          </div>

          <div className="order-1 h-full px-6 py-12 sm:px-8 sm:py-16 lg:order-2">
            <div className="mb-6">
              <h1 className="font-heading text-2xl font-bold text-gray-900">
                {isRegisterMode ? "Create Account" : "Sign In"}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                {isRegisterMode ? (
                  <>
                    Create an account and verify your details to start using.
                    Already have an account?{" "}
                    <Link to="/login" className="font-semibold text-belims-blue">
                      Log in here
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    Welcome back. Don't have an account?{" "}
                    <Link to="/register" className="font-semibold text-belims-blue">
                      Create one
                    </Link>
                    .
                  </>
                )}
              </p>
            </div>

            {/* invisible reCAPTCHA container required by Firebase */}
            <div id={recaptchaContainerId} />

            {/* ── LOGIN FLOW ── */}
            {!isRegisterMode && (
              <div className="space-y-4">
                {/* Step 1: identifier */}
                {loginStep === "identifier" && (
                  <form onSubmit={handleIdentifierContinue} className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700">
                        Email or Mobile Number
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus
                        placeholder="Enter your email or mobile number"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-belims-blue focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full rounded bg-belims-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-belims-accent"
                    >
                      Continue
                    </button>
                  </form>
                )}

                {/* Step 2a: email + password */}
                {loginStep === "password" && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700">
                        Email address
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-belims-blue focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        autoFocus
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-belims-blue focus:outline-none"
                      />
                    </div>
                    {error && (
                      <div className="rounded border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                        {error}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full rounded bg-belims-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-belims-accent disabled:opacity-60"
                    >
                      {isSubmitting ? "Please wait..." : "Sign In"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setLoginStep("identifier"); setError(null); }}
                      className="w-full text-sm text-gray-500 hover:underline"
                    >
                      ← Use a different email or number
                    </button>
                  </form>
                )}

                {/* Step 2b: phone OTP */}
                {loginStep === "phone-otp" && (
                  <div className="space-y-4">
                    {phoneStep === "number" ? (
                      <form onSubmit={handleSendOTP} className="space-y-4">
                        <div>
                          <label className="text-sm font-semibold text-gray-700">
                            Mobile number
                          </label>
                          <div className="mt-1 flex overflow-hidden rounded border border-gray-200 focus-within:border-belims-blue focus-within:ring-1 focus-within:ring-belims-blue">
                            <select
                              value={dialCode}
                              onChange={(e) => setDialCode(e.target.value)}
                              className="shrink-0 border-r border-gray-200 bg-gray-50 px-2 py-2 text-sm focus:outline-none"
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
                              className="min-w-0 flex-1 px-3 py-2 text-sm focus:outline-none"
                              inputMode="numeric"
                            />
                          </div>
                          <p className="mt-1 text-xs text-gray-400">
                            Select your country code, then enter your number without the leading zero.
                          </p>
                        </div>
                        {phoneError && (
                          <div className="rounded border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                            {phoneError}
                          </div>
                        )}
                        <button
                          type="submit"
                          disabled={phoneSubmitting}
                          className="w-full rounded bg-belims-blue px-4 py-2 text-sm font-semibold text-white hover:bg-belims-accent disabled:opacity-60"
                        >
                          {phoneSubmitting ? "Sending..." : "Send verification code"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setLoginStep("identifier"); setPhoneError(null); clearRecaptcha(recaptchaContainerId); }}
                          className="w-full text-sm text-gray-500 hover:underline"
                        >
                          ← Use a different email or number
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyOTP} className="space-y-4">
                        <p className="text-sm text-gray-600">
                          Enter the 6-digit code sent to{" "}
                          <span className="font-semibold">{confirmedPhone}</span>.
                        </p>
                        <div>
                          <label className="text-sm font-semibold text-gray-700">
                            Verification code
                          </label>
                          <input
                            type="text"
                            required
                            autoFocus
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="000000"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                            className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-center text-lg font-bold tracking-widest focus:border-belims-blue focus:outline-none"
                          />
                        </div>
                        {phoneError && (
                          <div className="rounded border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                            {phoneError}
                          </div>
                        )}
                        <button
                          type="submit"
                          disabled={phoneSubmitting || otp.length < 6}
                          className="w-full rounded bg-belims-blue px-4 py-2 text-sm font-semibold text-white hover:bg-belims-accent disabled:opacity-60"
                        >
                          {phoneSubmitting ? "Verifying..." : "Verify & Sign In"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setPhoneStep("number"); setOtp(""); setPhoneError(null); }}
                          className="w-full text-sm text-gray-500 hover:underline"
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
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">
                      First name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-belims-blue focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">
                      Last name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-belims-blue focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-belims-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-belims-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-belims-blue focus:outline-none"
                  />
                </div>

                {error && (
                  <div className="rounded border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="rounded border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700">
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded bg-belims-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-belims-accent disabled:opacity-60"
                >
                  {isSubmitting ? "Please wait..." : "Create account"}
                </button>
              </form>
            )}

            {googleError && (
              <div className="mt-4 rounded border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                {googleError}
              </div>
            )}

            {isFirebaseConfigured() && (
              <>
                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <p className="text-xs font-medium text-gray-500">Or continue with</p>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                  <div className="space-y-3">
                    <button
                      type="button"
                      disabled={googleLoading}
                      onClick={handleGoogleSignIn}
                      className="flex w-full items-center justify-center gap-2 rounded border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 disabled:opacity-60"
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
                      className="flex w-full items-center justify-center gap-2 rounded border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 disabled:opacity-60"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
                        <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
                      </svg>
                      <span>{facebookLoading ? "Signing in..." : "Continue with Facebook"}</span>
                    </button>
                  </div>
                </>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};
