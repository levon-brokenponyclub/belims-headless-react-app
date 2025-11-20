
import React, { useState, useEffect, useRef } from 'react';
import { Star, ShoppingCart, Truck, Store, Heart, Share2, ChevronRight, ChevronDown, Minus, Plus, Check, Sparkles, Scale, ShieldCheck, X, ArrowLeft, ArrowRight, Images, RefreshCw, Package, Zap, CirclePlus } from 'lucide-react';
import { Product } from '../types';
import { CURRENCY_SYMBOL, STORES } from '../constants';
import { StockBar } from './StockBar';
import { DeliveryOptionsModal } from './DeliveryOptionsModal';
import { generateProductDescription } from '../services/geminiService';
import { addToRecentlyViewed } from '../services/storageService';
import { RecentlyViewed } from './RecentlyViewed';
import { StoreLocator } from './StoreLocator';
import { BundlePanel } from './BundlePanel';
import ReactMarkdown from 'react-markdown';

interface SingleProductProps {
  product: Product;
  addToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onBack: () => void;
  onCompare: (product: Product) => void;
  onPriceMatch: (product: Product) => void;
  onProductClick: (product: Product) => void;
}

export const SingleProduct: React.FC<SingleProductProps> = ({ product, addToCart, onBuyNow, onBack, onCompare, onPriceMatch, onProductClick }) => {
  const [mainImage, setMainImage] = useState(product.image);
  const [qty, setQty] = useState(1);
  const [selectedTab, setSelectedTab] = useState<'desc' | 'specs'>('desc');
  const [aiDescription, setAiDescription] = useState<string | null>(null);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  
  // Sticky Bar Logic
  const [isStickyExpanded, setIsStickyExpanded] = useState(false);
  const rightBuyBoxRef = useRef<HTMLDivElement>(null);
  
  // Gallery Modal State
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  
  // Store Locator State
  const [isLocatorOpen, setIsLocatorOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState(STORES[0]);

  // Delivery Modal State
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

  // Bundle Panel State
  const [isBundleOpen, setIsBundleOpen] = useState(false);
  const [isBundleSectionExpanded, setIsBundleSectionExpanded] = useState(false); // Accordion state
  const [showBundleTrigger, setShowBundleTrigger] = useState(false);

  useEffect(() => {
    addToRecentlyViewed(product);
    setMainImage(product.image);
    setQty(1);
    setAiDescription(null);
    setIsBundleSectionExpanded(false); // Reset accordion on product change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [product]);

  // Scroll Observer to trigger Left Sticky Bar Expansion
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const isBelow = entry.boundingClientRect.top < 100; 
        // Expand sticky bar if scrolled past
        setIsStickyExpanded(!entry.isIntersecting && isBelow);
        
        // Show bundle trigger if scrolled past and product has bundles
        if (product.bundleCandidates && product.bundleCandidates.length > 0) {
          setShowBundleTrigger(!entry.isIntersecting && isBelow);
        }
      },
      { threshold: 0.1, rootMargin: "-100px 0px 0px 0px" }
    );

    if (rightBuyBoxRef.current) {
      observer.observe(rightBuyBoxRef.current);
    }

    return () => observer.disconnect();
  }, [product]);

  const gallery = product.images && product.images.length > 0 ? product.images : [product.image];

  const handleAddToCart = () => {
    for(let i = 0; i < qty; i++) {
      addToCart(product);
    }
  };

  const handleBuyNowAction = () => {
     // For Buy Now, we usually just add 1 item or the current qty
     // If current qty > 1, add all? Assume yes.
     for(let i = 0; i < qty; i++) {
       addToCart(product); 
     }
     // Trigger the open cart logic handled by App.tsx via onBuyNow wrapper, 
     // but here onBuyNow usually takes product. We can implement it simpler:
     // Just call the prop with the product, assuming prop handles cart add + open.
     // But wait, if I call onBuyNow, it adds ONE item. 
     // Let's trust the prop does the right thing for a "Buy Now" flow (Add 1 item & Checkout).
     onBuyNow(product);
  };

  const handleGenerateDescription = async () => {
    setGeneratingDesc(true);
    const desc = await generateProductDescription(product);
    setAiDescription(desc);
    setGeneratingDesc(false);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = gallery.indexOf(mainImage);
    const nextIndex = (currentIndex + 1) % gallery.length;
    setMainImage(gallery[nextIndex]);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = gallery.indexOf(mainImage);
    const prevIndex = (currentIndex - 1 + gallery.length) % gallery.length;
    setMainImage(gallery[prevIndex]);
  };

  return (
    <div className="animate-fadeIn relative">
      
      {/* Full Screen Gallery Modal */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-[80] bg-black/95 flex flex-col items-center justify-center p-4 animate-fadeIn">
          <button 
            onClick={() => setIsGalleryOpen(false)}
            className="absolute top-6 right-6 text-white hover:text-gray-300 z-50"
          >
            <X size={32} />
          </button>
          
          <div className="relative w-full max-w-5xl h-[70vh] flex items-center justify-center">
            {gallery.length > 1 && (
              <button onClick={handlePrevImage} className="absolute left-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50">
                <ArrowLeft size={32} />
              </button>
            )}
            <img src={mainImage} alt={product.name} className="max-w-full max-h-full object-contain" />
            {gallery.length > 1 && (
              <button onClick={handleNextImage} className="absolute right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50">
                <ArrowRight size={32} />
              </button>
            )}
          </div>

          <div className="mt-8 flex gap-4 overflow-x-auto max-w-full p-2 no-scrollbar">
            {gallery.map((img, idx) => (
              <button 
                key={idx}
                onClick={() => setMainImage(img)}
                className={`w-20 h-20 rounded-lg border-2 overflow-hidden transition-all flex-shrink-0 ${mainImage === img ? 'border-belims-blue opacity-100' : 'border-transparent opacity-50 hover:opacity-80'}`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          <div className="text-white mt-4 font-bold font-heading text-lg">
            {gallery.indexOf(mainImage) + 1} / {gallery.length}
          </div>
        </div>
      )}

      {/* Store Locator Modal */}
      {isLocatorOpen && (
        <StoreLocator 
          currentStore={selectedStore}
          onSelectStore={(store) => {
            setSelectedStore(store);
            setIsLocatorOpen(false);
          }}
          onClose={() => setIsLocatorOpen(false)}
          checkingProduct={product}
        />
      )}

      {/* Delivery Options Modal */}
      {isDeliveryModalOpen && (
        <DeliveryOptionsModal onClose={() => setIsDeliveryModalOpen(false)} />
      )}

      {/* Bundle Panel */}
      {product.bundleCandidates && (
        <BundlePanel 
          isOpen={isBundleOpen} 
          onClose={() => setIsBundleOpen(false)}
          mainProduct={product}
          candidates={product.bundleCandidates}
          addToCart={addToCart}
        />
      )}

      {/* Floating Bundle Trigger (Visible on Scroll) */}
      {showBundleTrigger && (
        <button 
          onClick={() => setIsBundleOpen(true)}
          className="fixed bottom-24 right-4 z-40 bg-belims-accent text-white px-6 py-3 rounded-full shadow-xl font-bold font-heading flex items-center gap-2 animate-bounce hover:bg-orange-600 transition-colors"
        >
          <Package size={20} /> Bundle & Save
        </button>
      )}

      {/* Breadcrumbs */}
      <div className="text-sm text-gray-500 mb-6 flex items-center gap-2">
        <span className="cursor-pointer hover:text-belims-blue" onClick={onBack}>Home</span>
        <ChevronRight size={14} />
        <span className="cursor-pointer hover:text-belims-blue">{product.category}</span>
        <ChevronRight size={14} />
        <span className="font-bold text-gray-900 line-clamp-1">{product.name}</span>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 items-start relative">
        
        {/* LEFT COLUMN: Sticky Image + Overlapping Sticky Control Box */}
        <div className="lg:col-span-7 sticky top-24 h-[calc(100vh-120px)] flex flex-col relative z-30">
          
          {/* Image Container */}
          <div className="flex-1 bg-white border border-gray-200 rounded-xl relative group cursor-zoom-in shadow-sm overflow-hidden flex flex-col">
            
            {/* Gallery Trigger (Top Left) */}
            <button 
              onClick={() => setIsGalleryOpen(true)}
              className="absolute top-4 left-4 bg-white/90 backdrop-blur text-gray-800 px-4 py-2 rounded-full shadow-md hover:bg-belims-blue hover:text-white transition-all z-20 flex items-center gap-2 text-sm font-bold font-heading hover:scale-105"
            >
              <Images size={16} /> View Gallery {gallery.length > 1 ? `(+${gallery.length - 1})` : ''}
            </button>

            {/* Main Image */}
            <div className="w-full h-full flex items-center justify-center p-8 pb-40"> 
                <img 
                  src={mainImage} 
                  alt={product.name} 
                  className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105" 
                  onClick={() => setIsGalleryOpen(true)}
                />
            </div>

            {/* STICKY OVERLAP BAR (Bottom Aligned) */}
            <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-xl border border-gray-200 shadow-2xl p-5 z-30 transition-all duration-500">
               
               {/* EXPANDABLE SECTION: Brand, Title, Price, Stock */}
               {/* Only visible when right column buy box is scrolled out */}
               <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isStickyExpanded ? 'max-h-[200px] opacity-100 mb-3 border-b border-gray-100 pb-3' : 'max-h-0 opacity-0'}`}>
                 <div className="flex flex-wrap items-center justify-between gap-4">
                   <div>
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">{product.brand}</div>
                      <h3 className="font-bold text-gray-900 font-heading text-base line-clamp-1">{product.name}</h3>
                   </div>
                   <div className="text-right">
                     <div className="text-2xl font-extrabold text-belims-blue font-heading">{CURRENCY_SYMBOL}{product.price.toLocaleString()}</div>
                   </div>
                 </div>
                 <div className="mt-3 w-32 hidden sm:block">
                    <StockBar current={product.stock} max={product.maxStock} />
                 </div>
               </div>

               {/* PERSISTENT SECTION: Controls & Fulfillment */}
               <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    {/* Quantity */}
                    <div className="flex items-center border border-gray-300 rounded-lg bg-gray-50 h-11">
                      <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 hover:bg-gray-200 text-gray-600 h-full rounded-l-lg"><Minus size={16} /></button>
                      <div className="w-8 text-center font-bold text-sm">{qty}</div>
                      <button onClick={() => setQty(Math.min(product.stock, qty + 1))} className="px-3 hover:bg-gray-200 text-gray-600 h-full rounded-r-lg"><Plus size={16} /></button>
                    </div>

                    {/* Add to Cart */}
                    <button 
                      onClick={handleAddToCart}
                      disabled={product.stock === 0}
                      className="flex-1 bg-belims-blue text-white font-bold text-sm h-11 rounded-lg shadow-md hover:bg-belims-light transition-all active:scale-95 font-heading flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <ShoppingCart size={18} /> {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                  </div>

                  {/* Buy Now Button */}
                  <button 
                    onClick={handleBuyNowAction}
                    disabled={product.stock === 0}
                    className="w-full bg-belims-accent text-white font-bold text-sm h-11 rounded-lg shadow-md hover:bg-orange-600 transition-all active:scale-95 font-heading flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Zap size={18} fill="currentColor" /> {product.stock > 0 ? 'Buy Now' : 'Out of Stock'}
                  </button>

                  {/* Fulfillment Status (Compact Line) */}
                  <div className="flex gap-4 text-[10px] font-bold text-gray-500 justify-center sm:justify-start items-center pt-1">
                    <span 
                        className="flex items-center gap-1 hover:text-belims-blue cursor-pointer"
                        onClick={() => setIsLocatorOpen(true)}
                    >
                        <Store size={12} /> Pick Up Available
                    </span>
                    <span 
                        className="flex items-center gap-1 hover:text-belims-blue cursor-pointer"
                        onClick={() => setIsDeliveryModalOpen(true)}
                    >
                        <Truck size={12} /> Delivery Available
                    </span>
                  </div>
               </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Content (Scrollable) */}
        <div className="lg:col-span-5 flex flex-col gap-8 pb-24 pt-4">
           
           {/* Header Info */}
           <div>
             <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider font-heading">{product.brand}</div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 font-heading leading-tight">{product.name}</h1>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                   <button className="p-2 rounded-full bg-gray-100 hover:bg-red-50 hover:text-belims-accent transition-colors"><Heart size={20} /></button>
                   <button className="p-2 rounded-full bg-gray-100 hover:bg-blue-50 hover:text-belims-blue transition-colors"><Share2 size={20} /></button>
                </div>
             </div>
             
             <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                <div className="flex items-center gap-3">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={18} fill={i < Math.round(product.rating) ? "currentColor" : "none"} />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-gray-500 hover:text-belims-blue cursor-pointer underline decoration-dotted">{product.reviews} Reviews</span>
                </div>
                <div className="text-xs text-gray-400 font-mono">SKU: {product.sku || 'N/A'}</div>
             </div>
           </div>

           {/* RIGHT COLUMN BUY BOX (Scroll Target) */}
           <div ref={rightBuyBoxRef} className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                   <div>
                      <div className="text-3xl font-extrabold text-belims-blue font-heading">{CURRENCY_SYMBOL}{product.price.toLocaleString()}</div>
                      {product.isBundle && <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded mt-1 inline-block">Bundle Savings</span>}
                   </div>
                </div>

                {/* Fulfillment Options: Side-by-Side Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                   
                   {/* PICK UP CARD */}
                   <div 
                     className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-belims-blue hover:bg-blue-50/50 transition-all shadow-sm relative group flex flex-col justify-between h-full"
                     onClick={() => setIsLocatorOpen(true)}
                   >
                      <div className="flex items-center gap-2 mb-2">
                         <div className="p-1.5 bg-blue-50 text-belims-blue rounded-full">
                           <Store size={16} />
                         </div>
                         <h4 className="font-bold text-gray-900 font-heading text-sm">Pick Up</h4>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">Check availability at nearby stores</p>
                      <div className="text-xs font-bold text-belims-blue flex items-center gap-1 mt-auto">
                        Select Store <ChevronRight size={12} />
                      </div>
                   </div>
                   
                   {/* DELIVERY CARD */}
                   <div 
                     className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-belims-blue hover:bg-blue-50/50 transition-all shadow-sm relative group flex flex-col justify-between h-full"
                     onClick={() => setIsDeliveryModalOpen(true)}
                   >
                      <div className="flex items-center gap-2 mb-2">
                         <div className="p-1.5 bg-gray-100 text-gray-600 rounded-full group-hover:bg-blue-100 group-hover:text-belims-blue transition-colors">
                           <Truck size={16} />
                         </div>
                         <h4 className="font-bold text-gray-900 font-heading text-sm">Delivery</h4>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">Free for orders &gt; {CURRENCY_SYMBOL}1,000</p>
                      <div className="text-[10px] text-green-600 font-bold flex items-center gap-1 mt-auto">
                         Earliest: Tomorrow
                      </div>
                   </div>
                </div>
                
                <StockBar current={product.stock} max={product.maxStock} />
                
                <div className="space-y-3 mt-6 mb-4">
                  <div className="flex gap-4">
                     <div className="flex items-center border border-gray-300 rounded-lg bg-white h-12 shadow-sm">
                        <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 hover:bg-gray-100 text-gray-600 h-full rounded-l-lg"><Minus size={18} /></button>
                        <div className="w-10 text-center font-bold text-base">{qty}</div>
                        <button onClick={() => setQty(Math.min(product.stock, qty + 1))} className="px-3 hover:bg-gray-100 text-gray-600 h-full rounded-r-lg"><Plus size={18} /></button>
                     </div>
                     <button 
                       onClick={handleAddToCart}
                       disabled={product.stock === 0}
                       className="flex-1 bg-belims-blue text-white font-bold text-base h-12 rounded-lg shadow-md hover:bg-belims-light transition-all active:scale-95 font-heading flex items-center justify-center gap-2 disabled:opacity-50"
                     >
                       <ShoppingCart size={20} /> {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                     </button>
                  </div>
                  <button 
                    onClick={() => handleBuyNowAction(product)}
                    disabled={product.stock === 0}
                    className="w-full bg-belims-accent text-white font-bold text-base h-12 rounded-lg shadow-md hover:bg-orange-600 transition-all active:scale-95 font-heading flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Zap size={20} /> Buy Now
                  </button>
                </div>
           </div>

           {/* Bundle Section - Outside Buy Block with Blue Theme */}
           {product.bundleCandidates && product.bundleCandidates.length > 0 && (
             <div className="mb-8">
               <div className="rounded-xl border transition-all duration-300 border-belims-blue bg-blue-50">
                 <div className="p-5 flex items-center justify-between cursor-pointer" onClick={() => setIsBundleSectionExpanded(!isBundleSectionExpanded)}>
                   <div className="flex items-center gap-3">
                     <div className="bg-blue-100 p-2 rounded-lg text-belims-blue">
                       <Package size={24} />
                     </div>
                     <div>
                       <h3 className="font-bold text-gray-900 font-heading text-lg leading-none">Bundle & Save</h3>
                       <p className="text-xs text-gray-500 mt-1">Add accessories to unlock up to 10% off.</p>
                     </div>
                   </div>
                   <div className={`transform transition-transform duration-300 text-belims-blue ${isBundleSectionExpanded ? 'rotate-180' : ''}`}>
                     <ChevronDown size={24} />
                   </div>
                 </div>
                 {isBundleSectionExpanded && (
                   <div className="overflow-hidden transition-all duration-300 ease-in-out border-t border-blue-100">
                     <div className="p-5 pt-2">
                       <div className="flex items-center gap-3 mb-5 overflow-x-auto no-scrollbar pb-2">
                         <div className="relative w-16 h-16 bg-white rounded-lg border border-gray-200 p-1 flex-shrink-0 shadow-sm">
                           <img alt="" className="w-full h-full object-contain" src={product.image} />
                           <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full p-0.5">
                             <Check size={10} strokeWidth={3} />
                           </div>
                         </div>
                         <CirclePlus size={20} className="text-gray-300 flex-shrink-0" />
                         {product.bundleCandidates.slice(0, 3).map((item) => (
                           <div key={item.id} className="w-16 h-16 bg-white rounded-lg border border-dashed border-gray-300 p-1 flex-shrink-0 opacity-80 hover:opacity-100 transition-opacity">
                             <img alt="" className="w-full h-full object-contain" src={item.image} />
                           </div>
                         ))}
                       </div>
                       <button 
                         onClick={() => setIsBundleOpen(true)}
                         className="w-full bg-white text-belims-blue border-2 border-belims-blue py-2.5 rounded-lg font-bold hover:bg-belims-blue hover:text-white transition-colors font-heading shadow-sm"
                       >
                         Customize Your Bundle
                       </button>
                     </div>
                   </div>
                 )}
               </div>
             </div>
           )}

           {/* STICKY COMPARE BUTTONS */}
           {/* Uses CSS sticky to stay under the header when scrolling */}
           <div className="sticky top-24 z-20 bg-white/95 backdrop-blur py-4 -my-2 border-b border-gray-100">
               <div className="flex gap-3">
                  <button 
                    onClick={() => onCompare(product)}
                    className="flex-1 text-sm font-bold text-gray-700 hover:text-belims-blue hover:border-belims-blue bg-white px-4 py-3 rounded-lg border border-gray-200 shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Scale size={18} /> Compare
                  </button>
                  <button 
                    onClick={() => onPriceMatch(product)}
                    className="flex-1 text-sm font-bold text-belims-blue hover:text-white hover:bg-belims-blue bg-blue-50 px-4 py-3 rounded-lg border border-blue-100 shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <ShieldCheck size={18} /> Price Match
                  </button>
               </div>
           </div>

           {/* Description & Tabs */}
           <div>
             <div className="flex border-b border-gray-200 mb-6">
               <button 
                className={`pb-3 px-4 font-bold text-sm transition-colors border-b-2 ${selectedTab === 'desc' ? 'border-belims-blue text-belims-blue' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                onClick={() => setSelectedTab('desc')}
               >
                 Product Details
               </button>
               <button 
                className={`pb-3 px-4 font-bold text-sm transition-colors border-b-2 ${selectedTab === 'specs' ? 'border-belims-blue text-belims-blue' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                onClick={() => setSelectedTab('specs')}
               >
                 Specs
               </button>
             </div>

             <div className="min-h-[200px] text-gray-700 leading-relaxed text-base">
               {selectedTab === 'desc' ? (
                 <div className="animate-fadeIn space-y-6">
                   
                   <p className="text-gray-600 text-lg leading-relaxed">{product.description}</p>

                   {/* AI Summary Enhanced */}
                   <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-xl p-6 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-100 rounded-full -mr-10 -mt-10 opacity-50"></div>
                      
                      <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="flex items-center gap-2">
                           <div className="bg-white p-1.5 rounded shadow-sm">
                             <Sparkles size={18} className="text-purple-600"/> 
                           </div>
                           <span className="font-bold text-purple-900 font-heading">Gemini AI Summary</span>
                        </div>
                        
                        {(aiDescription || !generatingDesc) && (
                          <button 
                            onClick={handleGenerateDescription}
                            className="text-xs flex items-center gap-1 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-full font-bold transition-all shadow-sm"
                            title="Regenerate Description"
                          >
                            <RefreshCw size={12} className={generatingDesc ? "animate-spin" : ""} />
                            {aiDescription ? 'Regenerate' : 'Generate'}
                          </button>
                        )}
                      </div>
                      
                      {generatingDesc ? (
                          <div className="space-y-3 animate-pulse">
                              <div className="h-4 bg-purple-200 rounded w-3/4"></div>
                              <div className="h-4 bg-purple-200 rounded w-full"></div>
                              <div className="h-4 bg-purple-200 rounded w-5/6"></div>
                          </div>
                      ) : aiDescription ? (
                          <div className="prose prose-purple prose-sm max-w-none relative z-10">
                             <ReactMarkdown>{aiDescription}</ReactMarkdown>
                          </div>
                      ) : (
                          <div className="text-center py-4">
                            <p className="text-sm text-purple-800 mb-3">Get a professional, AI-generated breakdown of why this product is perfect for your project.</p>
                            <button onClick={handleGenerateDescription} className="text-sm font-bold text-white bg-purple-600 px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow">
                              Generate Summary
                            </button>
                          </div>
                      )}
                      
                      {aiDescription && <div className="mt-4 text-[10px] text-purple-400 font-medium border-t border-purple-100 pt-2 flex items-center gap-1">
                        <Sparkles size={10} /> Generated by Google Gemini AI
                      </div>}
                   </div>

                   {product.features && (
                     <div className="bg-gray-50 rounded-xl p-6">
                        <h4 className="font-bold text-gray-900 mb-4 font-heading text-lg">Key Features</h4>
                        <ul className="space-y-3">
                            {product.features.map((f, i) => (
                              <li key={i} className="flex items-start gap-3 text-gray-700">
                                <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                                <span>{f}</span>
                              </li>
                            ))}
                        </ul>
                     </div>
                   )}
                 </div>
               ) : (
                 <div className="bg-gray-50 rounded-xl p-6 animate-fadeIn border border-gray-200">
                    {product.specifications ? (
                      <table className="w-full text-sm">
                        <tbody>
                          {product.specifications.map((spec, idx) => (
                            <tr key={idx} className="border-b border-gray-200 last:border-0 hover:bg-gray-100 transition-colors">
                              <td className="py-3 px-2 font-bold text-gray-600 w-1/3 align-top">{spec.label}</td>
                              <td className="py-3 px-2 text-gray-900 font-medium">{spec.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-gray-500 italic text-center py-8">No technical specifications available.</p>
                    )}
                 </div>
               )}
             </div>
           </div>

           {/* Returns Policy */}
           <div className="border-t border-gray-200 pt-6">
              <h4 className="font-bold text-gray-900 mb-2 font-heading">Returns Policy</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                14-Day returns with the option of a refund, repair, or replacement. Available online or at your nearest Belims store. 
                <a href="#" className="text-belims-blue font-bold hover:underline ml-1">Learn more</a>
              </p>
           </div>

        </div>
      </div>
      
      {/* Recently Viewed Section */}
      <RecentlyViewed 
        addToCart={addToCart} 
        onProductClick={(p) => {
          onProductClick(p);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onCompare={onCompare}
        currentProductId={product.id}
      />
    </div>
  );
};
