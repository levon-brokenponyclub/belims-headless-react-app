import React from "react";
import { AccountPage } from "./AccountPage";
import { UserData } from "../services/authService";

export const AdminAccountPreview: React.FC = () => {
  // Mock trade user for preview
  const mockUser: UserData = {
    id: 123,
    username: "johndoe_trade",
    email: "john.doe@construction-pros.co.za",
    first_name: "John",
    last_name: "Doe",
    display_name: "John Doe (Contractor)",
    roles: ["contractor", "customer"],
    phone: "+27 11 555 0123",
    registered_date: "2021-03-10",
    billing: {
      address_1: "45 Industrial Avenue",
      city: "Sandton",
      state: "GP",
      postcode: "2196",
      country: "ZA",
    },
  };

  return (
    <div className="pt-8">
      <div className="bg-yellow-50 border-y border-yellow-200 py-3 px-4 text-center">
        <p className="text-yellow-800 text-sm font-medium">
          <strong>Admin Preview Mode:</strong> This is a visual preview of the
          My Account page using mock trade user data.
        </p>
      </div>
      <AccountPage
        user={mockUser}
        onLogout={() => alert("Logout clicked in preview mode")}
      />
    </div>
  );
};
