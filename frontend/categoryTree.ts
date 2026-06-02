import { CategoryNode } from "./types";
import { fetchCategories } from "./services/wooCommerceService";

// Temporary static category tree - will be replaced by API data
let CATEGORY_TREE: CategoryNode[] = [];

/**
 * Convert WooCommerce category structure to CategoryNode format
 */
const convertToHierarchy = async (): Promise<CategoryNode[]> => {
  try {
    const wcCategories = await fetchCategories();

    // Map to build parent > child > child child structure
    const categoryMap = new Map<string, any>();
    const rootCategories: any[] = [];

    // First pass: create all category nodes
    wcCategories.forEach((cat: any) => {
      categoryMap.set(cat.slug, {
        id: cat.slug,
        label: cat.name,
        slug: cat.slug,
        parent: cat.parent || null,
        children: [],
      });
    });

    // Second pass: build hierarchy
    wcCategories.forEach((cat: any) => {
      const node = categoryMap.get(cat.slug);
      if (cat.parent && categoryMap.has(cat.parent)) {
        // Add as child to parent
        const parent = categoryMap.get(cat.parent);
        parent.children.push(node);
      } else {
        // Top-level category
        rootCategories.push(node);
      }
    });

    // Clean up children arrays (remove if empty)
    const cleanupNode = (node: any): CategoryNode => {
      const cleaned: CategoryNode = {
        id: node.id,
        label: node.label,
      };
      if (node.children && node.children.length > 0) {
        cleaned.children = node.children.map(cleanupNode);
      }
      return cleaned;
    };

    const HIDDEN_SLUGS = new Set(["uncategorised", "uncategorized"]);
    return rootCategories
      .filter((cat) => !HIDDEN_SLUGS.has(cat.id?.toLowerCase()))
      .map(cleanupNode);
  } catch (error) {
    console.error("Failed to fetch category hierarchy:", error);
    // Return fallback static categories
    return getFallbackCategories();
  }
};

/**
 * Fallback static categories if API fails
 */
const getFallbackCategories = (): CategoryNode[] => {
  const CATEGORY_PATHS: string[] = [
    "Welding & Soldering > MIG Welding",
    "Welding & Soldering > TIG Welding",
    "Welding & Soldering > Arc Welding",
    "Hand Tools > Hammers & Mallets",
    "Hand Tools > Screwdrivers",
    "Hand Tools > Wrenches",
    "Power Tools > Drills & Drivers",
    "Power Tools > Saws",
    "Power Tools > Sanders",
  ];

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  type NodeMap = Map<string, { id: string; label: string; children: NodeMap }>;

  const root: NodeMap = new Map();

  for (const path of CATEGORY_PATHS) {
    const segments = path
      .split(">")
      .map((segment) => segment.trim())
      .filter(Boolean);
    const slugParts: string[] = [];
    let level: NodeMap = root;

    for (const segment of segments) {
      slugParts.push(slugify(segment));
      if (!level.has(segment)) {
        level.set(segment, {
          id: slugParts.join("__"),
          label: segment,
          children: new Map(),
        });
      }
      level = level.get(segment)!.children;
    }
  }

  const toArray = (map: NodeMap): CategoryNode[] =>
    Array.from(map.values()).map((node) => ({
      id: node.id,
      label: node.label,
      ...(node.children.size ? { children: toArray(node.children) } : {}),
    }));

  return toArray(root);
};

/**
 * Initialize category tree from API
 */
export const initializeCategoryTree = async (): Promise<CategoryNode[]> => {
  if (CATEGORY_TREE.length === 0) {
    CATEGORY_TREE = await convertToHierarchy();
  }
  return CATEGORY_TREE;
};

// Export the tree (will be empty until initialized)
export { CATEGORY_TREE };
