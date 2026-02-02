import React from "react";
import { OrderDetailsView } from "./OrderDetailsView";

export const AdminOrderPreview: React.FC = () => {
  const sampleOrder = {
    orderNumber: "54879",
    date: "March 22, 2021",
    total: "$83.16",
    subtotal: "$72",
    shipping: "$5",
    tax: "$6.16",
    items: [
      {
        id: 1,
        name: "Nomad Tumbler",
        price: "$35.00",
        quantity: 1,
        description:
          "This durable and portable insulated tumbler will keep your beverage at the perfect temperature during your next adventure.",
        image:
          "https://tailwindcss.com/plus-assets/img/ecommerce-images/confirmation-page-03-product-01.jpg",
        status: "Preparing to ship",
        statusDate: "March 24, 2021",
        address: ["Floyd Miles", "7363 Cynthia Pass", "Toronto, ON N3Y 4H8"],
        email: "f•••@example.com",
        phone: "1•••••••••40",
      },
      {
        id: 2,
        name: "Minimalist Wristwatch",
        price: "$149.00",
        quantity: 1,
        description:
          "This contemporary wristwatch has a clean, minimalist look and high quality components.",
        image:
          "https://tailwindcss.com/plus-assets/img/ecommerce-images/confirmation-page-03-product-02.jpg",
        status: "Shipped",
        statusDate: "March 23, 2021",
        address: ["Floyd Miles", "7363 Cynthia Pass", "Toronto, ON N3Y 4H8"],
        email: "f•••@example.com",
        phone: "1•••••••••40",
      },
    ],
    billingAddress: ["Floyd Miles", "7363 Cynthia Pass", "Toronto, ON N3Y 4H8"],
    payment: {
      type: "Visa",
      last4: "4242",
      expires: "02 / 24",
    },
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="bg-belims-blue text-white py-4 px-8 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <h2 className="text-xl font-bold font-heading">Admin Order Preview</h2>
        <div className="flex gap-4 items-center">
          <span className="text-sm bg-blue-800 px-3 py-1 rounded-full border border-blue-600">
            Preview Mode
          </span>
          <button
            onClick={() => window.history.back()}
            className="text-sm font-semibold hover:underline"
          >
            Back
          </button>
        </div>
      </div>
      <OrderDetailsView {...sampleOrder} />
    </div>
  );
};
