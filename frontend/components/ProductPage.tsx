import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SingleProduct } from "./SingleProduct";
import { Product } from "../types";
import { fetchProducts } from "../services/wooCommerceService";

interface ProductPageProps {
  addToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onCompare: (product: Product) => void;
  onPriceMatch: (product: Product) => void;
  onProductClick: (product: Product) => void;
  products: Product[];
}

export function ProductPage({
  addToCart,
  onBuyNow,
  onCompare,
  onPriceMatch,
  onProductClick,
  products,
}: ProductPageProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);

      // First try to find in existing products
      const found = products.find((p) => p.slug === slug);

      if (found) {
        setProduct(found);
        setLoading(false);
      } else {
        // Fetch from API if not in local state
        try {
          const apiProducts = await fetchProducts();
          const apiProduct = apiProducts.find((p) => p.slug === slug);

          if (apiProduct) {
            setProduct(apiProduct);
          } else {
            console.error("Product not found:", slug);
            navigate("/");
          }
        } catch (error) {
          console.error("Error loading product:", error);
          navigate("/");
        } finally {
          setLoading(false);
        }
      }
    };

    loadProduct();
  }, [slug, products, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-belims-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <SingleProduct
      product={product}
      addToCart={addToCart}
      onBuyNow={onBuyNow}
      onBack={() => navigate("/")}
      onCompare={onCompare}
      onPriceMatch={onPriceMatch}
      onProductClick={onProductClick}
    />
  );
}
