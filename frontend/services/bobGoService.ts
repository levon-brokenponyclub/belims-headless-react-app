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
    id?: string | number;
    sku?: string;
    quantity: number;
    grams?: number;
  }>;
}

interface ShippingRate {
  service_code: string;
  service_name: string;
  total_price: number;
  expected_delivery_date?: string;
}
// Directly call the CMS WordPress REST API (BobGo/uAfrica plugin)
const API_BASE_URL = "https://cms.belims.co.za/wp-json/belims/v1";

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
    const response = await fetch(`${API_BASE_URL}/shipping/calculate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        destination: {
          country: params.destination_address.country || "ZA",
          state: params.destination_address.province || "",
          city: params.destination_address.city,
          postcode: params.destination_address.postal_code,
          address1: params.destination_address.street || "",
          address2: "",
        },
        items: params.items,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch shipping rates");
    }

    const data = await response.json();

    if (
      !data.success ||
      !Array.isArray(data.rates) ||
      data.rates.length === 0
    ) {
      throw new Error("No shipping rates available for this address");
    }

    // Map backend rates (label/cost) to frontend ShippingRate shape
    const mappedRates: ShippingRate[] = data.rates.map((rate: any) => {
      const min = rate.min_delivery_date;
      const max = rate.max_delivery_date;

      let expected: string | undefined;
      if (min && max) {
        expected = min === max ? min : `${min} - ${max}`;
      }

      return {
        service_code: rate.service_code || rate.id,
        service_name: rate.label,
        total_price: Number(rate.cost),
        expected_delivery_date: expected,
      };
    });

    console.log("Received shipping rates:", mappedRates);
    return mappedRates;
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
