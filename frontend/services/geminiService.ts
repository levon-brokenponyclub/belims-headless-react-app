
import { GoogleGenAI, Type } from "@google/genai";
import { PaintRecommendation, AIRecommendation, Product, PriceMatchResult } from "../types";
import { FEATURED_PRODUCTS, DEALS_PRODUCTS } from "../constants";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: import.meta.env.REACT_APP_GEMINI_API_KEY });

const ALL_PRODUCTS = [...FEATURED_PRODUCTS, ...DEALS_PRODUCTS];

export const getPaintRecommendations = async (userPrompt: string): Promise<PaintRecommendation[]> => {
  try {
    const modelId = "gemini-2.5-flash"; 
    
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `Generate a curated palette of 4 distinct paint colors for a project described as: "${userPrompt}".`,
      config: {
        systemInstruction: "You are a professional interior design consultant for Belims Hardware. Your goal is to recommend sophisticated and suitable paint colors based on user descriptions. Always return the response as a valid JSON array.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              colorName: { type: Type.STRING, description: "A creative, marketing-friendly name for the paint color" },
              hexCode: { type: Type.STRING, description: "The CSS hex code for the color (e.g. #RRGGBB)" },
              description: { type: Type.STRING, description: "A brief explanation of why this color fits the requested mood/space" },
              mood: { type: Type.STRING, description: "A single word mood descriptor (e.g. Serene, Bold, Cozy)" }
            },
            required: ["colorName", "hexCode", "description", "mood"]
          }
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return data as PaintRecommendation[];
    }
    
    return [];

  } catch (error) {
    console.error("Gemini Paint Assistant Error:", error);
    return [];
  }
};

export const getPersonalizedRecommendations = async (userType: 'personal' | 'business', projectDescription: string): Promise<Product[]> => {
  try {
    // Create a lightweight inventory context
    const inventoryContext = ALL_PRODUCTS.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      tags: p.tags || []
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `The user is a ${userType} customer working on: "${projectDescription}". 
      Based on this, select exactly 3 specific products from the provided inventory list that would be most helpful.
      Return ONLY the JSON array of product IDs and a short reason.`,
      config: {
        systemInstruction: `You are a helpful hardware store assistant. You have access to the following inventory: ${JSON.stringify(inventoryContext)}. 
        Your goal is to recommend the 3 most relevant products from this list. 
        If the user's request doesn't perfectly match, pick the closest functional tools (e.g. drill for building).
        Return JSON format.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              productId: { type: Type.STRING },
              reason: { type: Type.STRING }
            },
            required: ["productId", "reason"]
          }
        }
      }
    });

    if (response.text) {
      const recommendations = JSON.parse(response.text) as AIRecommendation[];
      // Map back to full product objects
      const results = recommendations
        .map(rec => ALL_PRODUCTS.find(p => p.id === rec.productId))
        .filter(p => p !== undefined) as Product[];
      
      // If AI fails to match enough, fallback to defaults
      if (results.length < 3) {
         return ALL_PRODUCTS.slice(0, 3);
      }
      return results.slice(0, 3);
    }
    
    return ALL_PRODUCTS.slice(0, 3);

  } catch (error) {
    console.error("AI Personalization Error:", error);
    return ALL_PRODUCTS.slice(0, 3); // Fallback
  }
};

export const generateProductDescription = async (product: Product): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Write a compelling, SEO-optimized product description (approx 100 words) for: ${product.name}. 
      Key features: ${product.features?.join(', ')}. 
      Brand: ${product.brand}. 
      Category: ${product.category}.
      Tone: Professional, encouraging, and authoritative for a hardware store.`,
    });
    return response.text || "Could not generate description.";
  } catch (error) {
    console.error("AI Description Error:", error);
    return "Description currently unavailable.";
  }
};

export const findCompetitorPrices = async (product: Product): Promise<PriceMatchResult> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find current prices for "${product.name}" (SKU: ${product.sku}) in South Africa. 
      Search stores like Builders Warehouse, Makro, Leroy Merlin, and Takealot.
      Our price is R${product.price}.
      
      Output a brief analysis comparing our price to found competitor prices. 
      State clearly if we are cheaper or more expensive.
      Format the analysis in Markdown.`,
      config: {
        tools: [{ googleSearch: {} }],
        // Note: responseMimeType is NOT allowed with googleSearch
      }
    });

    // Extract grounding sources
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => ({
        title: chunk.web?.title || "Source",
        uri: chunk.web?.uri || "#"
      }))
      .filter((s: any) => s.uri !== "#") || [];

    return {
      analysis: response.text || "No pricing data found.",
      sources: sources
    };

  } catch (error) {
    console.error("Price Match Error:", error);
    return {
      analysis: "Unable to perform real-time price check at this moment.",
      sources: []
    };
  }
};
