import { useEffect, useState } from "react";
import type { Order } from "../types";
import { fetchCustomerOrders } from "../services/wooCommerceService";
import { sortOrdersNewestFirst } from "../components/account/orderStatus";

/** The signed-in customer's orders, newest first. `signedIn` gates the request. */
export const useCustomerOrders = (signedIn: boolean) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!signedIn) {
      setOrders([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchCustomerOrders()
      .then((result: unknown) => {
        if (!cancelled) setOrders(Array.isArray(result) ? sortOrdersNewestFirst(result as Order[]) : []);
      })
      .catch((error: unknown) => {
        console.error("Failed to load orders:", error);
        if (!cancelled) setOrders([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  return { orders, loading };
};
