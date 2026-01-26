// PayFast Payment Gateway Integration
// South African Payment Provider for WooCommerce

import { createOrder as createWooCommerceOrder } from "./wooCommerceService";
import { getApiBaseUrl } from "./wooCommerceService";

interface PaymentInitParams {
  amount: number;
  currency: string;
  orderId: string;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
}

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

interface PayFastConfig {
  merchantId: string;
  merchantKey: string;
  passPhrase?: string;
  testMode: boolean;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}

interface PayFastOrder {
  id: string;
  order_key: string;
  total: number;
  customer_email: string;
  line_items: Array<{
    product_id: number;
    product_name: string;
    quantity: number;
    total: number;
  }>;
}

// Cache PayFast config from backend
let payFastConfig: PayFastConfig | null = null;

/**
 * Fetch PayFast configuration from backend
 */
const getPayFastConfig = async (): Promise<PayFastConfig> => {
  if (payFastConfig) {
    return payFastConfig;
  }

  try {
    const apiBase = getApiBaseUrl();
    const response = await fetch(`${apiBase}/payfast/config`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch PayFast configuration");
    }

    const data = await response.json();
    payFastConfig = data;
    return data;
  } catch (error) {
    console.error("Error fetching PayFast config:", error);
    throw error;
  }
};

/**
 * Create Order in WooCommerce via Belims API
 */
export const createWooOrder = async (
  orderData: any,
): Promise<PayFastOrder | null> => {
  console.log("Creating WooCommerce Order via Belims API:", orderData);

  try {
    const result = await createWooCommerceOrder(orderData);

    if (result && result.success) {
      return {
        id: result.order_id.toString(),
        order_key: result.order_key,
        total: orderData.total || 0,
        customer_email: orderData.customer?.email || "",
        line_items:
          orderData.items?.map((item: any) => ({
            product_id: item.id,
            product_name: item.name,
            quantity: item.quantity,
            total: item.price * item.quantity,
          })) || [],
      };
    }

    return null;
  } catch (error) {
    console.error("Order creation error:", error);
    return null;
  }
};

/**
 * Initialize PayFast Payment - Returns redirect URL to PayFast
 * Frontend redirects user to this URL to complete payment
 */
export const initializePayment = async (
  params: PaymentInitParams,
): Promise<string> => {
  console.log("Initializing PayFast Payment:", params);

  try {
    const config = await getPayFastConfig();
    const apiBase = getApiBaseUrl();

    // Get payment token from backend (which handles PayFast signature)
    const response = await fetch(`${apiBase}/payfast/initiate-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order_id: params.orderId,
        amount: params.amount,
        currency: params.currency,
        customer_email: params.customerEmail,
        customer_name: params.customerName,
        customer_phone: params.customerPhone,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to initialize payment");
    }

    const data = await response.json();

    // Return the PayFast URL - frontend redirects to this
    return data.redirect_url || data.payfast_url;
  } catch (error) {
    console.error("Payment initialization error:", error);
    throw error;
  }
};

/**
 * Verify Payment Status via backend
 * Called after PayFast returns (ITN notification or user returning)
 */
export const verifyPayment = async (
  orderId: string,
): Promise<PaymentResult> => {
  try {
    const apiBase = getApiBaseUrl();
    const response = await fetch(
      `${apiBase}/payfast/verify-payment/${orderId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      return {
        success: false,
        error: "Payment verification failed",
      };
    }

    const data = await response.json();

    return {
      success: data.success,
      transactionId: data.transaction_id,
      error: data.error,
    };
  } catch (error) {
    console.error("Payment verification error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
};

/**
 * Get Payment Status (for polling or manual checks)
 */
export const getPaymentStatus = async (
  orderId: string,
): Promise<{
  status: "pending" | "paid" | "failed" | "cancelled";
  transactionId?: string;
  message?: string;
}> => {
  try {
    const apiBase = getApiBaseUrl();
    const response = await fetch(
      `${apiBase}/payfast/payment-status/${orderId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      return {
        status: "pending",
        message: "Unable to fetch payment status",
      };
    }

    const data = await response.json();
    return {
      status: data.payment_status || "pending",
      transactionId: data.transaction_id,
      message: data.message,
    };
  } catch (error) {
    console.error("Error fetching payment status:", error);
    return {
      status: "pending",
      message: "Error checking payment status",
    };
  }
};
