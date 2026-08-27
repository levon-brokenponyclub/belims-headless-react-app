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
      // COLOR SYSTEM — Nexvo (canonical) + Belims aliases
      // Source of truth: :root in index.css
      // ============================================
      colors: {
        // ── Nexvo brand (canonical) ──
        primary: "var(--color-primary)",
        "primary-soft": "var(--color-primary-soft)",
        "primary-on": "var(--color-primary-on)",
        secondary: "var(--color-secondary)",
        "secondary-on": "var(--color-secondary-on)",

        // ── Surfaces ──
        surface: "var(--color-surface)",
        "surface-raised": "var(--color-surface-raised)",
        "surface-muted": "var(--color-surface-muted)",
        "surface-soft": "var(--color-surface-soft)",
        "surface-dark": "var(--color-surface-dark)",

        // ── Text ──
        text: "var(--color-text)",
        "text-secondary": "var(--color-text-secondary)",
        "text-tertiary": "var(--color-text-tertiary)",
        "text-disabled": "var(--color-text-disabled)",

        // ── Borders ──
        border: "var(--color-border)",
        "border-soft": "var(--color-border-soft)",
        "border-strong": "var(--color-border-strong)",

        // ── Status ──
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        error: "var(--color-error)",

        // ── Native Nexvo badges ──
        "badge-sale": "var(--color-badge-sale)",
        "badge-new": "var(--color-badge-new)",
        "badge-hot": "var(--color-badge-hot)",
        "badge-coming": "var(--color-badge-coming)",
        "badge-soldout": "var(--color-badge-soldout)",
        "cart-bubble": "var(--color-cart-bubble)",

        // ── Semantic: stock states ──
        "stock-out": "var(--color-stock-out)",
        "stock-out-bg": "var(--color-stock-out-bg)",
        "stock-low": "var(--color-stock-low)",
        "stock-low-bg": "var(--color-stock-low-bg)",
        "stock-ok": "var(--color-stock-ok)",
        "stock-ok-bg": "var(--color-stock-ok-bg)",

        // ── Semantic: deal badges ──
        "deal-sale": "var(--color-deal-sale)",
        "deal-sale-on": "var(--color-deal-sale-on)",
        "deal-info-bg": "var(--color-deal-info-bg)",
        "deal-info-on": "var(--color-deal-info-on)",
        "deal-strike": "var(--color-deal-strike)",

        // ── Legacy aliases (repointed to Nexvo; remove next release) ──
        canvas: "var(--color-canvas)",
        ink: "var(--color-ink)",
        muted: "var(--color-muted)",
        soft: "var(--color-soft)",
        subtle: "var(--color-subtle)",
        brand: "var(--color-brand)",
        accent: "var(--color-accent)",
        grey: "var(--color-grey)",
        "grey-light": "var(--color-grey-light)",
        "grey-medium": "var(--color-grey-medium)",
        "red-muted": "var(--color-red-muted)",
        "belims-blue": "var(--color-primary)",
        "belims-light": "var(--color-primary)",
        "belims-accent": "var(--color-primary)",
        belims: {
          navy: "var(--color-primary)",
          red: "var(--color-deal-sale)",
          orange: "var(--color-primary-soft)",
          white: "var(--color-surface)",
          canvas: "var(--color-canvas)",
          surface: "var(--color-surface)",
          soft: "var(--color-surface-muted)",
          border: "var(--color-border)",
          ink: "var(--color-text)",
          muted: "var(--color-text-secondary)",
        },
        danger: {
          50: "#FEF3F2",
          700: "var(--color-error)",
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
        heading: ["Archivo", "Instrument Sans", "system-ui", "sans-serif"],
        body: ["Archivo", "Instrument Sans", "system-ui", "sans-serif"],
        sans: ["Archivo", "Instrument Sans", "system-ui", "sans-serif"],
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

        // Nexvo token-driven heading ramp (sources: --text-h{n} → --font-h{n}-size)
        h1: ["var(--text-h1)", { lineHeight: "1.1" }],
        h2: ["var(--text-h2)", { lineHeight: "1.15" }],
        h3: ["var(--text-h3)", { lineHeight: "1.2" }],
        h4: ["var(--text-h4)", { lineHeight: "1.25" }],
        h5: ["var(--text-h5)", { lineHeight: "1.3" }],
        h6: ["var(--text-h6)", { lineHeight: "1.4" }],

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
        // Nexvo token-driven button text (replaces pixel literal)
        button: ["var(--text-base)", { lineHeight: "1", fontWeight: "700" }],

        // Nexvo eyebrow + body utility classes
        eyebrow: [
          "var(--text-xs)",
          { lineHeight: "1.2", letterSpacing: "0.06em" },
        ],
        body: [
          "var(--text-base)",
          { lineHeight: "var(--font-body-line-height)" },
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

      // Border radius — Nexvo native scale (5/6/10/30/40/100px + circle)
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        badge: "var(--radius-badge)",
        pill: "var(--radius-pill)",
        circle: "var(--radius-circle)",
        button: "var(--radius-button)",
        card: "var(--radius-card)",
        block: "1rem",
      },

      // Button defaults (sizing & styling)
      maxHeight: {
        "btn-height": "48px",
      },

      // Nexvo spacing addition — keep parity with --space-15
      spacing: {
        15: "var(--space-15)",
      },

      // Premium shadow tokens for cards and elevated states.
      // Nexvo overrides: card/modal/drawer/up sourced from CSS tokens.
      boxShadow: {
        card: "var(--shadow-card)",
        pop: "0 8px 24px rgba(16,24,40,0.08)",
        float: "0 6px 18px rgba(16,24,40,0.08)",
        modal: "var(--shadow-modal)",
        drawer: "var(--shadow-drawer)",
        up: "var(--shadow-up)",
      },

      // Nexvo button motion easing
      transitionTimingFunction: {
        btn: "ease",
      },
    },
  },
  plugins: [],
};
