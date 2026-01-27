// User Authentication and Account Management Service
// Integrates with WordPress user system via REST API

import { getApiBaseUrl } from "./wooCommerceService";

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
  registered_date: string;
}

export interface RegisterParams {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface LoginParams {
  email: string;
  password: string;
}

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
      credentials: "include", // Important: send cookies for auth
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Registration failed");
    }

    const data = await response.json();
    return data;
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
  const apiBase = getApiBaseUrl();

  try {
    const response = await fetch(`${apiBase}/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Login failed");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

/**
 * Get current logged-in user
 */
export const getCurrentUser = async (): Promise<UserData | null> => {
  const apiBase = getApiBaseUrl();

  try {
    const response = await fetch(`${apiBase}/users/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
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
  const apiBase = getApiBaseUrl();

  try {
    const response = await fetch(`${apiBase}/users/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
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
 * Logout user (clears session)
 */
export const logoutUser = async (): Promise<void> => {
  const apiBase = getApiBaseUrl();

  try {
    await fetch(`${apiBase}/users/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    console.error("Logout error:", error);
  }
};
