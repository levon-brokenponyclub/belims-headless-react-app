import React from "react";
import ReactDOM from "react-dom/client";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import App from "./App";
import { ComingSoon } from "./components/ComingSoon";
import "./index.css";

// console.log("Belims deploy: 2026-02-12 container-1380");

// Production-only, build-time switch: when on, every route shows Coming Soon
// and the shop (routes, CMS fetches, LiveChat, cookie banner) never mounts.
const SHOW_COMING_SOON = import.meta.env.VITE_COMING_SOON === "true";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {SHOW_COMING_SOON ? <ComingSoon /> : <App />}
    <SpeedInsights />
    <Analytics />
  </React.StrictMode>,
);
