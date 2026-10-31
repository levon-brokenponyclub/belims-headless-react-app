// Shapes for GET /belims/v1/homepage and the build-time `virtual:homepage` module.

export interface HomepageImage {
  url: string;
  width: number;
  height: number;
  alt: string;
}

export interface HomepageHeroSection {
  type: "hero";
  eyebrow?: string;
  title: string;
  description: string;
  button: { text: string; link: string };
  image: HomepageImage;
  image_mobile: HomepageImage | null;
}

export interface HomepageTopCategoryCard {
  category: string;
  title: string;
  description: string;
  button_text: string;
  image: HomepageImage | null;
}

export interface HomepageTopCategoriesSection {
  type: "top_categories";
  eyebrow: string;
  title: string;
  cards: HomepageTopCategoryCard[];
}

export interface HomepagePayload {
  version: string;
  sections: (HomepageHeroSection | HomepageTopCategoriesSection)[];
}

/** Image with responsive attributes resolved at build time (identical to the preload tags). */
export interface ResolvedImage {
  src: string;
  srcSet?: string;
  sizes: string;
  width: number;
  height: number;
  alt: string;
}

export interface ResolvedHero extends Omit<HomepageHeroSection, "image" | "image_mobile"> {
  image: ResolvedImage;
  imageMobile: ResolvedImage | null;
}

export interface ResolvedTopCategories {
  eyebrow: string;
  title: string;
  cards: { category: string; title: string; description: string; buttonText: string; image: string | null }[];
}

export interface HomepageModule {
  version: string;
  source: "cms" | "fallback";
  hero: ResolvedHero | null;
  topCategories: ResolvedTopCategories | null;
}
