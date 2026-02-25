import React, { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginUser, registerUser, UserData } from "../services/authService";

interface AuthPageProps {
  mode: "login" | "register";
  onSuccess: (user: UserData) => void;
  showToast: (message: string, type: "success" | "error") => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  mode,
  onSuccess,
  showToast,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isRegisterMode = mode === "register";

  const defaultRole = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get("type");
    return type === "trade" ? "contractor" : "customer";
  }, [location.search]);

  const [role, setRole] = useState<"customer" | "contractor">(defaultRole);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setRole(defaultRole);
  }, [defaultRole]);

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
          role,
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
      const errorMsg =
        err?.message || "Something went wrong. Please try again.";
      setError(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setIsSubmitting(false);
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
              <a href="/" className="inline-flex">
                <img
                  alt="logo"
                  src="https://cdn-tailgrids.b-cdn.net/3.0/logo/tailgrids-logo.svg"
                  className="h-8 w-auto"
                />
              </a>
              <p className="mt-6 text-lg font-semibold leading-relaxed">
                Beautifully crafted Tailwind CSS UI components, blocks and
                templates.
              </p>
            </div>

            <p className="mt-12 text-sm text-gray-300">
              You can also contact us via{" "}
              <a
                href="mailto:support@tailgrids.com"
                className="font-semibold text-white underline underline-offset-2"
              >
                support@tailgrids.com
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
                    <Link
                      to="/login"
                      className="font-semibold text-belims-blue"
                    >
                      Log in here
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    Welcome back. Don’t have an account?{" "}
                    <Link
                      to="/register"
                      className="font-semibold text-belims-blue"
                    >
                      Create one
                    </Link>
                    .
                  </>
                )}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegisterMode && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Account type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole("customer")}
                      className={`px-4 py-2 rounded border text-sm font-semibold transition-colors ${
                        role === "customer"
                          ? "border-belims-blue bg-belims-blue/10 text-belims-blue"
                          : "border-gray-200 text-gray-600 hover:border-belims-blue"
                      }`}
                    >
                      Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("contractor")}
                      className={`px-4 py-2 rounded border text-sm font-semibold transition-colors ${
                        role === "contractor"
                          ? "border-belims-accent bg-belims-accent/10 text-belims-accent"
                          : "border-gray-200 text-gray-600 hover:border-belims-accent"
                      }`}
                    >
                      Contractor
                    </button>
                  </div>
                </div>
              )}

              {isRegisterMode && (
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
              )}

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

              {isRegisterMode && (
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
              )}

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
                {isSubmitting
                  ? "Please wait..."
                  : isRegisterMode
                    ? "Create account"
                    : "Sign In"}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <p className="text-xs font-medium text-gray-500">
                Or continue with
              </p>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="space-y-3">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                >
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  ></path>
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  ></path>
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  ></path>
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  ></path>
                </svg>
                <span>Continue with Google</span>
              </button>

              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M14.94 5.19A4.38 4.38 0 0 0 16 2a4.44 4.44 0 0 0-3 1.52 4.17 4.17 0 0 0-1 3.09 3.69 3.69 0 0 0 2.94-1.42zm2.52 7.44A4.51 4.51 0 0 1 19 16.5a10.88 10.88 0 0 1-1.36 2.74c-.8 1.15-1.64 2.31-3 2.33s-1.65-.77-3.09-.77-1.87.74-3.05.79-2.19-1.16-3-2.33a11.38 11.38 0 0 1-2.12-5.87c0-3.45 2.24-5.27 4.44-5.27 1.17 0 2.14.77 2.86.77s1.8-.85 3.17-.85a4.28 4.28 0 0 1 3.61 1.84 4.19 4.19 0 0 0-2 3.52z"></path>
                </svg>
                <span>Continue with Apple</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
