import React from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";

interface OrderItem {
  id: string | number;
  name: string;
  price: string;
  quantity: number;
  description: string;
  category?: string;
  image: string;
  status: string;
  statusDate: string;
  address: string[];
  email: string;
  phone: string;
}

interface OrderDetailsProps {
  orderNumber: string;
  date: string;
  total: string;
  subtotal: string;
  shipping: string;
  tax: string;
  items: OrderItem[];
  billingAddress: string[];
  payment: {
    type: string;
    last4: string;
    expires: string;
  };
}

export const OrderDetailsView: React.FC<OrderDetailsProps> = ({
  orderNumber,
  date,
  total,
  subtotal,
  shipping,
  tax,
  items,
  billingAddress,
  payment,
}) => {
  const navigate = useNavigate();

  return (
    <main className="bg-gray-50">
      <div className="container mx-auto px-4 py-10 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <section className="bg-white rounded-lg border border-black/10 p-8 flex flex-col items-center text-center shadow-sm">
            <div className="h-16 w-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center text-white">
                <Check size={28} strokeWidth={3} />
              </div>
            </div>
            <h1 className="mt-6 text-2xl font-semibold text-gray-900">
              Thank You For Your Order!
            </h1>
            <p className="mt-2 text-sm text-gray-600 max-w-sm">
              Your order has been successfully placed. We have sent a
              confirmation to your email.
            </p>
            <div className="mt-8 w-full max-w-sm space-y-3">
              <button
                type="button"
                onClick={() => navigate("/shop")}
                className="w-full rounded bg-belims-blue px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-belims-blue/90 transition-colors"
              >
                Continue Shopping
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="w-full rounded border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back to home
              </button>
            </div>
          </section>

          <section className="space-y-5">
            <div className="bg-white rounded-lg border border-black/10 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Order Summary
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Your Order ID:{" "}
                    <span className="text-gray-900">#{orderNumber}</span>
                  </p>
                </div>
                <p className="text-xs text-gray-500">{date}</p>
              </div>

              <ul className="mt-5 divide-y divide-gray-100">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center gap-4 py-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      className="h-14 w-14 rounded-lg object-cover bg-gray-100"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">
                        {item.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {item.category || "Uncategorized"}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {item.price}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-lg border border-black/10 p-6 shadow-sm">
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-900">
                    {subtotal}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Shipping</span>
                  <span className="font-semibold text-gray-900">
                    {shipping}
                  </span>
                </li>
              </ul>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">
                  Total
                </span>
                <span className="text-base font-semibold text-gray-900">
                  {total}
                </span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="bg-white rounded-lg border border-black/10 p-5 shadow-sm">
                <div className="h-9 w-9 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M15.085 9.47001C15.085 11.1738 13.7038 12.555 12 12.555C10.2962 12.555 8.91504 11.1738 8.91504 9.47001C8.91504 7.76621 10.2962 6.38501 12 6.38501C13.7038 6.38501 15.085 7.76621 15.085 9.47001Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M18.7219 9.47206C18.7219 14.6995 14.7426 19.1274 12.9155 20.885C12.4055 21.3756 11.629 21.3766 11.1176 20.8874C9.28193 19.1315 5.27783 14.7019 5.27783 9.47206C5.27783 5.75957 8.2874 2.75 11.9999 2.75C15.7124 2.75 18.7219 5.75957 18.7219 9.47206Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h4 className="mt-3 text-sm font-semibold text-gray-900">
                  Shipping Address
                </h4>
                <p className="mt-2 text-xs text-gray-600">
                  {billingAddress.filter(Boolean).join(" ")}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-black/10 p-5 shadow-sm">
                <div className="h-9 w-9 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 8H18.5C19.3284 8 20 8.67157 20 9.5V18.5C20 19.3284 19.3284 20 18.5 20H5.5C4.67157 20 4 19.3284 4 18.5V8ZM4 8V5.5C4 4.67157 4.67157 4 5.5 4H16C16.8284 4 17.5 4.67157 17.5 5.5V8M20 12H16.75C15.9216 12 15.25 12.6716 15.25 13.5V14.5C15.25 15.3284 15.9216 16 16.75 16H20"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h4 className="mt-3 text-sm font-semibold text-gray-900">
                  Payment Info
                </h4>
                <p className="mt-2 text-xs text-gray-600">
                  {payment.type} Ending {payment.last4}
                  <br />
                  Expires {payment.expires}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};
