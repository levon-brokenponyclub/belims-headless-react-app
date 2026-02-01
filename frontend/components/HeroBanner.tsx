import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HeroSlide {
  title: string;
  kicker: string;
  subtitle: string;
  description: string;
  primaryBtn: string;
  primaryBtnHref: string;
  secondaryBtnText?: string;
  secondaryBtnHref?: string;
  image: string;
  video?: string;
  highlight?: string;
  highlightType?: "hollow" | "hand-drawn";
  disableCode?: boolean;
  code?: string;
  codeLabel?: string;
}

interface TrustItem {
  icon: React.ReactNode;
  label: string;
  description: string;
  href: string;
}

interface CategoryItem {
  name: string;
  href: string;
  icon: string;
  image: string;
}

const HeroBanner: React.FC<{}> = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  const categories: CategoryItem[] = [
    {
      name: "Fasteners and Adhesives",
      href: "/collections/fasteners-adhesives",
      icon: "🔩",
      image: "https://via.placeholder.com/200x200?text=Fasteners",
    },
    {
      name: "Outdoor Garden and Patio",
      href: "/collections/outdoor-garden-patio",
      icon: "🌿",
      image: "https://via.placeholder.com/200x200?text=Garden",
    },
    {
      name: "Safety and Protective Wear",
      href: "/collections/safety-protective",
      icon: "🛡️",
      image: "https://via.placeholder.com/200x200?text=Safety",
    },
    {
      name: "Tools and Machinery",
      href: "/collections/tools-machinery",
      icon: "⚙️",
      image: "https://via.placeholder.com/200x200?text=Tools",
    },
    {
      name: "Uncategorized",
      href: "/collections/uncategorized",
      icon: "📦",
      image: "https://via.placeholder.com/200x200?text=Uncategorized",
    },
    {
      name: "Water Tanks and Filtration",
      href: "/collections/water-tanks-filtration",
      icon: "💧",
      image: "https://via.placeholder.com/200x200?text=Water",
    },
  ];

  const slides: HeroSlide[] = [
    {
      title: "Made for the Relentless",
      kicker: "KRANK",
      subtitle: "The jobsite is tough. KRANK tools are tougher.",
      description: "Premium tools built to last.",
      primaryBtn: "Shop All",
      primaryBtnHref: "/collections/all",
      secondaryBtnText: "Explore More",
      secondaryBtnHref: "/pages/contact",
      image:
        "//ecommerce-power-tools.myshopify.com/cdn/shop/files/carousal1.jpg?v=1749477720&width=1800",
      highlight: "Relentless",
      highlightType: "hollow",
    },
    {
      title: "Gear Up. Prices Down.",
      kicker: "KRANK",
      subtitle: "KRANK tools, now at a rare price. Don't miss out.",
      description: "Limited time pricing on top tools.",
      primaryBtn: "Shop Now",
      primaryBtnHref: "/collections/all",
      code: "NEWUSER",
      codeLabel: "New User Code:",
      image:
        "//ecommerce-power-tools.myshopify.com/cdn/shop/files/close-up-car.jpg?v=1763607970&width=1600",
      video:
        "https://ecommerce-power-tools.myshopify.com/cdn/shop/videos/c/vp/368a24b1ebe4468c9182d31fd2b448bf/368a24b1ebe4468c9182d31fd2b448bf.HD-1080p-2.5Mbps-51036248.mp4?v=0",
      highlight: "Prices Down.",
      highlightType: "hand-drawn",
    },
  ];

  // Autoplay carousel
  useEffect(() => {
    if (!autoplay) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [autoplay, slides.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setAutoplay(false);
    // Resume autoplay after 5 seconds of inactivity
    setTimeout(() => setAutoplay(true), 5000);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setAutoplay(false);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setAutoplay(false);
  };

  const trustItems: TrustItem[] = [
    {
      icon: (
        <svg
          className="h-[54px] w-[54px]"
          aria-hidden="true"
          focusable="false"
          role="presentation"
          xmlns="http://www.w3.org/2000/svg"
          width="54"
          height="44"
          viewBox="0 0 54 44"
          fill="none"
        >
          <path
            d="M5.5 22H18.7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
          <path
            d="M6.6001 38.5C6.6001 39.667 7.06367 40.7861 7.88883 41.6113C8.71399 42.4364 9.83314 42.9 11.0001 42.9C12.167 42.9 13.2862 42.4364 14.1114 41.6113C14.9365 40.7861 15.4001 39.667 15.4001 38.5C15.4001 37.333 14.9365 36.2139 14.1114 35.3887C13.2862 34.5636 12.167 34.1 11.0001 34.1C9.83314 34.1 8.71399 34.5636 7.88883 35.3887C7.06367 36.2139 6.6001 37.333 6.6001 38.5V38.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
          <path
            d="M37.3999 38.5C37.3999 39.667 37.8635 40.7861 38.6886 41.6113C39.5138 42.4364 40.6329 42.9 41.7999 42.9C42.9669 42.9 44.086 42.4364 44.9112 41.6113C45.7363 40.7861 46.1999 39.667 46.1999 38.5C46.1999 37.333 45.7363 36.2139 44.9112 35.3887C44.086 34.5636 42.9669 34.1 41.7999 34.1C40.6329 34.1 39.5138 34.5636 38.6886 35.3887C37.8635 36.2139 37.3999 37.333 37.3999 38.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
          <path
            d="M6.6001 38.5H2.2001C1.90836 38.5 1.62857 38.3841 1.42228 38.1778C1.21599 37.9715 1.1001 37.6917 1.1001 37.4V26.8554C1.10016 26.5642 1.21567 26.285 1.4213 26.0788L5.5001 22L10.3709 13.2308C10.5615 12.888 10.8403 12.6025 11.1784 12.4036C11.5164 12.2048 11.9015 12.1 12.2937 12.1H18.7001V2.20001C18.7001 1.90827 18.816 1.62848 19.0223 1.42219C19.2286 1.2159 19.5084 1.10001 19.8001 1.10001H50.6001C50.8918 1.10001 51.1716 1.2159 51.3779 1.42219C51.5842 1.62848 51.7001 1.90827 51.7001 2.20001V37.4C51.7001 37.6917 51.5842 37.9715 51.3779 38.1778C51.1716 38.3841 50.8918 38.5 50.6001 38.5H46.2001"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
          <path
            d="M15.3999 38.5H37.3999"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
          <path
            d="M18.7002 12.1V34.1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
          <path
            d="M1.1001 34.1H51.7001"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
        </svg>
      ),
      label: "Free Shipping",
      description: "When you spend $250+",
      href: "/pages/shipping-returns",
    },
    {
      icon: (
        <svg
          className="h-11 w-11"
          aria-hidden="true"
          focusable="false"
          role="presentation"
          xmlns="http://www.w3.org/2000/svg"
          width="44"
          height="45"
          viewBox="0 0 44 45"
          fill="none"
        >
          <path
            d="M22.1522 2.36196C10.5087 2.36196 1.06885 10.1591 1.06885 19.7786C1.11775 22.1736 1.70312 24.527 2.78188 26.6658C3.86063 28.8046 5.4053 30.6743 7.30218 32.1371L2.90218 42.6953L14.5842 36.0201C17.0313 36.799 19.5841 37.1954 22.1522 37.1953C33.7975 37.1953 43.2355 29.3981 43.2355 19.7786C43.2355 10.1591 33.7975 2.36196 22.1522 2.36196Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
          <path
            d="M23.069 28.0286V17.0286C23.069 16.5424 22.8759 16.0761 22.532 15.7323C22.1882 15.3884 21.7219 15.1953 21.2357 15.1953H19.4023"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
          <path
            d="M19.4023 28.0286H26.7357"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
          <path
            d="M22.5662 10.5857C22.8194 10.5857 23.0246 10.7909 23.0246 11.0441C23.0246 11.2972 22.8194 11.5024 22.5662 11.5024C22.3131 11.5024 22.1079 11.2972 22.1079 11.0441C22.1079 10.7909 22.3131 10.5857 22.5662 10.5857"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
        </svg>
      ),
      label: "Warranty Info",
      description: "Offering a range of policies",
      href: "/pages/warranty",
    },
    {
      icon: (
        <svg
          className="h-11 w-11"
          aria-hidden="true"
          focusable="false"
          role="presentation"
          xmlns="http://www.w3.org/2000/svg"
          width="44"
          height="44"
          viewBox="0 0 44 44"
          fill="none"
        >
          <path
            d="M25.6663 17.4167H28.4163V24.75L36.6663 17.4167H40.083C41.7399 17.4167 43.083 16.0735 43.083 14.4167V3.91667C43.083 2.25982 41.7399 0.916672 40.083 0.916672H18.583C16.9262 0.916672 15.583 2.25982 15.583 3.91667V8.25001"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
          <path
            d="M0.916504 43.0833C0.941096 40.9887 1.37714 38.9194 2.19984 36.993C3.09817 35.1945 6.85467 33.9478 11.57 32.2025C12.8442 31.7295 12.6352 28.4002 12.0705 27.7787C11.1709 26.8046 10.4877 25.6512 10.0655 24.3942C9.64339 23.1373 9.49195 21.8053 9.62117 20.4857C9.54039 19.6458 9.63332 18.7982 9.8942 17.9958C10.1551 17.1934 10.5783 16.4532 11.1375 15.8214C11.6968 15.1896 12.3801 14.6797 13.1449 14.3233C13.9097 13.9669 14.7397 13.7718 15.5832 13.75C16.4273 13.7708 17.2581 13.9652 18.0237 14.3211C18.7894 14.6771 19.4736 15.1869 20.0336 15.8188C20.5937 16.4507 21.0175 17.1912 21.2789 17.9941C21.5402 18.797 21.6333 19.6452 21.5525 20.4857C21.6817 21.8053 21.5303 23.1373 21.1082 24.3942C20.686 25.6512 20.0027 26.8046 19.1032 27.7787C18.5385 28.4002 18.3295 31.7295 19.6037 32.2025C24.319 33.9478 28.0755 35.1945 28.9738 36.993C29.7965 38.9194 30.2326 40.9887 30.2572 43.0833H0.916504Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
          <path
            d="M29.3333 8.70834C29.5865 8.70834 29.7917 8.91355 29.7917 9.16668C29.7917 9.41981 29.5865 9.62501 29.3333 9.62501C29.0802 9.62501 28.875 9.41981 28.875 9.16668C28.875 8.91355 29.0802 8.70834 29.3333 8.70834"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
          <path
            d="M35.7498 8.70834C36.003 8.70834 36.2082 8.91355 36.2082 9.16668C36.2082 9.41981 36.003 9.62501 35.7498 9.62501C35.4967 9.62501 35.2915 9.41981 35.2915 9.16668C35.2915 8.91355 35.4967 8.70834 35.7498 8.70834"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
          <path
            d="M22.9163 8.70834C23.1695 8.70834 23.3747 8.91355 23.3747 9.16668C23.3747 9.41981 23.1695 9.62501 22.9163 9.62501C22.6632 9.62501 22.458 9.41981 22.458 9.16668C22.458 8.91355 22.6632 8.70834 22.9163 8.70834"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
        </svg>
      ),
      label: "Need Help?",
      description: "Contact our support team today",
      href: "/pages/contact",
    },
    {
      icon: (
        <svg
          className="h-11 w-[30px]"
          aria-hidden="true"
          focusable="false"
          role="presentation"
          xmlns="http://www.w3.org/2000/svg"
          width="30"
          height="44"
          viewBox="0 0 30 44"
          fill="none"
        >
          <path
            d="M29.0211 14.9787C29.0211 22.8819 23.5296 27.4279 19.4142 31.8298C16.9502 34.466 14.9786 43.0638 14.9786 43.0638C14.9786 43.0638 13.0126 34.4717 10.5542 31.8429C6.4351 27.4429 0.936035 22.8894 0.936035 14.9787C0.936035 11.2544 2.41551 7.68263 5.049 5.04914C7.68249 2.41565 11.2543 0.936172 14.9786 0.936172C18.7029 0.936172 22.2747 2.41565 24.9082 5.04914C27.5417 7.68263 29.0211 11.2544 29.0211 14.9787V14.9787Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
          <path
            d="M9.36182 14.9787C9.36182 16.4684 9.95361 17.8972 11.007 18.9506C12.0604 20.0039 13.4891 20.5957 14.9788 20.5957C16.4686 20.5957 17.8973 20.0039 18.9507 18.9506C20.0041 17.8972 20.5959 16.4684 20.5959 14.9787C20.5959 13.489 20.0041 12.0603 18.9507 11.0069C17.8973 9.95349 16.4686 9.36169 14.9788 9.36169C13.4891 9.36169 12.0604 9.95349 11.007 11.0069C9.95361 12.0603 9.36182 13.489 9.36182 14.9787Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
        </svg>
      ),
      label: "Find Us",
      description: "Visit us in-store",
      href: "/pages/where-to-buy",
    },
  ];

  const slide = slides[currentSlide];

  return (
    <section
      className="w-full overflow-hidden bg-gray-50"
      aria-label="Hero carousel"
    >
      {/* Carousel Container */}
      <div
        className="relative min-h-screen max-h-screen w-full"
        onMouseEnter={() => setAutoplay(false)}
        onMouseLeave={() => setAutoplay(true)}
      >
        {/* Slides */}
        <div className="relative h-full w-full">
          {slides.map((s, index) => (
            <div
              key={index}
              className={`absolute inset-0 min-h-screen transition-opacity duration-1000 ease-in-out ${
                index === currentSlide ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden={index !== currentSlide}
            >
              {/* Background Image or Video */}
              <div className="absolute inset-0">
                {s.video ? (
                  <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="h-full w-full object-cover"
                  >
                    <source src={s.video} type="video/mp4" />
                  </video>
                ) : (
                  <img
                    src={s.image}
                    alt={s.title}
                    className="h-full w-full object-cover"
                  />
                )}
                <div
                  className="absolute inset-0 bg-black/60"
                  aria-hidden="true"
                />
              </div>

              {/* Content */}
              <div className="relative z-10 flex h-full items-center justify-center px-4 pb-32 md:pb-40">
                <div className="max-w-2xl text-center">
                  {/* Kicker */}
                  <div className="text-sm font-semibold uppercase tracking-wider text-white/80 mb-3">
                    {s.kicker}
                  </div>

                  {/* Title with highlight */}
                  <h2 className="mb-4 text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
                    {s.title.split(s.highlight || "").map((part, i) => (
                      <React.Fragment key={i}>
                        {part}
                        {i < s.title.split(s.highlight || "").length - 1 && (
                          <em className="not-italic text-yellow-400">
                            {s.highlight}
                          </em>
                        )}
                      </React.Fragment>
                    ))}
                  </h2>

                  {/* Subtitle */}
                  <p className="mb-6 text-lg text-white/90 md:text-xl">
                    {s.subtitle}
                  </p>

                  {/* Code Display (if applicable) */}
                  {s.code && (
                    <div className="mb-8 flex items-center justify-center gap-3">
                      <span className="text-sm font-semibold text-white/75">
                        {s.codeLabel}
                      </span>
                      <div className="flex items-center gap-2 rounded border border-white/30 bg-white/10 px-4 py-2">
                        <code className="font-mono text-base font-bold text-white">
                          {s.code}
                        </code>
                      </div>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <a
                      href={s.primaryBtnHref}
                      className="inline-flex items-center justify-center rounded-lg bg-belims-blue px-6 py-3 font-semibold text-white transition-colors hover:bg-belims-light focus:outline-none focus:ring-2 focus:ring-white/30"
                    >
                      {s.primaryBtn}
                    </a>

                    {s.secondaryBtnText && s.secondaryBtnHref && (
                      <a
                        href={s.secondaryBtnHref}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/50 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
                      >
                        {s.secondaryBtnText}
                        <ChevronRight size={18} className="opacity-75" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Blocks - Positioned inside slider, static (no transition) */}

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white transition-all hover:bg-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 md:left-8"
          aria-label="Previous slide"
        >
          <ChevronLeft size={24} />
        </button>

        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white transition-all hover:bg-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 md:right-8"
          aria-label="Next slide"
        >
          <ChevronRight size={24} />
        </button>

        {/* Slide Indicators */}
        <div
          className="absolute bottom-6 left-1/2 z-40 flex -translate-x-1/2 gap-2"
          role="tablist"
          aria-label="Slide indicators"
        >
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide
                  ? "w-8 bg-white"
                  : "w-2 bg-white/50 hover:bg-white/75"
              }`}
              role="tab"
              aria-selected={index === currentSlide}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Vertical Category Menu - Left Sidebar inside container */}
        <div className="absolute left-0 top-0 w-full z-30 flex pointer-events-none">
          <div className="mx-auto max-w-[1380px] w-full flex">
            <div className="bg-white/95 backdrop-blur-sm overflow-y-auto no-scrollbar w-auto pointer-events-auto h-fit">
              <div className="flex flex-col py-6">
                {categories.map((category, idx) => (
                  <a
                    key={category.name}
                    href={category.href}
                    className={`group relative flex items-center justify-between px-6 py-4 text-gray-900 transition-all duration-200 whitespace-nowrap border-l-4 ${
                      idx === 0
                        ? "border-gray-900 bg-gray-50"
                        : "border-transparent hover:bg-gray-50 hover:border-gray-900"
                    }`}
                  >
                    {/* Category name and icon */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg flex-shrink-0">
                        {category.icon}
                      </span>
                      <span className="font-medium text-sm text-gray-900">
                        {category.name}
                      </span>
                    </div>

                    {/* Chevron icon on hover/active */}
                    <span className="ml-4 flex-shrink-0 text-gray-600 transition-all group-hover:translate-x-1">
                      →
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Closing section */}
    </section>
  );
};

export default HeroBanner;
