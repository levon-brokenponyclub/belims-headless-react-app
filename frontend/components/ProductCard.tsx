
import React from 'react';
import { Star, ShoppingCart, Scale, Zap } from 'lucide-react';
import { Product } from '../types';
import { StockBar } from './StockBar';
import { CURRENCY_SYMBOL } from '../constants';

interface ProductCardProps {
  product: Product;
  addToCart: (product: Product) => void;
  onBuyNow?: (product: Product) => void;
  onClick?: (product: Product) => void;
  onCompare?: (product: Product) => void;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, addToCart, onBuyNow, onClick, onCompare, className = "" }) => {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col h-full group overflow-hidden relative ${className}`}>

      {/* Bundle Badge */}
      {product.isBundle && (
        <div className="absolute top-3 left-0 bg-belims-accent text-white text-xs font-bold px-3 py-1 z-10 shadow-sm font-heading tracking-wide">
          BUNDLE DEAL
        </div>
      )}

      {/* Compare Button */}
      {onCompare && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCompare(product);
          }}
          className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full text-gray-500 hover:bg-belims-blue hover:text-white transition-colors shadow-sm z-10 border border-gray-100"
          title="Add to Compare"
        >
          <Scale size={18} />
        </button>
      )}

      <div
        className="relative h-48 overflow-hidden p-4 flex items-center justify-center bg-gray-50 group-hover:bg-white transition-colors cursor-pointer"
        onClick={() => onClick && onClick(product)}
      >
        <img
          src={product.image}
          alt={product.name}
          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="text-xs text-gray-500 mb-1 font-medium">{product.category}</div>
        <h3
          className="font-bold text-gray-900 text-sm md:text-base line-clamp-2 mb-2 flex-1 font-heading group-hover:text-belims-blue transition-colors cursor-pointer"
          onClick={() => onClick && onClick(product)}
        >
          {product.name}
        </h3>

        {/* Ratings */}
        <div className="flex items-center mb-2">
          <div className="flex text-yellow-400 text-xs">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={14} fill={i < Math.round(product.rating) ? "currentColor" : "none"} />
            ))}
          </div>
          <span className="text-xs text-gray-400 ml-1 font-medium">({product.reviews})</span>
        </div>

        {/* Price */}
        <div className="mb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-gray-900 font-heading">{CURRENCY_SYMBOL}{product.price.toFixed(2)}</span>
            {product.isBundle && (
              <span className="text-xs text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded">
                Save {CURRENCY_SYMBOL}{product.bundleSavings?.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Stock Bar */}
        <StockBar current={product.stock} max={product.maxStock} />

        {/* Actions: Add to Cart & Buy Now */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (product.stock > 0) addToCart(product);
            }}
            disabled={product.stock === 0}
            className={`border py-2 rounded font-bold text-xs flex items-center justify-center gap-1 transition-all font-heading ${product.stock === 0
                ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                : 'bg-white border-belims-blue text-belims-blue hover:bg-blue-50'
              }`}
          >
            <ShoppingCart size={14} />
            {product.stock > 0 ? 'Add' : 'Out of Stock'}
          </button>
          {onBuyNow && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (product.stock > 0) onBuyNow(product);
              }}
              disabled={product.stock === 0}
              className={`py-2 rounded font-bold text-xs flex items-center justify-center gap-1 transition-all font-heading shadow-sm ${product.stock === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-belims-accent text-white hover:brightness-110'
                }`}
            >
              <Zap size={14} fill="currentColor" />
              {product.stock > 0 ? 'Buy Now' : 'Out of Stock'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
