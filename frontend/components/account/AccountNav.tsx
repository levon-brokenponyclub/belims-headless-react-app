import React from "react";
import { Link } from "react-router-dom";
import { Heart, LogOut, MapPin, Package, Home, User } from "lucide-react";

export type AccountTab = "dashboard" | "orders" | "addresses" | "details" | "wishlist";

const ITEMS: { id: AccountTab; label: string; Icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }> }[] = [
  { id: "dashboard", label: "Dashboard", Icon: Home },
  { id: "orders", label: "Orders", Icon: Package },
  { id: "addresses", label: "Addresses", Icon: MapPin },
  { id: "details", label: "Account details", Icon: User },
  { id: "wishlist", label: "Wishlist", Icon: Heart },
];

interface AccountNavProps {
  active: AccountTab;
  wishlistCount: number;
  onLogout: () => void;
  onNavigate?: (tab: AccountTab) => void;
  /** "rail" = vertical card (lg+), "strip" = horizontal scroller inside the band (<lg). */
  variant: "rail" | "strip";
}

export const AccountNav: React.FC<AccountNavProps> = ({ active, wishlistCount, onLogout, onNavigate, variant }) => {
  const rail = variant === "rail";
  const base = rail
    ? "flex min-h-[44px] items-center gap-3 border-l-4 px-4 py-2.5 font-bold transition-colors"
    : "flex min-h-[44px] shrink-0 items-center gap-2 border-b-4 px-4 font-bold transition-colors";
  const idle = rail
    ? "border-transparent text-text-secondary hover:bg-surface-muted hover:text-belims-blue"
    : "border-transparent text-white/80 hover:text-white";
  const current = rail ? "border-primary bg-surface-muted text-belims-blue" : "border-primary text-white";

  const links = ITEMS.map(({ id, label, Icon }) => {
    const isCurrent = id === active;
    return (
      <Link
        key={id}
        to={`/account/${id}`}
        aria-current={isCurrent ? "page" : undefined}
        onClick={() => onNavigate?.(id)}
        className={`${base} ${isCurrent ? current : idle}`}
      >
        <Icon size={rail ? 20 : 18} aria-hidden={true} />
        <span>{label}</span>
        {id === "wishlist" && wishlistCount > 0 && (
          <span
            className={`${rail ? "ml-auto" : ""} grid h-5 min-w-5 place-items-center rounded-sm px-1 text-xs font-bold ${
              rail ? "bg-belims-blue text-white" : "bg-white text-belims-blue"
            }`}
          >
            <span className="sr-only">{wishlistCount} saved</span>
            <span aria-hidden="true">{wishlistCount}</span>
          </span>
        )}
      </Link>
    );
  });

  const logout = (
    <button
      type="button"
      onClick={onLogout}
      className={`${base} ${rail ? "mt-2 w-full border-t border-t-border border-l-transparent text-text-secondary hover:bg-surface-muted hover:text-primary" : `${idle}`}`}
    >
      <LogOut size={rail ? 20 : 18} aria-hidden={true} />
      <span>Sign out</span>
    </button>
  );

  return (
    <nav aria-label="Account" className={rail ? "overflow-hidden rounded-md border border-border bg-white py-2" : "-mx-4 flex overflow-x-auto px-4"}>
      {rail ? (
        <div className="flex flex-col">
          {links}
          {logout}
        </div>
      ) : (
        <>
          {links}
          {logout}
        </>
      )}
    </nav>
  );
};
