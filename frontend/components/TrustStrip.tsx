import React, { useEffect, useState } from "react";
import { RotateCcw, ShieldCheck, Store, Truck, type LucideIcon } from "lucide-react";
import { fetchEcommercePolicies } from "../services/wooCommerceService";

interface EcommercePolicies {
  return_policy?: string;
  warranty?: string;
  shipping?: string;
  store_locations?: { name?: string; address?: string }[];
}

interface TrustItem {
  icon: LucideIcon;
  title: string;
  body: string;
}

// Policy fields are WP editor HTML — render as text only.
const toPlainText = (html = "") =>
  (new DOMParser().parseFromString(html, "text/html").body.textContent || "")
    .replace(/\s+/g, " ")
    .trim();

const buildItems = (policies: EcommercePolicies): TrustItem[] => {
  const stores = (policies.store_locations || []).filter((s) => s?.name);
  const storeBody =
    stores.length === 1
      ? [stores[0].name, toPlainText(stores[0].address)]
          .filter(Boolean)
          .join(" — ")
      : stores.length > 1
        ? `${stores.length} stores — ${stores.map((s) => s.name).join(", ")}`
        : "";

  return [
    { icon: Truck, title: "Delivery & collection", body: toPlainText(policies.shipping) },
    { icon: RotateCcw, title: "Returns", body: toPlainText(policies.return_policy) },
    { icon: ShieldCheck, title: "Warranty", body: toPlainText(policies.warranty) },
    { icon: Store, title: stores.length > 1 ? "Visit our stores" : "Visit our store", body: storeBody },
  ].filter((item) => item.body);
};

export const TrustStrip: React.FC = () => {
  const [items, setItems] = useState<TrustItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    fetchEcommercePolicies<EcommercePolicies>()
      .then((policies) => {
        if (isMounted) setItems(buildItems(policies || {}));
      })
      .catch(() => {
        if (isMounted) setItems([]);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="border-t border-border" aria-label="Shopping with Belims">
      <ul className="container mx-auto grid grid-cols-1 px-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, body }) => (
          <li
            key={title}
            className="flex items-start gap-3 border-b border-border py-6 last:border-b-0 sm:px-4 lg:border-b-0 lg:border-r lg:last:border-r-0"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border border-belims-blue text-belims-blue">
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span>
              <span className="block font-heading text-[15px] font-bold leading-5 text-text">{title}</span>
              <span className="mt-1 block text-sm leading-5 text-text-secondary line-clamp-2">{body}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};
