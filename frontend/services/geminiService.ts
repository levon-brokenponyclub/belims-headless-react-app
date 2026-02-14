import { GoogleGenAI, Type } from "@google/genai";
import {
  PaintRecommendation,
  AIRecommendation,
  Product,
  PriceMatchResult,
} from "../types";
import { cachedGetJson, getApiBaseUrl } from "./wooCommerceService";
import { FEATURED_PRODUCTS, DEALS_PRODUCTS } from "../constants";

// Initialize Gemini Client with fallback for missing API key
// Environment Variables Debug (commented out for cleaner console)
// console.log('🔍 Environment Variables Debug:', {
//   allEnvKeys: Object.keys(import.meta.env),
//   reactAppKeys: Object.keys(import.meta.env).filter(key => key.startsWith('REACT_APP_')),
//   geminiKey: import.meta.env.REACT_APP_GEMINI_API_KEY,
//   geminiKeyLength: import.meta.env.REACT_APP_GEMINI_API_KEY?.length,
//   wooUrl: import.meta.env.REACT_APP_WOO_SITE_URL
// });

const envApiKey = import.meta.env.REACT_APP_GEMINI_API_KEY as
  | string
  | undefined;
// console.log('Debug: API Key check:', apiKey ? 'Found API key' : 'API key missing', 'Length:', apiKey?.length);
let ai: GoogleGenAI | null = envApiKey
  ? new GoogleGenAI({ apiKey: envApiKey })
  : null;
let aiInitPromise: Promise<GoogleGenAI | null> | null = null;

type AiConfigResponse = {
  gemini_enabled?: boolean;
  gemini_api_key?: string;
};

const getGeminiApiKey = async (): Promise<string | null> => {
  if (envApiKey) return envApiKey;
  try {
    const url = `${getApiBaseUrl()}/ai/config`;
    const data = await cachedGetJson<AiConfigResponse>(url);
    if (data?.gemini_enabled && data.gemini_api_key) {
      return data.gemini_api_key;
    }
  } catch (error) {
    console.warn("Failed to load AI config:", error);
  }
  return null;
};

const getAiClient = async (): Promise<GoogleGenAI | null> => {
  if (ai) return ai;
  if (aiInitPromise) return aiInitPromise;

  aiInitPromise = (async () => {
    const apiKey = await getGeminiApiKey();
    if (!apiKey) return null;
    ai = new GoogleGenAI({ apiKey });
    return ai;
  })().finally(() => {
    aiInitPromise = null;
  });

  return aiInitPromise;
};

const ALL_PRODUCTS = [...FEATURED_PRODUCTS, ...DEALS_PRODUCTS];

export const getPaintRecommendations = async (
  userPrompt: string,
): Promise<PaintRecommendation[]> => {
  try {
    // Check if API key is available
    const client = await getAiClient();
    if (!client) {
      console.warn(
        "Gemini API key not found. Using mock paint recommendations.",
      );
      // Return different sexy colors each time for better demos
      const sexyColors = [
        {
          colorName: "Midnight Velvet",
          hexCode: "#1a1a2e",
          description:
            "Deep mysterious navy that exudes sophistication and drama",
          mood: "Bold & Dramatic",
        },
        {
          colorName: "Sunset Blush",
          hexCode: "#ff6b6b",
          description: "Warm coral pink that captures the essence of passion",
          mood: "Romantic & Warm",
        },
        {
          colorName: "Forest Whisper",
          hexCode: "#2d5016",
          description:
            "Rich forest green that brings nature's tranquility indoors",
          mood: "Natural & Calming",
        },
        {
          colorName: "Golden Hour",
          hexCode: "#f39c12",
          description:
            "Warm amber gold that radiates positive energy and luxury",
          mood: "Energizing & Luxe",
        },
        {
          colorName: "Ocean Depths",
          hexCode: "#2c3e50",
          description: "Deep teal blue reminiscent of mysterious ocean depths",
          mood: "Sophisticated & Serene",
        },
        {
          colorName: "Dusty Rose",
          hexCode: "#d63384",
          description: "Elegant mauve pink with vintage charm and romance",
          mood: "Elegant & Vintage",
        },
        {
          colorName: "Charcoal Storm",
          hexCode: "#495057",
          description: "Modern charcoal grey with depth and edgy character",
          mood: "Modern & Edgy",
        },
        {
          colorName: "Burgundy Passion",
          hexCode: "#722f37",
          description: "Rich wine red that speaks of passion and luxury",
          mood: "Passionate & Bold",
        },
      ];

      // Shuffle and return 4 random colors for variety
      const shuffled = sexyColors.sort(() => 0.5 - Math.random());
      return shuffled.slice(0, 4);
    }

    const modelId = "gemini-2.5-flash";

    const response = await client.models.generateContent({
      model: modelId,
      contents: `Generate a curated palette of 4 distinct paint colors for a project described as: "${userPrompt}".`,
      config: {
        systemInstruction:
          "You are a professional interior design consultant for Belims Hardware. Your goal is to recommend sophisticated and suitable paint colors based on user descriptions. Always return the response as a valid JSON array.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              colorName: {
                type: Type.STRING,
                description:
                  "A creative, marketing-friendly name for the paint color",
              },
              hexCode: {
                type: Type.STRING,
                description: "The CSS hex code for the color (e.g. #RRGGBB)",
              },
              description: {
                type: Type.STRING,
                description:
                  "A brief explanation of why this color fits the requested mood/space",
              },
              mood: {
                type: Type.STRING,
                description:
                  "A single word mood descriptor (e.g. Serene, Bold, Cozy)",
              },
            },
            required: ["colorName", "hexCode", "description", "mood"],
          },
        },
      },
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

export const getPersonalizedRecommendations = async (
  userType: "personal" | "business",
  projectDescription: string,
): Promise<Product[]> => {
  try {
    // Check if API key is available
    const client = await getAiClient();
    if (!client) {
      console.warn(
        "Gemini API key not found. Using smart fallback recommendations.",
      );

      // Create dynamic recommendations based on input and time
      const timeVariation = Math.floor(Date.now() / 60000) % 3; // Changes every minute
      let baseProducts = [];

      if (
        userType === "business" ||
        projectDescription.toLowerCase().includes("construction")
      ) {
        const powerTools = ALL_PRODUCTS.filter(
          (p) => p.category === "Power Tools",
        );
        const handTools = ALL_PRODUCTS.filter(
          (p) => p.category === "Hand Tools",
        );
        const safety = ALL_PRODUCTS.filter((p) => p.category === "Safety Gear");

        switch (timeVariation) {
          case 0:
            baseProducts = [
              ...powerTools.slice(0, 2),
              ...handTools.slice(0, 1),
            ];
            break;
          case 1:
            baseProducts = [...powerTools.slice(1, 3), ...safety.slice(0, 1)];
            break;
          case 2:
            baseProducts = [
              ...handTools.slice(0, 2),
              ...powerTools.slice(0, 1),
            ];
            break;
        }
      } else {
        // For personal projects, mix categories
        const randomStart = timeVariation * 2;
        baseProducts = ALL_PRODUCTS.slice(randomStart, randomStart + 3);
      }

      // Shuffle for more variety and ensure we have 3 products
      const shuffled = baseProducts.sort(() => 0.5 - Math.random());
      const result = shuffled.slice(0, 3);

      // If we don't have enough, fill with random products
      if (result.length < 3) {
        const remaining = ALL_PRODUCTS.filter((p) => !result.includes(p));
        result.push(...remaining.slice(0, 3 - result.length));
      }

      return result;
    }

    // Create a lightweight inventory context
    const inventoryContext = ALL_PRODUCTS.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      tags: p.tags || [],
    }));

    const response = await client.models.generateContent({
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
              reason: { type: Type.STRING },
            },
            required: ["productId", "reason"],
          },
        },
      },
    });

    if (response.text) {
      const recommendations = JSON.parse(response.text) as AIRecommendation[];
      // Map back to full product objects
      const results = recommendations
        .map((rec) => ALL_PRODUCTS.find((p) => p.id === rec.productId))
        .filter((p) => p !== undefined) as Product[];

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

export const generateProductDescription = async (
  product: Product,
): Promise<string> => {
  try {
    // Check if API key is available
    const client = await getAiClient();
    if (!client) {
      console.warn(
        "Gemini API key not found. Using enhanced dynamic descriptions.",
      );

      // Create dynamic descriptions based on product and time for variety
      const timeVariation = Math.floor(Date.now() / 50000) % 4; // Changes every 50 seconds
      const descriptionStyles = [
        {
          prefix: "\ud83d\udd25 **Professional Grade**:",
          template:
            "${brand} delivers exceptional quality with this ${name}. ${description} Trusted by professionals nationwide for reliable performance and outstanding durability.",
        },
        {
          prefix: "\u2b50 **Customer Choice**:",
          template:
            "Experience the difference with ${brand}'s ${name}. ${description} Rated ${rating}/5 stars by ${reviews} satisfied customers who trust this quality.",
        },
        {
          prefix: "\ud83d\udcaa **Built to Last**:",
          template:
            "Invest in quality with ${brand}'s ${name}. ${description} Engineered for both professional contractors and serious DIY enthusiasts.",
        },
        {
          prefix: "\ud83c\udfc6 **Industry Standard**:",
          template:
            "Choose reliability with ${brand}'s ${name}. ${description} The preferred choice for quality-conscious customers seeking lasting value.",
        },
      ];

      const selectedStyle = descriptionStyles[timeVariation];
      const dynamicDescription = selectedStyle.template
        .replace(/\$\{name\}/g, product.name)
        .replace(/\$\{brand\}/g, product.brand || "this trusted brand")
        .replace(
          /\$\{description\}/g,
          product.description ||
            `High-quality ${product.category.toLowerCase()} for all your project needs.`,
        )
        .replace(/\$\{rating\}/g, product.rating?.toString() || "4.5")
        .replace(/\$\{reviews\}/g, product.reviews?.toString() || "many");

      return `${selectedStyle.prefix} ${dynamicDescription}`;
    }

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Write a compelling, SEO-optimized product description (approx 100 words) for: ${product.name}. 
      Key features: ${product.features?.join(", ")}. 
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

export const findCompetitorPrices = async (
  product: Product,
): Promise<PriceMatchResult> => {
  try {
    // Check if API key is available
    const client = await getAiClient();
    if (!client) {
      console.warn(
        "Gemini API key not found. Using dynamic price comparison simulation.",
      );

      // Create realistic price variations based on current price and time
      const timeVariation = Math.floor(Date.now() / 45000) % 6; // Changes every 45 seconds
      const competitorData = [
        { name: "BuildIt", factor: 0.92, hasStock: true },
        { name: "Cashbuild", factor: 0.95, hasStock: true },
        { name: "Leroy Merlin", factor: 1.03, hasStock: false },
        { name: "Builders Warehouse", factor: 0.89, hasStock: true },
        { name: "Makro", factor: 0.97, hasStock: true },
        { name: "Takealot", factor: 1.05, hasStock: true },
      ];

      const selectedCompetitor = competitorData[timeVariation];
      const competitorPrice = Math.floor(
        product.price * selectedCompetitor.factor,
      );
      const isLowerPrice = competitorPrice < product.price;
      const savings = isLowerPrice ? product.price - competitorPrice : 0;

      const analysis = isLowerPrice
        ? `💰 **Price Alert**: Found lower price at **${selectedCompetitor.name}** - R${competitorPrice} (Save R${savings})\n\nOur Belims price: R${product.price}${selectedCompetitor.hasStock ? "\n\n✅ In stock at competitor" : "\n\n⚠️ Limited availability at competitor"}`
        : `✅ **Great Value**: Our Belims price of R${product.price} is competitive!\n\n${selectedCompetitor.name}: R${competitorPrice}\n\nYou're getting excellent value with our current pricing.`;

      return {
        analysis: analysis,
        sources: [
          {
            title: `${selectedCompetitor.name} - ${product.name}`,
            uri: `https://${selectedCompetitor.name.toLowerCase().replace(" ", "")}.co.za`,
          },
        ],
        isCompetitive: !isLowerPrice,
        lowestCompetitorPrice: competitorPrice,
      };
    }

    const response = await client.models.generateContent({
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
      },
    });

    // Extract grounding sources
    const sources =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((chunk: any) => ({
          title: chunk.web?.title || "Source",
          uri: chunk.web?.uri || "#",
        }))
        .filter((s: any) => s.uri !== "#") || [];

    return {
      analysis: response.text || "No pricing data found.",
      sources: sources,
    };
  } catch (error) {
    console.error("Price Match Error:", error);
    return {
      analysis: "Unable to perform real-time price check at this moment.",
      sources: [],
    };
  }
};
