# React Router Implementation Guide

## Installation

```bash
npm install react-router-dom
```

## Key Changes

### 1. App.tsx Structure

The app is restructured with:

- **BrowserRouter** wrapping the entire app
- **Routes** and **Route** components for different pages
- Extracted HomePage component
- ProductPage wrapper for /product/:id
- ArchivePage wrapper for /shop and /shop/:categorySlug
- Checkout route at /checkout

### 2. Route Structure

```
/ → HomePage
/product/:id → ProductPage (SingleProduct wrapper)
/shop → ArchivePage (all products)
/shop/:categorySlug → ArchivePage (filtered by category)
/checkout → Checkout
```

### 3. Navigation Changes

**Replace callback props with useNavigate:**

- `onClick={() => navigate('/shop')}` instead of `setView('archive')`
- `onClick={() => navigate(\`/product/${id}\`)}`instead of`setActiveProduct(product); setView('product')`
- `navigate(-1)` for back button

**Use Link components:**

- Logo: `<Link to="/">` instead of onClick
- Product titles: `<Link to={/product/${id}}>`
- Category links: `<Link to={/shop/${category}}>`

### 4. URL Parameters

**Reading params:**

```tsx
const { id } = useParams(); // /product/:id
const { categorySlug } = useParams(); // /shop/:categorySlug
const [searchParams] = useSearchParams(); // ?search=query&brand=X
```

### 5. Benefits

✅ Shareable URLs (e.g., /product/123)
✅ Browser back/forward buttons work
✅ Better SEO potential
✅ Standard React routing patterns
✅ Deep linking support

## Implementation Status

The code provided is complete and ready to implement. The main files that need updating are:

1. **App.tsx** - Complete restructure with Router
2. **Header.tsx** - Update navigation to use Link/navigate
3. **ProductCard.tsx** - Make card clickable via Link
4. **SingleProduct.tsx** - Use navigate(-1) for back button

All the code has been provided in the initial request and follows React Router v6 best practices.
