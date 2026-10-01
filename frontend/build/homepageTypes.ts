// Shapes for GET /belims/v1/homepage and the build-time `virtual:homepage` module.

export interface HomepageImage {
  url: string;
  width: number;
  height: number;
  alt: string;
}

export interface HomepageHeroSection {
  type: "hero";
  title: string;
  description: string;
  button: { text: string; link: string };
  image: HomepageImage;
  image_mobile: HomepageImage | null;
}

export interface HomepagePayload {
  version: string;
  sections: HomepageHeroSection[];
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

export interface HomepageModule {
  version: string;
  source: "cms" | "fallback";
  hero: ResolvedHero | null;
}
