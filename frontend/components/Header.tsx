
import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search, ShoppingCart, MapPin, User, ChevronDown, X, Heart, LayoutGrid, Sparkles, ArrowRight, Scale } from 'lucide-react';
import { Store, Category, CartItem, Product } from '../types';
import { CATEGORIES, QUICK_LINKS, CURRENCY_SYMBOL, FEATURED_PRODUCTS, DEALS_PRODUCTS } from '../constants';

interface HeaderProps {
  selectedStore: Store | null;
  cartItems: CartItem[];
  toggleCart: () => void;
  toggleStoreLocator: () => void;
  onOpenPaintAssistant: () => void;
  onProductClick?: (product: Product) => void;
  onCompare?: (product: Product) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  selectedStore, 
  cartItems, 
  toggleCart, 
  toggleStoreLocator, 
  onOpenPaintAssistant,
  onProductClick,
  onCompare
}) => {
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{categories: Category[], products: Product[]} | null>(null);
  
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Predictive Search Logic
  useEffect(() => {
    if (searchQuery.length > 1) {
      const lowerQuery = searchQuery.toLowerCase();
      const allProducts = [...FEATURED_PRODUCTS, ...DEALS_PRODUCTS];
      
      const matchedCats = CATEGORIES.filter(c => c.name.toLowerCase().includes(lowerQuery) || c.subcategories.some(s => s.toLowerCase().includes(lowerQuery)));
      const matchedProds = allProducts.filter(p => p.name.toLowerCase().includes(lowerQuery) || p.category.toLowerCase().includes(lowerQuery));
      setSearchResults({ categories: matchedCats, products: matchedProds });
    } else {
      setSearchResults(null);
    }
  }, [searchQuery]);

  const handleProductSelect = (product: Product) => {
    if (onProductClick) onProductClick(product);
    setSearchQuery(''); // Clear search
    setSearchResults(null);
  };

  return (
    <header className="sticky top-0 z-50 font-sans shadow-md">
      
      {/* Primary Blue Bar (Walmart Style) */}
      <div className="bg-belims-blue text-white py-3">
        <div className="container mx-auto px-4 flex items-center gap-4 md:gap-6">
          
          {/* Mobile Menu Trigger */}
          <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <Menu size={24} />
          </button>

          {/* Logo */}
          <div className="flex items-center gap-1 cursor-pointer flex-shrink-0 mr-2" onClick={() => window.location.reload()}>
             <img 
               src="https://staging.belims.co.za/wp-content/uploads/2023/03/belims-logo.png" 
               alt="Belims Hardware" 
               className="h-8 md:h-10 object-contain" 
             />
          </div>

          {/* Pickup/Delivery Button */}
          <div 
            className="hidden lg:flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-full py-2 px-4 cursor-pointer transition-colors border border-transparent hover:border-white/20"
            onClick={toggleStoreLocator}
          >
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0 text-belims-blue">
               <MapPin size={18} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-xs font-semibold text-white font-heading">Pickup or delivery</span>
              <span className="text-sm font-bold text-white truncate max-w-[140px] font-heading">
                {selectedStore ? selectedStore.address.split(',')[0] : 'Select Store'}
              </span>
            </div>
            <ChevronDown size={14} className="text-white" />
          </div>

          {/* Search Bar (Pill Shape) with Predictive Dropdown */}
          <div className="flex-1 relative group">
            <input 
              type="text" 
              placeholder="Search everything at Belims..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full py-2.5 pl-5 pr-12 text-black text-sm focus:outline-none focus:ring-2 focus:ring-belims-accent shadow-sm font-medium"
            />
            <button className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-belims-blue p-2 rounded-full text-white hover:bg-belims-light transition-colors">
              <Search size={18} />
            </button>

            {/* Search Results Dropdown */}
            {searchResults && (searchResults.categories.length > 0 || searchResults.products.length > 0) && (
              <div className="absolute top-full left-0 right-0 bg-white rounded-lg shadow-xl mt-2 border border-gray-200 overflow-hidden z-50">
                {searchResults.categories.length > 0 && (
                  <div className="p-2 bg-gray-50">
                    <h4 className="text-xs font-bold text-gray-500 uppercase px-2 mb-1 font-heading">Categories</h4>
                    {searchResults.categories.map(c => (
                      <div key={c.id} className="px-2 py-1.5 hover:bg-white hover:text-belims-blue cursor-pointer rounded text-sm font-medium flex justify-between items-center">
                        {c.name}
                        <ChevronDown size={12} className="-rotate-90 text-gray-300" />
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.products.length > 0 && (
                  <div className="p-2">
                    <h4 className="text-xs font-bold text-gray-500 uppercase px-2 mb-1 mt-1 font-heading">Products</h4>
                    {searchResults.products.map(p => (
                      <div 
                        key={p.id} 
                        className="px-2 py-2 hover:bg-gray-50 cursor-pointer rounded flex gap-3 items-center group"
                        onClick={() => handleProductSelect(p)}
                      >
                        <img src={p.image} className="w-10 h-10 object-contain rounded bg-white border border-gray-100" alt="" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-gray-800 truncate font-heading group-hover:text-belims-blue">{p.name}</div>
                          <div className="text-xs text-gray-500">{p.category}</div>
                        </div>
                        <div className="text-sm font-bold text-belims-blue">{CURRENCY_SYMBOL}{p.price}</div>
                        
                        {/* Add Compare Button to Search Results */}
                        {onCompare && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onCompare(p);
                            }}
                            className="p-1.5 rounded-full hover:bg-belims-blue hover:text-white text-gray-400 transition-colors ml-2"
                            title="Compare"
                          >
                            <Scale size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="p-3 bg-gray-50 border-t text-center">
                  <a href="#" className="text-sm font-bold text-belims-blue hover:underline flex items-center justify-center gap-1">
                    View all results <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Right Side Icons */}
          <div className="flex items-center gap-6 text-white">
            
            {/* Reorder / My Items */}
            <div className="hidden md:flex flex-col items-center cursor-pointer hover:text-gray-200 group">
              <Heart size={20} className="mb-0.5" />
              <div className="text-[11px] leading-tight font-medium">Reorder</div>
              <div className="text-sm font-bold leading-tight font-heading">My Items</div>
            </div>

            {/* Sign In / Account */}
            <div className="hidden md:flex flex-col items-center cursor-pointer hover:text-gray-200 group">
              <User size={20} className="mb-0.5" />
              <div className="text-[11px] leading-tight font-medium">Sign In</div>
              <div className="text-sm font-bold leading-tight font-heading">Account</div>
            </div>

            {/* Cart */}
            <div 
              className="flex flex-col items-center cursor-pointer relative group"
              onClick={toggleCart}
            >
              <div className="relative">
                <ShoppingCart size={24} />
                <span className="absolute -top-2 -right-2 bg-belims-accent text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-belims-blue">
                  {cartCount}
                </span>
              </div>
              <div className="text-[10px] mt-0.5 font-bold hidden md:block font-heading">{CURRENCY_SYMBOL}{cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0).toLocaleString()}</div>
            </div>

          </div>
        </div>
      </div>

      {/* Secondary Light Blue Bar (Departments / Services) */}
      <div className="bg-blue-50 border-b border-gray-200 py-2 hidden md:block shadow-inner">
        <div className="container mx-auto px-4 flex items-center gap-3 overflow-x-auto no-scrollbar">
           
           {/* Departments Button - MEGA MENU */}
           <div 
            className="flex items-center gap-2 bg-white border border-transparent hover:border-belims-blue text-belims-blue px-4 py-1.5 rounded-full cursor-pointer font-bold text-sm transition-all shadow-sm hover:shadow font-heading"
            onMouseEnter={() => setIsMegaMenuOpen(true)}
            onMouseLeave={() => setIsMegaMenuOpen(false)}
           >
             <LayoutGrid size={16} />
             Departments
             <ChevronDown size={14} />

             {/* Mega Menu Dropdown */}
             {isMegaMenuOpen && (
                <div className="absolute top-full left-0 w-[300px] md:w-[600px] lg:w-[800px] bg-white shadow-xl border border-gray-200 flex z-50 text-gray-800 rounded-lg mt-2 ml-4 overflow-hidden min-h-[400px]">
                  <div className="w-1/3 bg-gray-50 py-4 border-r border-gray-100">
                    {CATEGORIES.map(cat => (
                      <div key={cat.id} className="px-6 py-2.5 hover:bg-white hover:text-belims-blue cursor-pointer font-semibold flex justify-between items-center group text-sm font-heading">
                        {cat.name}
                        <span className="hidden group-hover:block text-belims-blue">→</span>
                      </div>
                    ))}
                    <div className="my-2 border-t border-gray-200 mx-6"></div>
                    <div className="px-6 py-2 hover:text-belims-blue cursor-pointer text-sm font-medium">Contractor Deals</div>
                    <div className="px-6 py-2 hover:text-belims-blue cursor-pointer text-sm font-medium">New Power Tools</div>
                  </div>
                  <div className="w-2/3 p-6">
                     <h4 className="font-bold text-lg mb-4 text-belims-blue font-heading">Hardware & Building</h4>
                     <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                       {['Drills & Drivers', 'Saws', 'Sanders', 'Compressors', 'Hand Tools', 'Ladders', 'Safety Gear', 'Cement & Concrete'].map(item => (
                         <a key={item} href="#" className="text-sm text-gray-600 hover:text-belims-blue hover:underline block">
                           {item}
                         </a>
                       ))}
                     </div>
                     <div className="mt-8 bg-blue-50 p-4 rounded-lg flex gap-4 items-center border border-blue-100">
                        <img src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=100&q=80" className="w-16 h-16 rounded object-cover" alt="Ad" />
                        <div>
                          <div className="font-bold text-belims-blue font-heading">Pro Services</div>
                          <div className="text-xs text-gray-600">Bulk pricing for registered contractors.</div>
                        </div>
                     </div>
                  </div>
                </div>
              )}
           </div>

           {/* Services Button */}
           <div className="flex items-center gap-2 bg-white border border-transparent hover:border-belims-blue text-belims-blue px-4 py-1.5 rounded-full cursor-pointer font-bold text-sm transition-all shadow-sm hover:shadow font-heading">
             <LayoutGrid size={16} />
             Services
             <ChevronDown size={14} />
           </div>

           {/* PAINT ASSISTANT BUTTON */}
           <button 
             onClick={onOpenPaintAssistant}
             className="flex items-center gap-2 bg-belims-accent/10 border border-belims-accent/20 text-belims-accent hover:bg-belims-accent hover:text-white px-4 py-1.5 rounded-full cursor-pointer font-bold text-sm transition-all shadow-sm hover:shadow font-heading ml-2"
           >
             <Sparkles size={16} />
             Paint Assistant
           </button>

           <div className="h-6 w-px bg-gray-300 mx-2"></div>

           {/* Quick Links */}
           {QUICK_LINKS.map((link, idx) => (
             <a key={idx} href="#" className="text-sm font-medium text-gray-700 hover:underline whitespace-nowrap px-2 hover:text-belims-blue">
               {link}
             </a>
           ))}

        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 md:hidden flex">
          <div className="w-[85%] bg-white h-full shadow-xl flex flex-col">
             <div className="p-4 bg-belims-blue text-white flex justify-between items-center">
               <div className="flex items-center gap-2">
                 <User size={20} />
                 <span className="font-bold font-heading">Sign In / Account</span>
               </div>
               <button onClick={() => setMobileMenuOpen(false)}><X /></button>
             </div>
             
             <div className="flex-1 overflow-y-auto bg-gray-50">
               {/* Mobile Store Selector */}
               <div className="bg-white p-4 mb-2 border-b border-gray-100" onClick={() => {
                 toggleStoreLocator();
                 setMobileMenuOpen(false);
               }}>
                 <div className="flex items-start gap-3">
                   <MapPin className="text-belims-blue mt-1" size={20} />
                   <div>
                     <div className="text-xs text-gray-500">Your Store</div>
                     <div className="font-bold text-belims-blue text-sm font-heading">{selectedStore ? selectedStore.name : 'Select Store'}</div>
                   </div>
                 </div>
               </div>

               {/* Mobile Paint Assistant */}
               <div className="bg-white p-4 mb-2 border-b border-gray-100" onClick={() => {
                 onOpenPaintAssistant();
                 setMobileMenuOpen(false);
               }}>
                  <div className="flex items-center gap-2 text-belims-accent font-bold font-heading">
                    <Sparkles size={18} /> Paint Assistant
                  </div>
               </div>

               <div className="bg-white py-2">
                 <div className="px-4 py-3 font-bold text-lg border-b border-gray-100 font-heading">Departments</div>
                 {CATEGORIES.map(cat => (
                   <div key={cat.id} className="px-4 py-3 border-b border-gray-100 flex justify-between items-center text-gray-700">
                     {cat.name} <ChevronDown size={16} className="-rotate-90 text-gray-400" />
                   </div>
                 ))}
               </div>
               
               <div className="bg-white mt-2 py-2">
                  <div className="px-4 py-3 font-bold text-lg border-b border-gray-100 font-heading">Help & Settings</div>
                  <div className="px-4 py-3 border-b border-gray-100 text-gray-700">Track Order</div>
                  <div className="px-4 py-3 border-b border-gray-100 text-gray-700">Help Center</div>
               </div>
             </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)}></div>
        </div>
      )}
    </header>
  );
};
