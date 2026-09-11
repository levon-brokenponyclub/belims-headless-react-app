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
 * Save a shipping address to the current user's WordPress profile.
 * Persists to both shipping and billing address fields so checkout
 * and account views stay in sync.
 */
export const saveShippingAddress = async (
  address: ShippingAddress,
): Promise<{ success: boolean; message: string }> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No authentication token. Please log in.");
  }

  const apiBase = getApiBaseUrl();
  const woocommerceAddress = mapShippingAddressToWoocommerce(address);

  try {
    const response = await fetch(`${apiBase}/users/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        shipping: woocommerceAddress,
        billing: woocommerceAddress,
      }),
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
