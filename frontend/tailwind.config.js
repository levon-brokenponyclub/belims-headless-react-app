/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        xl: "1380px",
        "2xl": "1380px",
      },
    },
    extend: {
      // ============================================
      // COLOR SYSTEM (Belims Premium + Semantic Aliases)
      // ============================================
      colors: {
        // Semantic aliases (source of truth for UI)
        canvas: "#F9F9F9", // page background
        surface: "#FFFFFF", // cards / header background
        ink: "#322783", // primary text
        muted: "#565969", // secondary text
        soft: "#ECF0F1", // subtle fills (chips, muted panels)
        subtle: "#E0E0E0", // thin border color
        brand: "#322783", // Belims primary blue
        accent: "#F97316", // Belims orange
        grey: "var(--color-grey)",
        "grey-light": "var(--color-grey-light)",
        "red-muted": "var(--color-red-muted)",
        "grey-medium": "var(--color-grey-medium)",

        // Legacy Belims palette (for backwards compatibility)
        "belims-blue": "#322783",
        "belims-light": "#0B4AA2",
        "belims-accent": "#F97316",
        belims: {
          // Brand / primary
          navy: "#322783", // Primary CTA, headings, nav
          red: "#DF1119", // TRUE accent (badges, key highlights, errors)
          orange: "#F97316", // Optional — use sparingly (urgency only)

          // Neutrals / surfaces
          white: "#FFFFFF",
          canvas: "#F9F9F9", // page background
          surface: "#FFFFFF", // cards
          soft: "#ECF0F1", // subtle fills (chips, muted panels)
          border: "#E0E0E0",

          // Text
          ink: "#322783", // primary text
          muted: "#565969", // secondary text
        },

        // Optional semantic aliases (keep restrained)
        success: {
          50: "#ECFDF3",
          700: "#027A48",
        },
        warning: {
          50: "#FFFAEB",
          700: "#B54708",
        },
        danger: {
          50: "#FEF3F2",
          700: "#B42318",
        },
        info: {
          50: "#EFF8FF",
          700: "#175CD3",
        },
      },

      // ============================================
      // TYPOGRAPHY SYSTEM - SINGLE SOURCE OF TRUTH
      // ============================================
      fontFamily: {
        heading: ["Instrument Sans", "sans-serif"],
        body: ["Instrument Sans", "sans-serif"],
        sans: ["Instrument Sans", "sans-serif"],
      },

      fontWeight: {
        normal: "500",
        medium: "500",
        semibold: "600",
        bold: "700",
      },

      fontSize: {
        xs: ["11px", { lineHeight: "1.6", letterSpacing: "0.02em" }],
        sm: ["12px", { lineHeight: "1.6", letterSpacing: "0.01em" }],
        base: ["15px", { lineHeight: "1.6", letterSpacing: "0" }],
        md: ["15px", { lineHeight: "1.6", letterSpacing: "0" }],
        lg: ["16px", { lineHeight: "1.6", letterSpacing: "-0.01em" }],

        h6: [
          "25px",
          { lineHeight: "1.6", letterSpacing: "0", fontWeight: "700" },
        ],
        h5: [
          "29px",
          { lineHeight: "1.6", letterSpacing: "0", fontWeight: "700" },
        ],
        h4: [
          "35px",
          { lineHeight: "1.6", letterSpacing: "0", fontWeight: "700" },
        ],
        h3: [
          "45px",
          { lineHeight: "1.6", letterSpacing: "0", fontWeight: "700" },
        ],
        h2: [
          "51px",
          { lineHeight: "1.6", letterSpacing: "0", fontWeight: "700" },
        ],
        h1: [
          "64px",
          { lineHeight: "1.6", letterSpacing: "0", fontWeight: "700" },
        ],

        "display-sm": [
          "64px",
          { lineHeight: "1.6", letterSpacing: "0", fontWeight: "700" },
        ],
        "display-md": [
          "72px",
          { lineHeight: "1.6", letterSpacing: "0", fontWeight: "700" },
        ],
        "display-lg": [
          "88px",
          { lineHeight: "1.6", letterSpacing: "0", fontWeight: "700" },
        ],

        price: [
          "20px",
          { lineHeight: "1.6", letterSpacing: "0", fontWeight: "700" },
        ],
        "price-lg": [
          "28px",
          { lineHeight: "1.6", letterSpacing: "0", fontWeight: "700" },
        ],

        label: [
          "11px",
          { lineHeight: "1.6", letterSpacing: "0.05em", fontWeight: "600" },
        ],
        button: [
          "15px",
          {
            lineHeight: "1.6",
            letterSpacing: "0",
            fontWeight: "700",
            textTransform: "capitalize",
          },
        ],
      },

      letterSpacing: {
        tighter: "-0.03em",
        tight: "-0.02em",
        slight: "-0.01em",
        normal: "0",
        wide: "0.02em",
        wider: "0.05em",
        widest: "0.1em",
      },

      // Border radius
      borderRadius: {
        pill: "10rem",
        block: "1rem",
        sm: "0.5rem",
      },

      // Button defaults (sizing & styling)
      maxHeight: {
        "btn-height": "48px",
      },

      // Premium shadow tokens for cards and elevated states
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.06)",
        pop: "0 8px 24px rgba(16,24,40,0.08)",
        float: "0 6px 18px rgba(16,24,40,0.08)",
      },
    },
  },
  plugins: [],
};
