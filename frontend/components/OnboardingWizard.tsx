
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, Briefcase, User, X, Loader2, Zap, Tag, ChevronRight, BarChart3, Search, ShieldCheck, Check } from 'lucide-react';
import { getPersonalizedRecommendations } from '../services/geminiService';
import { Product } from '../types';
import { ProductCard } from './ProductCard';

interface OnboardingWizardProps {
  onClose: () => void;
  onNavigateToProduct: (product: Product) => void;
  addToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onCompare?: (product: Product) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onClose, onNavigateToProduct, addToCart, onBuyNow, onCompare }) => {
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState<'personal' | 'business'>('personal');
  const [projectDesc, setProjectDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  
  // Animation states
  const [showLanding, setShowLanding] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [featuresVisible, setFeaturesVisible] = useState(false);

  // Easy inline styles for customization
  const styles = {
    // Main container
    modalBackdrop: { backgroundColor: 'rgba(255, 255, 255, 0.3)', backdropFilter: 'blur(12px)' },
    modalContainer: { backgroundColor: '#322783', borderRadius: '24px', maxWidth: '1140px', height: '90vh', overflowY: 'hidden' as const },
    
    // Hero section
    heroTitle: { fontSize: '3rem', fontWeight: '600', color: '#ffffff', marginBottom: '16px', marginTop: '20px' },
    heroTitleAccent: { fontSize: '3rem', fontWeight: '600', lineHeight: '0.8', color: '#60a5fa', marginBottom: '24px' },
    heroSubtitle: { fontSize: '18px', color: '#d1d5db', marginBottom: '0px' },
    
    // White content section
    whiteSection: { backgroundColor: '#ffffff', borderRadius: '22px 22px 0 0', padding: '30px 30px 60px', margin: '0 24px', position: 'relative' as const, top: '30px' },
    
    // Feature cards
    featureCard: { backgroundColor: '#f9fafb', borderRadius: '16px', padding: '35px 20px', border: '1px solid #e5e7eb' },
    featureIcon: { backgroundColor: '#2563eb', borderRadius: '12px', padding: '12px' },
    featureTitle: { fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' },
    featureDescription: { fontSize: '14px', color: '#6b7280', marginBottom: '12px' },
    featureIndicator: { backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '8px', border: '1px solid #e5e7eb' },
    
    // CTA button
    ctaButton: { backgroundColor: '#f97316', color: '#ffffff', fontSize: '16px', fontWeight: '600', padding: '12px 32px', borderRadius: '12px' },
    
    // Skip button
    skipButton: { backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#9ca3af', padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.1)' }
  };

  useEffect(() => {
    // Staggered entrance animations
    const timer1 = setTimeout(() => setShowLanding(true), 300);
    const timer2 = setTimeout(() => setFeaturesVisible(true), 800);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Handle sheet animation when moving to step 2 or 3
  useEffect(() => {
    if (step === 2 || step === 3) {
      requestAnimationFrame(() => setShowSheet(true));
    } else {
      setShowSheet(false);
    }
  }, [step]);

  const handleGetStarted = () => {
    setStep(2);
  };

  const handleSelectUserType = (type: 'personal' | 'business') => {
    setUserType(type);
    // Transition to Step 3 within the same sheet context
    setStep(3);
  };

  const handleFinish = async () => {
    setLoading(true);
    const results = await getPersonalizedRecommendations(userType, projectDesc);
    setRecommendations(results);
    setLoading(false);
    setStep(4); // Results view
  };

  // ----------------------------------------------------------------------
  // STEP 4: RESULTS VIEW (Full Screen Modal)
  // ----------------------------------------------------------------------
  if (step === 4) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-fadeIn">
        <div className="bg-[#F5F5F7] w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
           <div className="p-6 md:p-8 flex justify-between items-center bg-white border-b border-gray-200">
             <div>
               <div className="text-orange-500 font-bold text-xs uppercase tracking-widest mb-1">Results</div>
               <h2 className="text-3xl font-bold font-heading text-black tracking-tight">Recommended for You</h2>
               <p className="text-gray-500 text-sm mt-1">Based on your project: <span className="italic text-gray-800">"{projectDesc}"</span></p>
             </div>
             <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors text-gray-800">
                <X size={24} />
             </button>
           </div>
           
           {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                 <Loader2 size={48} className="text-blue-600 animate-spin mb-4" />
                 <p className="text-gray-500 font-medium">Finalizing your list...</p>
              </div>
           ) : (
             <div className="p-8 overflow-y-auto flex-1">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {recommendations.map(product => (
                   <div key={product.id} className="transform hover:-translate-y-1 transition-transform duration-300 h-full">
                     <ProductCard 
                       product={product} 
                       addToCart={addToCart}
                       onBuyNow={onBuyNow} 
                       onClick={(p) => {
                         onNavigateToProduct(p);
                         onClose();
                       }}
                       onCompare={onCompare}
                       className="h-full border-none shadow-md hover:shadow-xl ring-1 ring-black/5"
                     />
                   </div>
                 ))}
               </div>
             </div>
           )}
           
           <div className="p-6 bg-white border-t border-gray-200 flex justify-between items-center">
             <button onClick={() => setStep(3)} className="text-gray-500 font-medium hover:text-black transition-colors">Back</button>
             <button onClick={onClose} className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
               Continue Shopping
             </button>
           </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // LANDING & SHEET WRAPPER
  // ----------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" style={styles.modalBackdrop}>
      <div className="w-full text-white overflow-auto font-sans shadow-2xl relative flex flex-col" style={styles.modalContainer}>
      
        {/* 
          STEP 1: BELIMS HERO LANDING
        */}
        <div 
          className={`relative flex-1 flex flex-col items-center justify-center px-8 py-6 transition-all duration-1000 ease-out ${
            step > 1 ? 'opacity-20 scale-95 blur-md' : 'opacity-100 scale-100'
          }`}
        >
          {/* Skip Button */}
          <button 
            onClick={onClose} 
            className="absolute top-8 right-8 hover:text-white transition-all duration-300 z-20 flex items-center gap-2 text-sm font-medium group"
            style={styles.skipButton}
          >
            Skip <X size={16} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>

          <div className={`max-w-6xl mx-auto text-center transition-all duration-1200 transform ${showLanding ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'}`}>
            
            {/* Hero Typography */}
            <h1 className="font-heading tracking-tight leading-tight" style={styles.heroTitle}>
              Your Hardware Partner
            </h1>
            <h1 className="font-heading tracking-tight leading-tight" style={styles.heroTitleAccent}>
              Made Smarter
            </h1>

            {/* Subtitle */}
            <p className="max-w-2xl mx-auto leading-relaxed" style={styles.heroSubtitle}>
              Get the best deals, instant stock checks, and personalised recommendations for your projects, helping you save time and choose the right products effortlessly.
            </p>

            {/* White background section containing cards and CTA */}
            <div className="flex-shrink-0" style={styles.whiteSection}>
              {/* Feature Cards - Belims Style */}
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-5 transition-all duration-1000 ${featuresVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
              
                {/* Better Pricing Card */}
                <div 
                  className="group relative hover:border-blue-400/50 transition-all duration-300 hover:scale-105 text-center"
                  style={{ ...styles.featureCard, animationDelay: '0ms' }}
                >
                  <div className="mb-3 flex justify-center">
                    <div className="w-fit" style={styles.featureIcon}>
                      <Tag size={24} className="text-white" />
                    </div>
                  </div>
                  
                  <h3 className="font-heading" style={styles.featureTitle}>Better Pricing</h3>
                  <p className="leading-relaxed" style={styles.featureDescription}>
                    Competitive pricing across all suppliers
                  </p>
                  
                  {/* Simple indicator */}
                  <div style={styles.featureIndicator}>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700 text-xs font-medium">Price matched</span>
                    </div>
                  </div>
                </div>                {/* Smart Recommendations Card */}
                <div 
                  className="group relative hover:border-blue-400/50 transition-all duration-300 hover:scale-105 text-center"
                  style={{ ...styles.featureCard, animationDelay: '200ms' }}
                >
                  <div className="mb-3 flex justify-center">
                    <div className="w-fit" style={styles.featureIcon}>
                      <Sparkles size={24} className="text-white" />
                    </div>
                  </div>
                  
                  <h3 className="font-heading" style={styles.featureTitle}>Smart Recommendations</h3>
                  <p className="leading-relaxed" style={styles.featureDescription}>
                    Personalized suggestions for your projects
                  </p>
                  
                  {/* Simple indicator */}
                  <div style={styles.featureIndicator}>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-700 text-xs font-medium">5 tools found</span>
                    </div>
                  </div>
                </div>                {/* Instant Availability Card */}
                <div 
                  className="group relative hover:border-blue-400/50 transition-all duration-300 hover:scale-105 text-center"
                  style={{ ...styles.featureCard, animationDelay: '400ms' }}
                >
                  <div className="mb-3 flex justify-center">
                    <div className="w-fit" style={styles.featureIcon}>
                      <Zap size={24} className="text-white" />
                    </div>
                  </div>
                  
                  <h3 className="font-heading" style={styles.featureTitle}>Instant Availability</h3>
                  <p className="leading-relaxed" style={styles.featureDescription}>
                    Real-time stock across all branches
                  </p>
                  
                  {/* Simple indicator */}
                  <div style={styles.featureIndicator}>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700 text-xs font-medium">In stock</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA Section inside white background */}
              <div className={`flex justify-center transition-all duration-1200 delay-500 ${showLanding ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                <button 
                  onClick={handleGetStarted}
                  className="hover:bg-orange-600 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-2"
                  style={styles.ctaButton}
                >
                  Get Started
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
                </button>
              </div>
            </div>          </div>
        </div>

        {/* 
          STEP 2 & 3: SLIDING BOTTOM SHEET 
          Animate up from bottom
        */}
        {(step === 2 || step === 3) && (
          <>
            {/* Backdrop Click Area */}
            <div className="absolute inset-0 z-[101]" onClick={() => { if(step===2) setStep(1); }} />

            <div 
              className={`absolute bottom-0 left-0 right-0 bg-[#F5F5F7] z-[102] rounded-t-[2.5rem] p-8 md:p-12 shadow-[0_-20px_60px_rgba(0,0,0,0.5)] transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) flex flex-col min-h-[60vh] max-h-[85vh] ${showSheet ? 'translate-y-0' : 'translate-y-full'}`}
            >
             {/* Handle bar (Visual cue) */}
             <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-8 opacity-50"></div>

             {/* Close Sheet Button */}
             <button 
               onClick={onClose}
               className="absolute top-8 right-8 bg-gray-200 hover:bg-gray-300 p-2 rounded-full text-gray-600 transition-colors"
             >
               <X size={20} />
             </button>

             {/* 
               SHEET CONTENT: STEP 2 - PROFILE SELECTION 
             */}
             {step === 2 && (
               <div className="max-w-3xl mx-auto w-full animate-fadeIn">
                  <h2 className="text-3xl md:text-4xl font-bold text-black mb-3 font-heading tracking-tight text-center">
                    First, choose your profile.
                  </h2>
                  <p className="text-gray-500 text-center mb-12 text-lg">
                    This helps Gemini tailor recommendations to your needs.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Card */}
                    <button 
                      onClick={() => handleSelectUserType('personal')}
                      className="group relative bg-white p-8 rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <User size={100} className="text-blue-600" />
                      </div>
                      <div className="relative z-10">
                        <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                          <User size={28} />
                        </div>
                        <h3 className="text-2xl font-bold text-black mb-2 font-heading">Personal</h3>
                        <p className="text-gray-500 font-medium">For DIY projects and home improvements.</p>
                      </div>
                    </button>

                    {/* Business Card */}
                    <button 
                      onClick={() => handleSelectUserType('business')}
                      className="group relative bg-white p-8 rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Briefcase size={100} className="text-purple-600" />
                      </div>
                      <div className="relative z-10">
                        <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                          <Briefcase size={28} />
                        </div>
                        <h3 className="text-2xl font-bold text-black mb-2 font-heading">Business</h3>
                        <p className="text-gray-500 font-medium">For contractors, bulk orders, and tax invoices.</p>
                      </div>
                    </button>
                  </div>
               </div>
             )}

             {/* 
               SHEET CONTENT: STEP 3 - PROJECT INPUT 
             */}
             {step === 3 && (
               <div className="max-w-2xl mx-auto w-full animate-fadeIn flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-2 justify-center text-orange-500 font-bold uppercase tracking-wider text-xs">
                    <Sparkles size={14} /> Gemini AI Analysis
                  </div>
                  
                  <h2 className="text-3xl md:text-4xl font-bold text-black mb-4 font-heading tracking-tight text-center">
                    What are you working on?
                  </h2>
                  <p className="text-gray-500 text-center mb-10 text-lg">
                    Describe your project. We'll check stock and pricing instantly.
                  </p>

                  {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
                      <div className="w-20 h-20 bg-white rounded-full shadow-xl flex items-center justify-center mb-6 relative">
                         <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                         <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                         <Sparkles className="text-blue-600" size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-black mb-2">Analyzing Request...</h3>
                      <p className="text-gray-400">Finding best matches for <span className="capitalize text-gray-600">{userType}</span> use.</p>
                    </div>
                  ) : (
                    <>
                      <div className="relative flex-1 min-h-[200px]">
                        <textarea 
                          className="w-full bg-white border-none focus:ring-0 resize-none shadow-inner leading-relaxed text-gray-800 placeholder-gray-300"
                          style={{ borderRadius: '16px', padding: '1.2rem', height: '150px', fontSize: '18px' }}
                          placeholder="E.g. I'm building a floating deck in the backyard, about 4x4 meters..."
                          value={projectDesc}
                          onChange={(e) => setProjectDesc(e.target.value)}
                          autoFocus
                        />
                      </div>

                      <div className="flex items-center gap-4 mt-8">
                        <button 
                          onClick={() => setStep(2)} 
                          className="px-6 py-4 rounded-full text-gray-500 font-bold hover:bg-gray-200 transition-colors"
                        >
                          Back
                        </button>
                        <button 
                          onClick={handleFinish}
                          disabled={!projectDesc.trim()}
                          className="flex-1 bg-[#0071e3] text-white py-4 rounded-full font-bold font-heading text-lg hover:bg-[#0077ed] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 group"
                        >
                          Generate Recommendations 
                          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </>
                  )}
               </div>
             )}

            </div>
          </>
        )}
      </div>
    </div>
  );
};
