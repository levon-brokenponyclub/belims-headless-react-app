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
      host: "0.0.0.0",
      proxy: {
        // Mirror Netlify redirect: /api/* -> CMS /wp-json/*
        "/api": {
          target: cmsUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, "/wp-json"),
        },
      },
    },
    plugins: [react()],
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
