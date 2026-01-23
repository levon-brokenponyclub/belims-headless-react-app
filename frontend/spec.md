# Integrations and Custom Functionality


## AI Applications & Outcomes

- **Delivery (Content + Personalization):** Used Google Gemini to auto-generate product descriptions and the Paint Assistant palettes described in app/public/README.md; outcome — reduced manual content authoring time and sped up product launches (content ready in minutes vs hours), enabling faster catalog updates during promotions.

- **Automation (Builds & Secrets):** Automated environment validation and key checks for Netlify builds (`REACT_APP_GEMINI_API_KEY`, WooCommerce keys) and added scripts to fail fast on missing env vars; outcome — fewer broken deploys and quicker rollback, reducing build-related downtime.

- **Development (Scaffolding & API Mocks):** Used AI to generate TypeScript service stubs for the WooCommerce REST API and mock data from `cms-structure.json`, plus sample React components for the sticky product layout; outcome — shaved initial implementation time and provided consistent API contracts for frontend/backends to work in parallel.

- **QA (Test Generation & Visual Checks):** Generated unit and integration test skeletons and visual-regression test cases for key UX (gallery modal, buy box); outcome — earlier detection of regressions and a smaller manual QA cycle, improving release confidence.

- **Planning (Roadmap & Estimation):** Used AI-assisted summarization of feature requests (from README "Upcoming Features") to create prioritized sprint items and time estimates; outcome — clearer sprint planning, better stakeholder alignment, and measurable progress on high-priority items (faceted search, real-time inventory).

- **Decision-making (Pricing & Merchandising):** Employed Price Match grounding to surface competitor pricing patterns and recommend promotional thresholds (ties into Free Shipping Progress widget); outcome — data-driven pricing adjustments and promotions, improving competitiveness and conversion during test campaigns.
- **Netlify deployment hooks**: `netlify.toml` scoped to frontend folder with build/publish settings and env var expectations.
