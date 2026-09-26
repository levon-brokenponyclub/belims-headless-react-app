// User Authentication and Account Management Service
// Integrates with WordPress user system via JWT REST API

import { getApiBaseUrl } from "./wooCommerceService";
import { ShippingAddress } from "../types";

const TOKEN_KEY = "belims_jwt_token";

export interface UserData {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  display_name: string;
  phone: string;
  roles: string[];
  billing: {
    address_1: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  shipping?: {
    address_1: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  registered_date: string;
}

export interface RegisterParams {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role?: "customer" | "contractor";
}

export interface LoginParams {
  email: string;
  password: string;
}

/**
 * JWT token management
 */
export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearAuthToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

export const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const getJwtUrl = (): string => {
  const base = getApiBaseUrl().replace("/belims/v1", "");
  return `${base}/jwt-auth/v1/token`;
};

/**
 * Register a new user account
 */
export const registerUser = async (
  params: RegisterParams,
): Promise<{ success: boolean; user: UserData; message: string }> => {
  const apiBase = getApiBaseUrl();

  try {
    const response = await fetch(`${apiBase}/users/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Registration failed");
    }

    const data = await response.json();

    // Auto-login: obtain JWT token for the newly registered user
    const loginResult = await loginUser({
      email: params.email,
      password: params.password,
    });
    return loginResult;
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
};

/**
 * Login user
 */
export const loginUser = async (
  params: LoginParams,
): Promise<{ success: boolean; user: UserData; message: string }> => {
  try {
    // JWT Authentication plugin expects form-encoded body with "username" field
    const response = await fetch(getJwtUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        username: params.email,
        password: params.password,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.message ||
          error.data?.message ||
          "Login failed",
      );
    }

    const data = await response.json();

    // Store the JWT token for subsequent authenticated requests
    if (data.token) {
      setAuthToken(data.token);
    }

    // Fetch full user data using the new token
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Login succeeded but failed to fetch user data.");
    }

    return {
      success: true,
      user,
      message: data.message || "Login successful",
    };
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

/**
 * Get current logged-in user
 */
export const getCurrentUser = async (): Promise<UserData | null> => {
  const token = getAuthToken();
  if (!token) return null;

  const apiBase = getApiBaseUrl();

  try {
    const response = await fetch(`${apiBase}/users/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthToken();
      }
      return null;
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  updates: Partial<UserData>,
): Promise<{ success: boolean; user: UserData; message: string }> => {
  const token = getAuthToken();
  const apiBase = getApiBaseUrl();

  try {
    const response = await fetch(`${apiBase}/users/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Profile update failed");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Profile update error:", error);
    throw error;
  }
};

/**
 * Check if email already exists
 */
export const checkEmailExists = async (email: string): Promise<boolean> => {
  const apiBase = getApiBaseUrl();

  try {
    const response = await fetch(`${apiBase}/users/check-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.exists;
  } catch (error) {
    console.error("Check email error:", error);
    return false;
  }
};

/**
 * Logout user (clears local JWT token)
 */
export const logoutUser = async (): Promise<void> => {
  clearAuthToken();
};

/**
 * Convert a ShippingAddress (frontend format) to the WordPress
 * billing/shipping address format expected by the REST API.
 */
export const mapShippingAddressToWoocommerce = (
  address: ShippingAddress,
) => ({
  address_1: address.street || address.label || "",
  city: address.city || "",
  state: address.province || "",
  postcode: address.postalCode || "",
  country: address.country || "ZA",
});

/**
 * Save a billing address to the current user's WordPress profile.
 * Persists to WordPress user meta billing_* fields.
 */
export const saveBillingAddress = async (
  address: ShippingAddress,
): Promise<{ success: boolean; message: string }> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No authentication token. Please log in.");
  }

  const apiBase = getApiBaseUrl();

  const payload = {
    billing_address_1: address.street || address.label || "",
    billing_city: address.city || "",
    billing_state: address.province || "",
    billing_postcode: address.postalCode || "",
    billing_country: address.country || "ZA",
  };

  try {
    const response = await fetch(`${apiBase}/users/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to save billing address");
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message || "Billing address saved successfully",
    };
  } catch (error) {
    console.error("Save billing address error:", error);
    throw error;
  }
};

/**
 * Save a shipping address to the current user's WordPress profile.
 * Persists to WordPress user meta shipping_* fields.
 */
export const saveShippingAddress = async (
  address: ShippingAddress,
): Promise<{ success: boolean; message: string }> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No authentication token. Please log in.");
  }

  const apiBase = getApiBaseUrl();

  const payload = {
    shipping_address_1: address.street || address.label || "",
    shipping_city: address.city || "",
    shipping_state: address.province || "",
    shipping_postcode: address.postalCode || "",
    shipping_country: address.country || "ZA",
  };

  try {
    const response = await fetch(`${apiBase}/users/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to save address");
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message || "Address saved successfully",
    };
  } catch (error) {
    console.error("Save shipping address error:", error);
    throw error;
  }
};

export const clearBillingAddress = async (): Promise<{ success: boolean; message: string }> => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token. Please log in.");
  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}/users/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      billing_address_1: "",
      billing_city: "",
      billing_state: "",
      billing_postcode: "",
      billing_country: "ZA",
    }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to clear billing address");
  }
  return { success: true, message: "Billing address removed" };
};

export const clearShippingAddress = async (): Promise<{ success: boolean; message: string }> => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token. Please log in.");
  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}/users/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      shipping_address_1: "",
      shipping_city: "",
      shipping_state: "",
      shipping_postcode: "",
      shipping_country: "ZA",
    }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to clear shipping address");
  }
  return { success: true, message: "Shipping address removed" };
};

/**
 * Exchange a Firebase Google Sign-In ID token for a WordPress JWT.
 */
export const loginWithFirebaseGoogle = async (
  firebaseIdToken: string,
  email: string,
  name: string,
): Promise<{ success: boolean; user: UserData; message: string }> => {
  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}/auth/firebase-google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firebase_token: firebaseIdToken, email, name }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Google authentication failed");
  }
  const data = await response.json();
  if (data.token) setAuthToken(data.token);
  const user = await getCurrentUser();
  if (!user) throw new Error("Failed to fetch user data after Google sign-in");
  return { success: true, user, message: data.message || "Welcome!" };
};

/**
 * Send a password reset email via WordPress.
 * Requires a custom WP REST endpoint:
 *   POST /wp-json/belims/v1/users/forgot-password
 *   Body: { email: string }
 *   Response: { success: boolean, message: string }
 */
export const requestPasswordReset = async (
  email: string,
): Promise<{ success: boolean; message: string }> => {
  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}/users/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to send reset email. Please try again.");
  }
  const data = await response.json();
  return { success: true, message: data.message || "Password reset email sent." };
};

/**
 * Exchange a Firebase Phone Auth ID token for a WordPress JWT.
 *
 * Requires a custom WP REST endpoint:
 *   POST /wp-json/belims/v1/auth/firebase-phone
 *   Body: { firebase_token: string, phone: string }
 *   Response: { token: string, message: string, user_id: number }
 *
 * The WP endpoint must:
 *   1. Verify the Firebase ID token using firebase-php-jwt or the Firebase Admin SDK.
 *   2. Find or create a WP user by phone number (stored in user_meta as 'billing_phone').
 *   3. Issue a JWT via the JWT Auth plugin and return it.
 */
export const loginWithFirebasePhone = async (
  firebaseIdToken: string,
  phone: string,
): Promise<{ success: boolean; user: UserData; message: string }> => {
  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}/auth/firebase-phone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firebase_token: firebaseIdToken, phone }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Phone authentication failed");
  }
  const data = await response.json();
  if (data.token) setAuthToken(data.token);
  const user = await getCurrentUser();
  if (!user) throw new Error("Failed to fetch user data after phone login");
  return { success: true, user, message: data.message || "Welcome!" };
};
