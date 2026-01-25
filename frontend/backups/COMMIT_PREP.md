# Commit Preparation - 2025-11-26

## Summary of Changes
This commit addresses the following user requests:
1.  **Mega Menu Refactor**: Full-width layout, improved positioning, and correct categorization.
2.  **Archive Page**: New filtered product grid with sorting and category navigation.
3.  **Category Logic**: Recursive filtering so parent categories (e.g., "Tools and Machinery") show products from subcategories (e.g., "Power Tools").
4.  **Price Formatting**: Standardized all price displays to 2 decimal places (e.g., `R99.00`).

## Modified Files
- `components/Archive.tsx`: Added recursive category filtering logic.
- `components/Header.tsx`: Updated Mega Menu structure, added search/category handlers, fixed price formatting.
- `components/ProductCard.tsx`: Fixed price formatting.
- `components/SingleProduct.tsx`: Fixed price formatting in sticky bar.
- `components/CartDrawer.tsx`: Fixed price formatting for items and subtotal.
- `App.tsx`: Added routing for Archive page.
- `constants.ts`: Updated product data (previously).

## Build Status
- `npm run build`: **SUCCESS**
- No lint errors remaining.

## Ready for Commit
The codebase is stable and ready to be committed to the repository.
