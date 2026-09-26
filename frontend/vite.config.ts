import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), "");
  const cmsUrl = env.VITE_CMS_URL || "https://cms.belims.co.za";

  return {
    base: "/",
    server: {
      port: 3000,
      strictPort: true, // WP CORS allowlist is locked to :3000 — fail loudly instead of drifting to :3001
      host: "0.0.0.0",
      proxy: {
        // Mirror Netlify/Vercel redirect: /api/* -> CMS /wp-json/*
        // Bypass Vercel serverless function routes — those only run on Vercel, not locally
        "/api": {
          target: cmsUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, "/wp-json"),
          bypass(req) {
            const vercelFunctions = ["/api/google-reviews"];
            if (vercelFunctions.some((fn) => req.url?.startsWith(fn))) {
              return false;
            }
          },
        },
      },
    },
    plugins: [
      react(),
      {
        name: "dev-api-mock-stub",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const url = req.url || "";

            if (url.startsWith("/api/google-reviews")) {
              const payload = {
                placeRating: 4.8,
                totalRatings: 247,
                reviews: [
                  {
                    id: "stub-1",
                    reviewer: "Sarah Johnson",
                    rating: 5,
                    review:
                      "Excellent service and a massive range of stock. Staff knew exactly what I needed and had it ready in minutes. Will definitely be back.",
                    date: "2026-09-10T09:00:00Z",
                    relativeTime: "2 weeks ago",
                    photoUrl: null,
                    source: "google",
                  },
                  {
                    id: "stub-2",
                    reviewer: "Mark Dlamini",
                    rating: 5,
                    review:
                      "Best hardware store in the area. Competitive pricing and the staff actually know their products — refreshing to get real advice.",
                    date: "2026-09-03T14:30:00Z",
                    relativeTime: "3 weeks ago",
                    photoUrl: null,
                    source: "google",
                  },
                  {
                    id: "stub-3",
                    reviewer: "Priya Naidoo",
                    rating: 4,
                    review:
                      "Good selection and fair prices. Slight wait at the counter on weekends but the team is friendly and efficient once they get to you.",
                    date: "2026-08-28T11:00:00Z",
                    relativeTime: "4 weeks ago",
                    photoUrl: null,
                    source: "google",
                  },
                ],
              };
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(payload));
              return;
            }

            if (
              url.startsWith("/api/ecommerce-policies") ||
              url.startsWith("/api/belims/v1/ecommerce-policies")
            ) {
              const payload = {
                store_locations: [
                  {
                    id: "umzinto",
                    name: "Belims Umzinto",
                    address:
                      "Lot 12 of 284, Belims Centre, Main Road, Umzinto, KwaZulu-Natal, 4200",
                    phone: "+27 39 974 1234",
                    latitude: -30.3117,
                    longitude: 30.6653,
                    mon_open: "07:30",
                    mon_close: "17:00",
                    tue_open: "07:30",
                    tue_close: "17:00",
                    wed_open: "07:30",
                    wed_close: "17:00",
                    thu_open: "07:30",
                    thu_close: "17:00",
                    fri_open: "07:30",
                    fri_close: "17:00",
                    fri_break_start: "12:00",
                    fri_break_end: "13:30",
                    sat_open: "07:30",
                    sat_close: "13:00",
                    sun_open: "08:30",
                    sun_close: "12:00",
                  },
                  {
                    id: "durban-central",
                    name: "Belims Durban Central",
                    address:
                      "142 Monty Naicker Rd, Durban Central, Durban, KwaZulu-Natal, 4001",
                    phone: "+27 31 301 5678",
                    latitude: -29.8587,
                    longitude: 31.0218,
                    mon_open: "07:30",
                    mon_close: "17:00",
                    tue_open: "07:30",
                    tue_close: "17:00",
                    wed_open: "07:30",
                    wed_close: "17:00",
                    thu_open: "07:30",
                    thu_close: "17:00",
                    fri_open: "07:30",
                    fri_close: "17:00",
                    fri_break_start: "12:00",
                    fri_break_end: "13:30",
                    sat_open: "07:30",
                    sat_close: "13:00",
                    sun_open: "08:30",
                    sun_close: "12:00",
                  },
                ],
              };
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(payload));
              return;
            }

            if (url.startsWith("/api/wp/v2/product_brand")) {
              const brands = [
                { id: 1, name: "Bosch", slug: "bosch", count: 12 },
                { id: 2, name: "Makita", slug: "makita", count: 8 },
                { id: 3, name: "DeWalt", slug: "dewalt", count: 10 },
                { id: 4, name: "Stanley", slug: "stanley", count: 15 },
                { id: 5, name: "Einhell", slug: "einhell", count: 6 },
                { id: 6, name: "Ryobi", slug: "ryobi", count: 9 },
              ];
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(brands));
              return;
            }

            if (
              url.startsWith("/api/belims/v1/products/filters") ||
              url.startsWith("/api/products/filters")
            ) {
              const payload = {
                range: [
                  { id: 1, name: "Professional", slug: "professional", count: 12 },
                  { id: 2, name: "Heavy Duty", slug: "heavy-duty", count: 8 },
                  { id: 3, name: "DIY & Home", slug: "diy-home", count: 15 },
                  { id: 4, name: "Cordless Series", slug: "cordless-series", count: 9 },
                ],
                color: [
                  { id: 1, name: "Blue", slug: "blue", count: 8 },
                  { id: 2, name: "Red", slug: "red", count: 6 },
                  { id: 3, name: "Teal", slug: "teal", count: 7 },
                  { id: 4, name: "Yellow", slug: "yellow", count: 5 },
                  { id: 5, name: "Black", slug: "black", count: 10 },
                ],
                brand: [
                  { id: 1, name: "Bosch", slug: "bosch", count: 12 },
                  { id: 2, name: "Makita", slug: "makita", count: 8 },
                  { id: 3, name: "DeWalt", slug: "dewalt", count: 10 },
                  { id: 4, name: "Stanley", slug: "stanley", count: 15 },
                ],
              };
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(payload));
              return;
            }

            if (url.startsWith("/api/jwt-auth/v1/token")) {
              const payload = {
                token: `dev_jwt_token_${Date.now()}`,
                user_email: "customer@belims.co.za",
                user_nicename: "Customer",
                user_display_name: "Valued Customer",
                message: "Login successful",
              };
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(payload));
              return;
            }

            next();
          });
        },
      },
    ],
    define: {
      // Expose REACT_APP_ environment variables to the client
      "import.meta.env.REACT_APP_GEMINI_API_KEY": JSON.stringify(
        env.REACT_APP_GEMINI_API_KEY,
      ),
      "import.meta.env.REACT_APP_WOO_SITE_URL": JSON.stringify(
        env.REACT_APP_WOO_SITE_URL,
      ),
      "import.meta.env.REACT_APP_WOO_CONSUMER_KEY": JSON.stringify(
        env.REACT_APP_WOO_CONSUMER_KEY,
      ),
      "import.meta.env.REACT_APP_WOO_CONSUMER_SECRET": JSON.stringify(
        env.REACT_APP_WOO_CONSUMER_SECRET,
      ),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  };
});
