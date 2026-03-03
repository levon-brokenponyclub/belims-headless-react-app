import {
  DecisionModeAnswers,
  DecisionModeKey,
  DecisionModeState,
  Product,
} from "../types";

const CATEGORY_HINTS = [
  "drill",
  "saw",
  "sander",
  "shoe",
  "paint",
  "plumbing",
  "tile",
  "garden",
  "hardware",
  "tool",
];

const DECISION_INTENT_HINTS = [
  "recommend",
  "looking for",
  "need",
  "help me choose",
  "not sure",
  "best",
  "which one",
  "suggest",
];

export const DECISION_MAX_QUESTIONS = 3;

export const createInitialDecisionState = (): DecisionModeState => ({
  active: false,
  step: 0,
  questionsAsked: 0,
  lastQuestionKey: undefined,
  answers: {},
  startedAt: new Date().toISOString(),
});

export const isSkipValue = (text: string): boolean =>
  /^(skip|no|none|n\/a)$/i.test(text.trim());

export const detectDecisionIntent = (text: string): boolean => {
  const normalized = text.toLowerCase();
  if (!normalized.trim()) {
    return false;
  }

  return (
    DECISION_INTENT_HINTS.some((hint) => normalized.includes(hint)) ||
    CATEGORY_HINTS.some((hint) => normalized.includes(hint))
  );
};

export const isTopicShiftIntent = (text: string): boolean => {
  const normalized = text.toLowerCase();
  return /(track|order|promo|discount|support|human|refund|cancel)/i.test(
    normalized,
  );
};

export const parseBudgetRange = (
  text: string,
): DecisionModeAnswers["budget"] | undefined => {
  const trimmed = text.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/no budget/i.test(trimmed)) {
    return { raw: "No budget" };
  }

  const underMatch = trimmed.match(/under\s*(?:r|\$)?\s*(\d+[\d,]*)/i);
  if (underMatch) {
    return {
      max: Number(underMatch[1].replace(/,/g, "")),
      raw: underMatch[0],
    };
  }

  const rangeMatch = trimmed.match(
    /(?:r|\$)?\s*(\d+[\d,]*)\s*(?:-|to|–|and)\s*(?:r|\$)?\s*(\d+[\d,]*)/i,
  );
  if (rangeMatch) {
    return {
      min: Number(rangeMatch[1].replace(/,/g, "")),
      max: Number(rangeMatch[2].replace(/,/g, "")),
      raw: `${rangeMatch[1]}-${rangeMatch[2]}`,
    };
  }

  const plainBudget = trimmed.match(/(?:r|\$)\s*(\d+[\d,]*)/i);
  if (plainBudget) {
    return {
      max: Number(plainBudget[1].replace(/,/g, "")),
      raw: plainBudget[0],
    };
  }

  return undefined;
};

export const inferCompareFocus = (
  text: string,
): DecisionModeAnswers["compareFocus"] | undefined => {
  const normalized = text.toLowerCase();

  if (/cheapest|lowest|budget/i.test(normalized)) return "cheapest";
  if (/best\s*value|value/i.test(normalized)) return "best_value";
  if (/top\s*rated|rating|best/i.test(normalized)) return "top_rated";
  if (/fast\s*delivery|deliver|today|urgent/i.test(normalized)) {
    return "fastest_delivery";
  }

  return undefined;
};

export const inferUrgency = (
  text: string,
): DecisionModeAnswers["urgency"] | undefined => {
  const normalized = text.toLowerCase();

  if (/today|now|urgent/.test(normalized)) return "today";
  if (/week|this week|soon/.test(normalized)) return "this_week";
  if (/no rush|whenever/.test(normalized)) return "no_rush";

  return undefined;
};

export const extractDecisionAnswersFromText = (
  text: string,
): Partial<DecisionModeAnswers> => {
  const trimmed = text.trim();
  if (!trimmed) {
    return {};
  }

  const normalized = trimmed.toLowerCase();

  const updates: Partial<DecisionModeAnswers> = {};
  const budget = parseBudgetRange(trimmed);
  if (budget) {
    updates.budget = budget;
  }

  const compareFocus = inferCompareFocus(trimmed);
  if (compareFocus) {
    updates.compareFocus = compareFocus;
  }

  const urgency = inferUrgency(trimmed);
  if (urgency) {
    updates.urgency = urgency;
  }

  if (/^home\s+use$/i.test(trimmed)) {
    updates.usage = "home";
  } else if (/^business\s+use$/i.test(trimmed)) {
    updates.usage = "business";
  }

  const usageOnly = normalized === "home use" || normalized === "business use";

  if (!usageOnly && CATEGORY_HINTS.some((hint) => normalized.includes(hint))) {
    updates.categoryOrUseCase = trimmed;
  }

  if (
    /(brand|size|compatib|material|in-stock|stock|delivery|rated|value)/i.test(
      trimmed,
    )
  ) {
    updates.preference = trimmed;
  }

  return updates;
};

export const getNextDecisionQuestion = (
  answers: DecisionModeAnswers,
  questionsAsked: number,
): DecisionModeKey | null => {
  if (questionsAsked >= DECISION_MAX_QUESTIONS) {
    return null;
  }

  if (!answers.categoryOrUseCase) {
    return "useCase";
  }

  if (!answers.budget) {
    return "budget";
  }

  if (!answers.preference) {
    return "preference";
  }

  return null;
};

export const getDecisionQuestionText = (key: DecisionModeKey): string => {
  if (key === "useCase") {
    return "What are you shopping for?";
  }
  if (key === "budget") {
    return "What’s your budget range?";
  }
  return "Any priorities or must-haves?";
};

export const getDecisionQuestionOptions = (
  key: DecisionModeKey,
  _answers: DecisionModeAnswers,
): string[] => {
  if (key === "useCase") {
    return ["Cordless drill", "Circular saw", "Paint", "Nails", "Skip"];
  }

  if (key === "budget") {
    return ["Under R500", "R500–R1500", "R1500–R3000", "No budget"];
  }

  return [
    "Home use",
    "Business use",
    "In-stock only",
    "Top rated",
    "Best value",
    "Fast delivery",
    "Skip",
  ];
};

export const getBinaryAcceleratorChips = (
  answers: DecisionModeAnswers,
): string[] => {
  const chips = ["Cheapest", "Best value", "Top rated", "Fast delivery"];

  if (answers.urgency !== "today") {
    chips.push("Pickup today");
  }
  if (answers.urgency !== "this_week") {
    chips.push("Deliver this week");
  }

  return chips.slice(0, 6);
};

export const buildDecisionQuery = (answers: DecisionModeAnswers): string => {
  const budgetRaw = answers.budget?.raw ?? "no preference";
  const usageText = answers.usage ? ` Usage: ${answers.usage}.` : "";
  return `${answers.categoryOrUseCase ?? "general products"}. Budget: ${budgetRaw}. Preference: ${answers.preference ?? "no preference"}. Focus: ${answers.compareFocus ?? "best_value"}. Urgency: ${answers.urgency ?? "no_rush"}.${usageText}`;
};

const budgetClosenessScore = (
  product: Product,
  budget?: DecisionModeAnswers["budget"],
): number => {
  if (!budget || (budget.min == null && budget.max == null)) {
    return 0;
  }

  if (budget.min != null && budget.max != null) {
    if (product.price >= budget.min && product.price <= budget.max) {
      return 2;
    }
    const center = (budget.min + budget.max) / 2;
    const distance = Math.abs(product.price - center);
    return distance <= center * 0.2 ? 1 : 0;
  }

  if (budget.max != null && product.price <= budget.max) {
    return 2;
  }

  return 0;
};

export const rankDecisionProducts = (
  products: Product[],
  answers: DecisionModeAnswers,
): Product[] => {
  const ranked = [...products]
    .map((product) => {
      let score = 0;

      if (product.inStock) {
        score += 6;
      }

      score += (product.rating ?? 0) * 1.5;

      score += budgetClosenessScore(product, answers.budget);

      if (answers.compareFocus === "cheapest") {
        score += Math.max(0, 2000 - product.price) / 200;
      } else if (answers.compareFocus === "top_rated") {
        score += (product.rating ?? 0) * 2;
      } else if (answers.compareFocus === "best_value") {
        score += (product.rating ?? 0) * 1.4 - product.price / 200;
      }

      if (answers.preference?.toLowerCase().includes("in-stock")) {
        score += product.inStock ? 2 : -3;
      }

      return { product, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.product);

  return ranked.slice(0, 5);
};

export const pickBestFitProduct = (
  products: Product[],
  answers: DecisionModeAnswers,
): Product | null => {
  const ranked = rankDecisionProducts(products, answers);
  return ranked[0] ?? null;
};

export const mergeDecisionAnswers = (
  current: DecisionModeAnswers,
  updates: Partial<DecisionModeAnswers>,
): DecisionModeAnswers => ({
  ...current,
  ...updates,
  budget: updates.budget ?? current.budget,
});
