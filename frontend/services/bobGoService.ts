// Basic BobGo Integration Skeleton
// Docs: https://docs.bobgo.co.za/ (Hypothetical, usually REST based)

interface ShippingQuoteParams {
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
    throw error;
  }
};
