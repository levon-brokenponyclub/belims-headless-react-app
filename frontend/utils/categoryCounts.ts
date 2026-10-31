import { CategoryNode, Product } from "../types";

const normalise = (value: string) => value.trim().toLowerCase();

const subtreeLabels = (node: CategoryNode): string[] => [
  normalise(node.label),
  ...(node.children ?? []).flatMap(subtreeLabels),
];

/** Products whose (leaf) category sits anywhere in the node's subtree. */
export const productsInCategory = (node: CategoryNode, products: Product[]): Product[] => {
  const labels = new Set(subtreeLabels(node));
  return products.filter((p) => p.category && labels.has(normalise(p.category)));
};

/** Product count per category id (slug), from the loaded catalogue. */
export const buildCategoryCounts = (
  tree: CategoryNode[],
  products: Product[],
): Map<string, number> => {
  const perLabel = new Map<string, number>();
  products.forEach((p) => {
    if (!p.category) return;
    const key = normalise(p.category);
    perLabel.set(key, (perLabel.get(key) || 0) + 1);
  });

  // Count unique labels per subtree: some children repeat their parent's name (e.g. "Tool Sets" > "Tool Sets").
  const counts = new Map<string, number>();
  const visit = (node: CategoryNode) => {
    const labels = new Set(subtreeLabels(node));
    let total = 0;
    labels.forEach((label) => (total += perLabel.get(label) || 0));
    counts.set(node.id, total);
    (node.children ?? []).forEach(visit);
  };
  tree.forEach(visit);
  return counts;
};
