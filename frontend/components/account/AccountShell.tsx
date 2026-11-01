import React, { useEffect, useRef } from "react";
import { MapPin, User, Wrench } from "lucide-react";
import { AccountNav, AccountTab } from "./AccountNav";

interface AccountShellProps {
  tab: AccountTab;
  title: string;
  subtitle?: string;
  isTrade: boolean;
  /** e.g. "Durban North, 4051" — omitted when there is no saved address. */
  deliveringTo?: string;
  wishlistCount: number;
  onLogout: () => void;
  onNavigate?: (tab: AccountTab) => void;
  children: React.ReactNode;
}

/** Blue band (greeting / tab title, account type, delivery location) + nav rail (lg+) or strip (<lg) + content. */
export const AccountShell: React.FC<AccountShellProps> = ({
  tab,
  title,
  subtitle,
  isTrade,
  deliveringTo,
  wishlistCount,
  onLogout,
  onNavigate,
  children,
}) => {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Move focus to the page heading when the tab changes (not on first load).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [tab]);

  return (
    <div className="bg-white">
      <section className="bg-belims-blue text-white">
        <div className="container mx-auto max-w-[1380px] px-4 pt-6 md:pt-9">
          <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.1em] text-white/80">My account</p>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="mt-1 font-heading font-condensed text-h2 font-bold uppercase leading-none focus:outline-none md:text-h1"
              >
                {title}
              </h1>
              {subtitle && <p className="mt-2 text-white/85">{subtitle}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-sm border border-white px-2 py-0.5 text-xs font-bold uppercase tracking-wide">
                {isTrade ? <Wrench size={14} aria-hidden="true" /> : <User size={14} aria-hidden="true" />}
                {isTrade ? "Trade account" : "Standard account"}
              </span>
              {deliveringTo && (
                <span className="inline-flex items-center gap-1.5 text-base text-white/85">
                  <MapPin size={14} aria-hidden="true" /> Delivering to {deliveringTo}
                </span>
              )}
            </div>
          </div>
          <div className="lg:hidden">
            <AccountNav variant="strip" active={tab} wishlistCount={wishlistCount} onLogout={onLogout} onNavigate={onNavigate} />
          </div>
        </div>
      </section>

      <div className="container mx-auto grid max-w-[1380px] gap-8 px-4 py-6 md:py-8 lg:grid-cols-[232px_minmax(0,1fr)]">
        <div className="hidden lg:block">
          <div className="sticky top-32">
            <AccountNav variant="rail" active={tab} wishlistCount={wishlistCount} onLogout={onLogout} onNavigate={onNavigate} />
          </div>
        </div>
        <main id="account-main" className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
};
