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
      // COLOR SYSTEM (Belims Premium)
      // ============================================
      colors: {
        "belims-blue": "#04223E",
        "belims-light": "#0B4AA2",
        "belims-accent": "#F97316",
        belims: {
          // Brand / primary
          navy: "#04223E", // Primary CTA, headings, nav
          red: "#DF1119", // TRUE accent (badges, key highlights, errors)
          orange: "#F97316", // Optional — use sparingly (urgency only)

          // Neutrals / surfaces
          white: "#FFFFFF",
          canvas: "#F9F9F9", // page background
          surface: "#FFFFFF", // cards
          soft: "#ECF0F1", // subtle fills (chips, muted panels)
          border: "#E0E0E0",

          // Text
          ink: "#04223E", // primary text
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
        heading: ["Sora", "Inter", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },

      fontWeight: {
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
      },

      fontSize: {
        xs: ["11px", { lineHeight: "16px", letterSpacing: "0.02em" }],
        sm: ["12px", { lineHeight: "18px", letterSpacing: "0.01em" }],
        base: ["14px", { lineHeight: "22px", letterSpacing: "0" }],
        md: ["15px", { lineHeight: "24px", letterSpacing: "0" }],
        lg: ["16px", { lineHeight: "26px", letterSpacing: "-0.01em" }],

        h6: [
          "14px",
          { lineHeight: "20px", letterSpacing: "0.02em", fontWeight: "600" },
        ],
        h5: [
          "16px",
          { lineHeight: "24px", letterSpacing: "0", fontWeight: "600" },
        ],
        h4: [
          "18px",
          { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "600" },
        ],
        h3: [
          "20px",
          { lineHeight: "30px", letterSpacing: "-0.01em", fontWeight: "700" },
        ],
        h2: [
          "24px",
          { lineHeight: "32px", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
        h1: [
          "32px",
          { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "700" },
        ],

        "display-sm": [
          "36px",
          { lineHeight: "44px", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
        "display-md": [
          "42px",
          { lineHeight: "52px", letterSpacing: "-0.03em", fontWeight: "700" },
        ],
        "display-lg": [
          "56px",
          { lineHeight: "64px", letterSpacing: "-0.03em", fontWeight: "700" },
        ],

        price: [
          "20px",
          { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "700" },
        ],
        "price-lg": [
          "28px",
          { lineHeight: "36px", letterSpacing: "-0.02em", fontWeight: "700" },
        ],

        label: [
          "11px",
          { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "600" },
        ],
        button: [
          "14px",
          { lineHeight: "20px", letterSpacing: "0", fontWeight: "600" },
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

      // (Optional) consistent premium shadow tokens
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.06)",
        float: "0 6px 18px rgba(16,24,40,0.08)",
      },
    },
  },
  plugins: [],
};
