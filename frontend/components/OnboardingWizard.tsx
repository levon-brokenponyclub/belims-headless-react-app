
import React, { useState } from 'react';
import { Sparkles, ArrowRight, Briefcase, User, X, Loader2, Check } from 'lucide-react';
import { getPersonalizedRecommendations } from '../services/geminiService';
import { Product } from '../types';
import { ProductCard } from './ProductCard';

interface OnboardingWizardProps {
  onClose: () => void;
  onNavigateToProduct: (product: Product) => void;
  addToCart: (product: Product) => void;
  onCompare?: (product: Product) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onClose, onNavigateToProduct, addToCart, onCompare }) => {
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState<'personal' | 'business'>('personal');
  const [projectDesc, setProjectDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Product[]>([]);

  const handleFinish = async () => {
    setLoading(true);
    setStep(3); // Loading view
    const results = await getPersonalizedRecommendations(userType, projectDesc);
    setRecommendations(results);
    setLoading(false);
    setStep(4); // Results view
  };

  if (step === 4) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fadeIn">
        <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
           <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-belims-blue text-white">
             <div>
               <h2 className="text-2xl font-bold font-heading flex items-center gap-2"><Sparkles className="text-belims-accent"/> Recommended for You</h2>
               <p className="text-blue-200 text-sm">Based on your project: "{projectDesc}"</p>
             </div>
             <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={24} /></button>
           </div>
           <div className="p-8 bg-gray-50 overflow-y-auto flex-1">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {recommendations.map(product => (
                 <div key={product.id} className="transform hover:-translate-y-1 transition-transform duration-300">
                   <ProductCard 
                     product={product} 
                     addToCart={addToCart} 
                     onClick={(p) => {
                       onNavigateToProduct(p);
                       onClose();
                     }}
                     onCompare={onCompare}
                   />
                 </div>
               ))}
             </div>
           </div>
           <div className="p-4 bg-white border-t flex justify-end">
             <button onClick={onClose} className="text-gray-500 font-bold hover:text-belims-blue">Continue Shopping</button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden relative min-h-[400px] flex flex-col">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
          <X size={24} />
        </button>

        {/* Progress Bar */}
        <div className="h-1.5 bg-gray-100 w-full">
          <div 
            className="h-full bg-belims-blue transition-all duration-500" 
            style={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
          />
        </div>

        <div className="p-8 flex-1 flex flex-col justify-center">
          
          {step === 1 && (
            <div className="animate-fadeIn">
               <h2 className="text-3xl font-bold text-gray-900 mb-2 font-heading text-center">Welcome to Belims.</h2>
               <p className="text-gray-500 text-center mb-8">To help us serve you better, tell us how you are shopping today.</p>
               
               <div className="grid grid-cols-2 gap-4">
                 <button 
                   onClick={() => { setUserType('personal'); setStep(2); }}
                   className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-lg hover:border-belims-blue hover:bg-blue-50 transition-all group"
                 >
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-white text-gray-600 group-hover:text-belims-blue">
                      <User size={32} />
                    </div>
                    <span className="font-bold text-lg text-gray-800 font-heading">Personal</span>
                    <span className="text-xs text-gray-500 mt-1">DIY & Home Projects</span>
                 </button>

                 <button 
                   onClick={() => { setUserType('business'); setStep(2); }}
                   className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-lg hover:border-belims-blue hover:bg-blue-50 transition-all group"
                 >
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-white text-gray-600 group-hover:text-belims-blue">
                      <Briefcase size={32} />
                    </div>
                    <span className="font-bold text-lg text-gray-800 font-heading">Business</span>
                    <span className="text-xs text-gray-500 mt-1">Contractor & Bulk</span>
                 </button>
               </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fadeIn">
               <h2 className="text-2xl font-bold text-gray-900 mb-2 font-heading">What are you working on?</h2>
               <p className="text-gray-500 mb-6">Describe your project, and our AI will recommend the right tools.</p>
               
               <textarea 
                 className="w-full border border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-belims-blue outline-none h-32 resize-none font-sans text-lg mb-6"
                 placeholder="e.g. I'm building a wooden deck in my backyard..."
                 value={projectDesc}
                 onChange={(e) => setProjectDesc(e.target.value)}
                 autoFocus
               />

               <button 
                 onClick={handleFinish}
                 disabled={!projectDesc.trim()}
                 className="w-full bg-belims-blue text-white py-4 rounded-lg font-bold font-heading flex items-center justify-center gap-2 hover:bg-belims-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
               >
                 Find My Tools <ArrowRight size={20} />
               </button>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center justify-center animate-fadeIn py-12">
               <Loader2 size={64} className="text-belims-blue animate-spin mb-6" />
               <h3 className="text-xl font-bold text-gray-800 font-heading">Analyzing your project...</h3>
               <p className="text-gray-500">Finding the best matches from our catalog.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
