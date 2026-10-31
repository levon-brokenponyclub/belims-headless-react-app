import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { CategoryNode, Product } from "../types";
import { formatCurrency } from "../utils/price";
import { buildProductUrl } from "../utils/product";
import { buildCategoryCounts, productsInCategory } from "../utils/categoryCounts";

interface MegaMenuProps {
  id: string;
  isOpen: boolean;
  categoryTree: CategoryNode[];
  products: Product[];
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const categoryHref = (node: CategoryNode) => `/shop/${encodeURIComponent(node.id)}`;

// Reads the already-resolved consumer price (dealService output) — no pricing logic here.
const PreviewPrice: React.FC<{ product: Product }> = ({ product }) => {
  const consumer = product.deals_resolved?.consumer;
  const tradeOnly = consumer?.bestDeal?.type === "trade_special" || product.deals_resolved?.trade?.bestDeal?.type === "trade_special";
  if (tradeOnly) {
    return (
      <span className="block">
        <span className="block text-xs font-bold uppercase tracking-wide text-belims-blue">Trade deal</span>
        <span className="font-bold">{formatCurrency(Number(product.regular_price || product.price) || 0)}</span>
      </span>
    );
  }
  const price = consumer?.price ?? product.price;
  const compareAt = consumer?.compareAtPrice;
  return (
    <span className="block">
      <span className={`font-bold ${compareAt ? "text-primary" : ""}`}>{formatCurrency(Number(price) || 0)}</span>
      {compareAt ? <s className="ml-2 text-sm text-text-tertiary">{formatCurrency(compareAt)}</s> : null}
    </span>
  );
};

export const MegaMenu: React.FC<MegaMenuProps> = ({
  id,
  isOpen,
  categoryTree,
  products,
  onClose,
  onMouseEnter,
  onMouseLeave,
}) => {
  const counts = useMemo(() => buildCategoryCounts(categoryTree, products), [categoryTree, products]);
  const hasCounts = products.length > 0;
  // Hide empty branches once the catalogue is loaded (e.g. CMS terms with no listed products).
  const visible = (nodes: CategoryNode[] = []) =>
    hasCounts
      ? nodes.filter((n) => (counts.get(n.id) || 0) > 0).sort((a, b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0))
      : nodes;

  const departments = visible(categoryTree);
  const [deptId, setDeptId] = useState<string | null>(null);
  const [subId, setSubId] = useState<string | null>(null);
  const dept = departments.find((d) => d.id === deptId) ?? departments[0];
  const subs = visible(dept?.children);
  const sub = subs.find((s) => s.id === subId) ?? null;
  const focusNode = sub ?? dept;

  useEffect(() => {
    if (isOpen) setSubId(null);
  }, [isOpen, deptId]);

  const preview = useMemo(() => {
    if (!focusNode) return [];
    const inBranch = productsInCategory(focusNode, products);
    const picks = [
      ...inBranch.filter((p) => p.deals_resolved?.consumer?.bestDeal || p.deals_resolved?.trade?.bestDeal),
      ...inBranch.filter((p) => !(p.deals_resolved?.consumer?.bestDeal || p.deals_resolved?.trade?.bestDeal) && p.image),
    ];
    return picks.slice(0, visible(focusNode.children).length ? 3 : 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNode, products]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const pane = (e.target as HTMLElement).closest<HTMLElement>("[data-mega-pane]");
    if (!pane) return;
    const items = Array.from(pane.querySelectorAll<HTMLElement>("a[href]"));
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      (pane.nextElementSibling as HTMLElement | null)?.querySelector<HTMLElement>("a[href]")?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = pane.previousElementSibling as HTMLElement | null;
      (prev?.querySelector<HTMLElement>("[aria-current='true']") ?? prev?.querySelector<HTMLElement>("a[href]"))?.focus();
    }
  };

  const count = (node: CategoryNode) =>
    hasCounts ? <small className="font-medium text-text-tertiary">{counts.get(node.id) || 0}</small> : null;

  const row = (node: CategoryNode, active: boolean, onActivate: () => void) => (
    <li key={node.id}>
      <Link
        to={categoryHref(node)}
        onClick={onClose}
        onMouseEnter={onActivate}
        onFocus={onActivate}
        aria-current={active ? "true" : undefined}
        className={`flex min-h-11 items-center justify-between gap-2 border-l-[3px] px-4 text-base font-bold transition-colors ${
          active ? "border-primary bg-surface-muted text-primary" : "border-transparent text-text hover:bg-surface-muted"
        }`}
      >
        <span className="min-w-0 truncate">
          {node.label} {count(node)}
        </span>
        {visible(node.children).length > 0 && <ChevronRight size={16} className="shrink-0 opacity-40" aria-hidden />}
      </Link>
    </li>
  );

  const paneTitle = "px-4 pb-2 pt-1 font-heading text-sm font-bold uppercase font-condensed tracking-wide text-text-tertiary";

  return (
    <div
      id={id}
      role="region"
      aria-label="Departments"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onKeyDown={onKeyDown}
      className={`absolute inset-x-0 top-full z-[1201] hidden border-b border-border border-t-4 border-t-primary bg-surface text-text ${isOpen ? "md:block" : ""}`}
    >
      <div className="container mx-auto grid min-h-[420px] grid-cols-[260px_280px_minmax(0,1fr)] xl:grid-cols-[280px_300px_minmax(0,1fr)]">
        <div data-mega-pane className="max-h-[70vh] overflow-y-auto border-r border-border py-3">
          <h3 className={paneTitle}>Departments</h3>
          <ul>{departments.map((d) => row(d, d.id === dept?.id, () => setDeptId(d.id)))}</ul>
          <Link to="/shop" onClick={onClose} className="block px-4 py-2.5 text-base font-bold underline">
            All products
          </Link>
        </div>

        <div data-mega-pane className="max-h-[70vh] overflow-y-auto border-r border-border py-3">
          {dept && (
            <>
              <h3 className={paneTitle}>{dept.label}</h3>
              <Link to={categoryHref(dept)} onClick={onClose} className="block px-4 py-2.5 text-base font-bold underline">
                Shop all{hasCounts ? ` ${counts.get(dept.id) || 0}` : ""}
              </Link>
              <ul>{subs.map((s) => row(s, s.id === sub?.id, () => setSubId(s.id)))}</ul>
            </>
          )}
        </div>

        <div data-mega-pane className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {focusNode && (
            <>
              <h3 className="pb-3 font-heading text-h4 font-bold uppercase font-condensed">{focusNode.label}</h3>
              {visible(focusNode.children).length > 0 && (
                <ul className="mb-5 columns-2 gap-6">
                  {visible(focusNode.children).map((g) => (
                    <li key={g.id} className="break-inside-avoid">
                      <Link to={categoryHref(g)} onClick={onClose} className="block py-1.5 text-base text-text-secondary hover:text-primary">
                        {g.label} {count(g)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {preview.length > 0 && (
                <>
                  <p className="pb-3 text-sm font-bold uppercase tracking-wide text-text-tertiary">Popular here</p>
                  <ul className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                    {preview.map((p) => (
                      <li key={p.id}>
                        <Link
                          to={buildProductUrl(p)}
                          onClick={onClose}
                          className="flex h-full flex-col gap-1.5 rounded-md border border-border p-2.5 text-sm transition-colors hover:border-border-strong"
                        >
                          {p.image && <img src={p.image} alt="" loading="lazy" className="aspect-square w-full object-contain" />}
                          <span className="line-clamp-2 font-semibold">{p.name}</span>
                          <PreviewPrice product={p} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <Link to={categoryHref(focusNode)} onClick={onClose} className="mt-4 inline-block text-base font-bold underline">
                Shop all {focusNode.label}
                {hasCounts ? ` (${counts.get(focusNode.id) || 0})` : ""}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
