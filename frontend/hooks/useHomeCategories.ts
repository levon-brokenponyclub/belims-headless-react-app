import { useEffect, useMemo, useState } from "react";
import { Product, WooCommerceCategory } from "../types";
import { fetchCategories } from "../services/wooCommerceService";

export interface HomeCategory {
  slug: string;
  name: string;
  image?: string;
}

const HIDDEN_SLUGS = new Set(["uncategorized"]);

const byCountDesc = (a: WooCommerceCategory, b: WooCommerceCategory) =>
  (b.count || 0) - (a.count || 0);

// CMS categories carry no images, so each tile borrows a real product image from its subtree.
export const useHomeCategories = (products: Product[]) => {
  const [categories, setCategories] = useState<WooCommerceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchCategories()
      .then((data) => {
        if (isMounted) setCategories(data);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return useMemo(() => {
    const childrenByParent = new Map<string, WooCommerceCategory[]>();
    categories.forEach((cat) => {
      if (!cat.parent) return;
      const key = String(cat.parent);
      childrenByParent.set(key, [...(childrenByParent.get(key) || []), cat]);
    });

    const subtreeNames = (cat: WooCommerceCategory): Set<string> => {
      const names = new Set([cat.name.trim().toLowerCase()]);
      (childrenByParent.get(cat.slug) || []).forEach((child) =>
        subtreeNames(child).forEach((name) => names.add(name)),
      );
      return names;
    };

    const imageFor = (cat: WooCommerceCategory) => {
      const names = subtreeNames(cat);
      return products.find(
        (p) => p.image && p.category && names.has(p.category.trim().toLowerCase()),
      )?.image;
    };

    const toHomeCategory = (cat: WooCommerceCategory): HomeCategory => ({
      slug: cat.slug,
      name: cat.name,
      image: imageFor(cat),
    });

    const visible = categories.filter(
      (cat) => cat.count > 0 && !HIDDEN_SLUGS.has(cat.slug),
    );
    const topLevel = visible.filter((cat) => !cat.parent).sort(byCountDesc);
    const topSlugs = new Set(topLevel.map((cat) => cat.slug));
    const secondLevel = visible
      .filter((cat) => cat.parent && topSlugs.has(String(cat.parent)))
      .sort(byCountDesc);

    return {
      departments: topLevel.map(toHomeCategory),
      subcategories: secondLevel.map(toHomeCategory),
      isLoading,
    };
  }, [categories, products, isLoading]);
};
