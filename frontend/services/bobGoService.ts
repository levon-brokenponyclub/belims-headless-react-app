// Basic BobGo Integration Skeleton
// Docs: https://docs.bobgo.co.za/ (Hypothetical, usually REST based)

interface ShippingQuoteParams {
  environment?: "sandbox" | "production";
  destination_address: {
    street: string;
    city: string;
    province: string;
    postal_code: string;
    country: string;
  };
  parcels: Array<{
    weight: number; // in kg
    dimensions: { length: number; width: number; height: number }; // in cm
  }>;
}

interface ShippingRate {
  service_code: string;
  service_name: string;
  total_price: number;
  expected_delivery_date?: string;
}

const BOBGO_API_URL =
  import.meta.env.VITE_BOBGO_API_URL || "https://api.bobgo.co.za/v2";
const BOBGO_API_KEY = import.meta.env.VITE_BOBGO_API_KEY;
const BOBGO_CHANNEL_ID = import.meta.env.VITE_BOBGO_CHANNEL_ID;

// Use Netlify proxy for REST API calls
const API_BASE_URL = "/api/belims/v1";

// Development/fallback free shipping option
const DEV_FREE_SHIPPING: ShippingRate = {
  service_code: "dev_free",
  service_name: "Free Shipping (Development)",
  total_price: 0,
  expected_delivery_date: new Date(
    Date.now() + 3 * 24 * 60 * 60 * 1000,
  ).toLocaleDateString("en-ZA"),
};

export const getShippingRates = async (
  params: ShippingQuoteParams,
): Promise<ShippingRate[]> => {
  console.log("Fetching shipping rates for:", params);

  try {
    const response = await fetch(`${API_BASE_URL}/shipping/rates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...params,
        environment: "sandbox", // force sandbox on headless checkout
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch shipping rates");
    }

    const data = await response.json();

    if (!data.success || !data.rates || data.rates.length === 0) {
      throw new Error("No shipping rates available for this address");
    }

    console.log("Received shipping rates:", data.rates);
    return data.rates;
  } catch (error) {
    console.error("Error fetching shipping rates:", error);

    // Fallback: Check if we're in development/localhost
    if (isLocalhost()) {
      console.warn("Using fallback free shipping for development environment");
      return [DEV_FREE_SHIPPING];
    }

    throw error;
  }
};

/**
 * Check if running on localhost
 */
function isLocalhost(): boolean {
  return (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.endsWith(".local"))
  );
}

/**
 * Get fallback shipping (for testing without BobGo)
 */
export const getFallbackShipping = (): ShippingRate[] => {
  return [DEV_FREE_SHIPPING];
};
