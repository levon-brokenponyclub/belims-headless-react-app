import React, { useState } from "react";
import {
  User,
  Package,
  MapPin,
  CreditCard,
  LogOut,
  Settings,
  ChevronRight,
  Clock,
  CheckCircle,
  Truck,
  PlusCircle,
} from "lucide-react";
import { UserData } from "../services/authService";
import { CURRENCY_SYMBOL } from "../constants";

interface AccountPageProps {
  user: UserData | null;
  onLogout: () => void;
}

type Tab = "dashboard" | "orders" | "addresses" | "payment" | "details";

export const AccountPage: React.FC<AccountPageProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
        <User size={48} className="text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">My Account</h2>
        <p className="text-gray-600 mb-6">
          Please log in to view your account details.
        </p>
        <a
          href="/login"
          className="bg-belims-blue text-white px-8 py-3 rounded font-bold hover:bg-belims-light transition-all"
        >
          Log In
        </a>
      </div>
    );
  }

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: <Settings size={20} /> },
    { id: "orders", label: "Orders", icon: <Package size={20} /> },
    { id: "addresses", label: "Addresses", icon: <MapPin size={20} /> },
    { id: "payment", label: "Payment Methods", icon: <CreditCard size={20} /> },
    { id: "details", label: "Account Details", icon: <User size={20} /> },
  ];

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2 bg-blue-50 text-belims-blue rounded-lg">
              <Package size={24} />
            </div>
            <h3 className="font-bold text-gray-900">Total Orders</h3>
          </div>
          <p className="text-3xl font-extrabold text-belims-blue">12</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <Clock size={24} />
            </div>
            <h3 className="font-bold text-gray-900">Active Orders</h3>
          </div>
          <p className="text-3xl font-extrabold text-green-600">2</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2 bg-orange-50 text-belims-accent rounded-lg">
              <CreditCard size={24} />
            </div>
            <h3 className="font-bold text-gray-900">Account Balance</h3>
          </div>
          <p className="text-3xl font-extrabold text-belims-accent">
            {CURRENCY_SYMBOL}0.00
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-900">Recent Orders</h3>
          <button
            onClick={() => setActiveTab("orders")}
            className="text-belims-blue text-sm font-semibold hover:underline flex items-center gap-1"
          >
            View All <ChevronRight size={16} />
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3].map((order) => (
            <div
              key={order}
              className="p-6 hover:bg-gray-50 transition-colors cursor-pointer group"
            >
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:shadow-sm transition-all">
                    <Package size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">
                      Order #7829{order}
                    </p>
                    <p className="text-sm text-gray-500">
                      March {12 + order}, 2021
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-gray-900">
                      {CURRENCY_SYMBOL}129.00
                    </p>
                    <p className="text-xs text-gray-500">2 items</p>
                  </div>
                  <div className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-100 uppercase tracking-wide">
                    {order === 1 ? "Delivered" : "Processing"}
                  </div>
                  <ChevronRight
                    size={20}
                    className="text-gray-300 group-hover:text-belims-blue transition-colors"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderOrders = () => (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="font-bold text-gray-900 text-lg">Order History</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {[1, 2, 3, 4, 5].map((order) => (
          <div
            key={order}
            className="p-6 hover:bg-gray-50 transition-colors cursor-pointer group"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                  <Package size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900">#ORD-9021{order}</p>
                    <span className="text-[10px] bg-blue-50 text-belims-blue px-2 py-0.5 rounded font-bold uppercase border border-blue-100">
                      {order % 2 === 0 ? "Express" : "Standard"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Placed on Mar {25 - order}, 2021
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-8 pt-4 sm:pt-0 border-t sm:border-0 border-gray-100">
                <div className="text-left sm:text-right">
                  <p className="text-sm font-bold text-gray-900">
                    {CURRENCY_SYMBOL}
                    {(145.5 * order).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">{order} items</p>
                </div>
                <div className="flex items-center gap-4">
                  <div
                    className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                      order === 1
                        ? "bg-green-50 text-green-700 border-green-100"
                        : order === 2
                          ? "bg-blue-50 text-blue-700 border-blue-100"
                          : "bg-gray-50 text-gray-600 border-gray-200"
                    }`}
                  >
                    {order === 1
                      ? "Delivered"
                      : order === 2
                        ? "Shipped"
                        : "Completed"}
                  </div>
                  <button className="p-2 hover:bg-white hover:shadow-sm rounded-lg border border-transparent hover:border-gray-200 text-gray-400 hover:text-belims-blue transition-all">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAddresses = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center sm:px-0 px-4">
        <h3 className="font-bold text-gray-900 text-lg">My Addresses</h3>
        <button className="bg-belims-blue text-white text-sm px-4 py-2 rounded font-bold hover:bg-belims-light transition-all flex items-center gap-2">
          <PlusCircle size={18} /> Add New
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border-2 border-belims-blue shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3">
            <span className="bg-belims-blue text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold uppercase tracking-tighter absolute top-0 right-0">
              Default
            </span>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={20} className="text-belims-blue" />
            <h4 className="font-bold text-gray-900">Primary Billing</h4>
          </div>
          <div className="text-sm text-gray-600 space-y-1 mb-6">
            <p className="font-bold text-gray-800">
              {user.first_name} {user.last_name}
            </p>
            <p>{user.billing.address_1}</p>
            <p>
              {user.billing.city}, {user.billing.state}
            </p>
            <p>{user.billing.postcode}</p>
            <p>{user.billing.country}</p>
          </div>
          <div className="flex gap-4 border-t border-gray-100 pt-4">
            <button className="text-belims-blue text-xs font-bold hover:underline uppercase tracking-wide">
              Edit Address
            </button>
            <button className="text-gray-400 text-xs font-bold hover:text-red-600 hover:underline uppercase tracking-wide">
              Delete
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:border-gray-300 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <Truck size={20} className="text-gray-400" />
            <h4 className="font-bold text-gray-900">Job Site A</h4>
          </div>
          <div className="text-sm text-gray-600 space-y-1 mb-6">
            <p className="font-bold text-gray-800">Site Foreman</p>
            <p>12 Construction Way</p>
            <p>Sandton, Johannesburg</p>
            <p>2196</p>
            <p>South Africa</p>
          </div>
          <div className="flex gap-4 border-t border-gray-100 pt-4">
            <button className="text-belims-blue text-xs font-bold hover:underline uppercase tracking-wide">
              Edit Address
            </button>
            <button className="text-gray-400 text-xs font-bold hover:text-red-600 hover:underline uppercase tracking-wide">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDetails = () => (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="font-bold text-gray-900 text-lg">Account Details</h3>
      </div>
      <div className="p-8">
        <form className="space-y-6 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                First Name
              </label>
              <input
                type="text"
                defaultValue={user.first_name}
                className="w-full border border-gray-300 rounded px-4 py-2.5 focus:border-belims-blue outline-none text-sm transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Last Name
              </label>
              <input
                type="text"
                defaultValue={user.last_name}
                className="w-full border border-gray-300 rounded px-4 py-2.5 focus:border-belims-blue outline-none text-sm transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Display Name
            </label>
            <input
              type="text"
              defaultValue={user.display_name}
              className="w-full border border-gray-300 rounded px-4 py-2.5 focus:border-belims-blue outline-none text-sm transition-colors"
            />
            <p className="text-[10px] text-gray-400 mt-1.5 italic">
              This is how your name will appear in reviews and account sections.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              defaultValue={user.email}
              className="w-full border border-gray-300 rounded px-4 py-2.5 focus:border-belims-blue outline-none text-sm transition-colors bg-gray-50 cursor-not-allowed"
              readOnly
            />
          </div>

          <div className="pt-6 border-t border-gray-100">
            <h4 className="font-bold text-gray-900 mb-6">Password Change</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  placeholder="Leave blank to keep same"
                  className="w-full border border-gray-300 rounded px-4 py-2.5 focus:border-belims-blue outline-none text-sm transition-colors"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Min. 8 characters"
                    className="w-full border border-gray-300 rounded px-4 py-2.5 focus:border-belims-blue outline-none text-sm transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Repeat password"
                    className="w-full border border-gray-300 rounded px-4 py-2.5 focus:border-belims-blue outline-none text-sm transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="bg-belims-blue text-white px-8 py-3 rounded font-bold hover:bg-belims-light transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              SAVE CHANGES
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="bg-[#f9f9f9] min-h-screen py-12 md:py-20">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Sidebar */}
          <aside className="lg:w-1/4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden sticky top-32">
              <div className="p-8 border-b border-gray-100 text-center lg:text-left">
                <div className="w-20 h-20 bg-belims-blue text-white rounded-full flex items-center justify-center mx-auto lg:mx-0 text-2xl font-bold mb-4 shadow-inner">
                  {user.first_name?.[0] || user.username[0].toUpperCase()}
                  {user.last_name?.[0]}
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {user.first_name} {user.last_name}
                </h2>
                <p className="text-sm text-gray-500 font-medium">
                  {user.email}
                </p>
                <div className="mt-3 inline-block px-2 py-0.5 bg-blue-50 text-belims-blue text-[10px] font-bold rounded uppercase tracking-wider border border-blue-100">
                  {user.roles.includes("contractor")
                    ? "Trade Account"
                    : "Standard Account"}
                </div>
              </div>

              <nav className="p-3">
                <ul className="space-y-1">
                  {menuItems.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => setActiveTab(item.id as Tab)}
                        className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-lg font-bold text-sm transition-all ${
                          activeTab === item.id
                            ? "bg-belims-blue text-white shadow-md active:scale-95"
                            : "text-gray-600 hover:bg-gray-50 hover:text-belims-blue"
                        }`}
                      >
                        <span
                          className={
                            activeTab === item.id
                              ? "text-white"
                              : "text-gray-400"
                          }
                        >
                          {item.icon}
                        </span>
                        {item.label}
                        {activeTab === item.id && (
                          <ChevronRight size={16} className="ml-auto" />
                        )}
                      </button>
                    </li>
                  ))}
                  <li className="pt-3 mt-3 border-t border-gray-100">
                    <button
                      onClick={onLogout}
                      className="w-full flex items-center gap-3 px-5 py-3.5 rounded-lg font-bold text-sm text-red-600 hover:bg-red-50 transition-all active:scale-95"
                    >
                      <LogOut size={20} className="text-red-400" />
                      Logout
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:w-3/4">
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold text-gray-900 font-heading">
                {menuItems.find((i) => i.id === activeTab)?.label}
              </h1>
              <p className="text-gray-500 mt-1">
                {activeTab === "dashboard" &&
                  `Welcome back, ${user.first_name}! Manage your account settings and orders.`}
                {activeTab === "orders" &&
                  "View and track your previous orders."}
                {activeTab === "addresses" &&
                  "Manage your billing and shipping addresses."}
                {activeTab === "payment" &&
                  "Manage your saved payment methods for faster checkout."}
                {activeTab === "details" &&
                  "Update your personal information and password."}
              </p>
            </div>

            {activeTab === "dashboard" && renderDashboard()}
            {activeTab === "orders" && renderOrders()}
            {activeTab === "addresses" && renderAddresses()}
            {activeTab === "details" && renderDetails()}
            {activeTab === "payment" && (
              <div className="bg-white p-12 text-center rounded-lg border border-gray-200 shadow-sm border-dashed">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                  <CreditCard size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  No Saved Cards
                </h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                  You haven't saved any payment methods yet. Save a card during
                  your next checkout for faster payments.
                </p>
                <button className="text-belims-blue font-bold hover:underline">
                  Add New Card
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
