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
        name: "dev-google-reviews-stub",
        configureServer(server) {
          server.middlewares.use("/api/google-reviews", (_req, res) => {
            const payload = {
              placeRating: 4.8,
              totalRatings: 247,
              reviews: [
                {
                  id: "stub-1",
                  reviewer: "Sarah Johnson",
                  rating: 5,
                  review: "Excellent service and a massive range of stock. Staff knew exactly what I needed and had it ready in minutes. Will definitely be back.",
                  date: "2026-09-10T09:00:00Z",
                  relativeTime: "2 weeks ago",
                  photoUrl: null,
                  source: "google",
                },
                {
                  id: "stub-2",
                  reviewer: "Mark Dlamini",
                  rating: 5,
                  review: "Best hardware store in the area. Competitive pricing and the staff actually know their products — refreshing to get real advice.",
                  date: "2026-09-03T14:30:00Z",
                  relativeTime: "3 weeks ago",
                  photoUrl: null,
                  source: "google",
                },
                {
                  id: "stub-3",
                  reviewer: "Priya Naidoo",
                  rating: 4,
                  review: "Good selection and fair prices. Slight wait at the counter on weekends but the team is friendly and efficient once they get to you.",
                  date: "2026-08-28T11:00:00Z",
                  relativeTime: "4 weeks ago",
                  photoUrl: null,
                  source: "google",
                },
                {
                  id: "stub-4",
                  reviewer: "Brendan Fourie",
                  rating: 5,
                  review: "Sourced a hard-to-find part within the day. Absolutely top-notch — this is how a hardware store should operate.",
                  date: "2026-08-20T08:45:00Z",
                  relativeTime: "5 weeks ago",
                  photoUrl: null,
                  source: "google",
                },
                {
                  id: "stub-5",
                  reviewer: "Thandi Mokoena",
                  rating: 5,
                  review: "Helped me plan my entire kitchen renovation with accurate material quantities. Saved me multiple trips and a lot of money.",
                  date: "2026-08-14T16:20:00Z",
                  relativeTime: "6 weeks ago",
                  photoUrl: null,
                  source: "google",
                },
                {
                  id: "stub-6",
                  reviewer: "Jacques van der Merwe",
                  rating: 5,
                  review: "Always well stocked and the staff go out of their way to help. My go-to for all trade and DIY supplies.",
                  date: "2026-08-07T13:10:00Z",
                  relativeTime: "7 weeks ago",
                  photoUrl: null,
                  source: "google",
                },
              ],
            };
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(payload));
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
