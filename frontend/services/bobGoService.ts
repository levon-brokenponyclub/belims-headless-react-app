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
import { getApiBaseUrl } from "./wooCommerceService";

const API_BASE_URL = getApiBaseUrl();

// Development/fallback shipping options for local testing
const DEV_STANDARD_SHIPPING: ShippingRate = {
  service_code: "dev_standard",
  service_name: "Standard Delivery",
  total_price: 75,
  expected_delivery_date: "17 Feb - 19 Feb",
};

const DEV_NEXT_DAY_SHIPPING: ShippingRate = {
  service_code: "dev_next_day",
  service_name: "Next Day Delivery",
  total_price: 125,
  expected_delivery_date: "16 Feb",
};

const DEV_SAME_DAY_SHIPPING: ShippingRate = {
  service_code: "dev_same_day",
  service_name: "Same Day Delivery",
  total_price: 150,
  expected_delivery_date: "13 Feb",
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
      } else {
        expected =
          rate.delivery_time ||
          rate.estimated_delivery ||
          rate.eta ||
          rate.transit_time ||
          undefined;
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
      console.warn(
        "Using fallback shipping options for development environment",
      );
      return getFallbackShipping();
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
 * Get fallback shipping options for local development testing
 */
export const getFallbackShipping = (): ShippingRate[] => {
  return [DEV_STANDARD_SHIPPING, DEV_NEXT_DAY_SHIPPING, DEV_SAME_DAY_SHIPPING];
};
