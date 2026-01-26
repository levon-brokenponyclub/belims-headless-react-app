// BobGo Integration via WooCommerce Proxy
// Uses the WooCommerce shipping calculator with configured BobGo plugin

interface ShippingQuoteParams {
  destination_address: {
    street?: string;
    city: string;
    province?: string;
    postal_code: string;
    country?: string;
  };
  items?: Array<{
    product_id: number;
    quantity: number;
  }>;
}

interface ShippingRate {
  service_code: string;
  service_name: string;
  total_price: number;
  expected_delivery_date?: string;
}

// Use Netlify proxy for REST API calls (proxies to WooCommerce)
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
      body: JSON.stringify(params),
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
