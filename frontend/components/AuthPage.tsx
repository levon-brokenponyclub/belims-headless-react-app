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
    <div className="min-h-[70vh] bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-lg shadow-sm p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 font-heading">
              {isRegisterMode ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {isRegisterMode
                ? "Register as a customer or contractor to access the store."
                : "Log in to access your account and trade pricing."}
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
                <p className="text-xs text-gray-500">
                  Contractors can access trade pricing after approval.
                </p>
              </div>
            )}

            {isRegisterMode && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    First name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-belims-blue"
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
                    className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-belims-blue"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-belims-blue"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-belims-blue"
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
                  className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-belims-blue"
                />
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded">
                {error}
              </div>
            )}
            {success && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-100 px-3 py-2 rounded">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-2 bg-belims-blue text-white font-semibold rounded hover:bg-belims-accent transition-colors text-sm disabled:opacity-60"
            >
              {isRegisterMode ? "Create account" : "Log in"}
            </button>
          </form>

          <div className="mt-6 text-sm text-gray-600 text-center">
            {isRegisterMode ? (
              <>
                Already have an account?{" "}
                <Link to="/login" className="text-belims-blue font-semibold">
                  Log in
                </Link>
              </>
            ) : (
              <>
                Don’t have an account?{" "}
                <Link to="/register" className="text-belims-blue font-semibold">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
