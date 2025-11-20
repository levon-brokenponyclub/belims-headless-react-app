import React, { useState } from 'react';
import { Sparkles, Palette, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { getPaintRecommendations } from '../services/geminiService';
import { PaintRecommendation } from '../types';

export const PaintAssistant: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<PaintRecommendation[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setRecommendations([]);

    try {
      const results = await getPaintRecommendations(prompt);
      if (results && results.length > 0) {
        setRecommendations(results);
      } else {
        setError("We couldn't generate recommendations for that description. Please try a different prompt.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
    // Optional: keep the state so they can see it when they open it back up, 
    // or reset it. Here we keep it.
  };

  if (!isOpen) {
    return (
      <div className="bg-gradient-to-r from-belims-blue to-indigo-900 rounded-lg p-6 text-white shadow-lg overflow-hidden relative mb-8">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2 font-heading">
              <Sparkles className="text-belims-accent" /> Belims AI Paint Pro
            </h2>
            <p className="text-blue-100 max-w-lg font-sans">
              Not sure which color fits your room? Describe your mood or space, and let our AI suggest the perfect palette using Gemini technology.
            </p>
          </div>
          <button 
            onClick={() => setIsOpen(true)}
            className="bg-white text-belims-blue px-6 py-3 rounded-full font-bold hover:bg-belims-accent hover:text-white transition-colors shadow-md flex items-center gap-2 font-heading"
          >
            Try It Now <ArrowRight size={18} />
          </button>
        </div>
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-8 transition-all">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 font-heading">
          <Palette className="text-belims-blue" /> 
          Paint Selection Assistant
        </h2>
        <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-sm font-medium">Close</button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="E.g., 'A calm nursery with plenty of natural light' or 'Modern industrial kitchen'"
          className="flex-1 border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-belims-blue focus:border-transparent outline-none font-sans"
        />
        <button 
          type="submit" 
          disabled={loading || !prompt.trim()}
          className="bg-belims-blue text-white px-6 py-2 rounded hover:bg-belims-light disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-bold font-heading transition-colors"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} className="text-belims-accent" />}
          Generate
        </button>
      </form>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded mb-6 flex items-center gap-2 text-sm font-medium">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {recommendations.map((rec, idx) => (
            <div key={idx} className="group cursor-pointer bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-all">
              <div 
                className="h-32 rounded-t-lg shadow-inner relative" 
                style={{ backgroundColor: rec.hexCode }}
              >
                {/* Hex code overlay on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity">
                   <span className="bg-black/50 text-white text-xs px-2 py-1 rounded font-mono">{rec.hexCode}</span>
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-b-lg h-full">
                <div className="flex justify-between items-start mb-1 gap-2">
                  <h4 className="font-bold text-gray-800 font-heading text-sm leading-tight">{rec.colorName}</h4>
                  <span className="text-[10px] bg-white border px-1.5 py-0.5 rounded text-gray-500 uppercase tracking-wider font-bold whitespace-nowrap">{rec.mood}</span>
                </div>
                <p className="text-xs text-gray-500 leading-snug font-sans mt-1">{rec.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};