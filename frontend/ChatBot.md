Belims Chatbot — V1 Production State (March 2026)

This document captures the finalized V1 implementation of the Belims Chatbot in the frontend application.

Primary orchestrator:
src/features/chatbot/components/BelimsChatbot.tsx

⸻

1. Feature Overview

1.1 Product Discovery
• Live product recommendations (text query)
• Decision Acceleration Mode (guided, max 3 steps)
• Finder flow (guided, max 3 steps)
• Image search trigger (provider pending)
• Best-fit shortlist ranking logic
• Localized ranking bias (stock + availability aware)

⸻

1.2 Inventory + Fulfillment
• Live stock checks (SKU-based, backend proxied)
• Inventory enrichment (single + batch)
• Delivery enrichment (ETA + rate)
• Delivery address gating
• Delivery option selection (standard / next day / same day)
• Shared fulfillment context sync (PDP ↔ Chatbot)
• Need-it-fast sorting behavior
• Out-of-stock intelligent alternative suggestions

⸻

1.3 Cart / Orders / Payments
• Promo application journey (live proxy)
• Order creation (live proxy)
• Order tracking (live proxy)
• Payment intent initiation (live checkout flow)
• Product resolution by ID when not in memory list
• No simulated payment confirmation (sandbox is real journey)

⸻

1.4 Support + Retention
• Cart abandonment reminder scheduling (frontend orchestration)
• Human escalation trigger
• Local customer memory (localStorage)
• Resume banner (context continuation)

⸻

1.5 Trade Accounts Programme
• Loyalty system fully removed
• Trade Accounts Programme integrated
• Trade account status check tool
• Trade approval messaging
• Trade pricing awareness in chatbot responses
• Trade intelligence ready for expansion (bulk + ranking awareness)

⸻

2. Live Wiring Status

2.1 Fully Live / Backend Proxied

The chatbot no longer relies on a hardcoded fallback catalog.

Live proxies:
• productSearchApi
• getStockApi
• applyPromoApi
• createOrderApi
• trackOrderApi
• createPaymentIntentApi
• getTradeAccountApi

Buy now flow resolves product by ID via backend if not present locally.

⸻

2.2 API Route Map
• app/api/chat/route.ts
Rule-based planner with dynamic tool calls
• app/api/products/search/route.ts
Live backend proxy
• app/api/products/[id]/stock/route.ts
Live backend proxy
• app/api/cart/apply-promo/route.ts
Live backend proxy
• app/api/orders/create/route.ts
Live backend proxy
• app/api/orders/[id]/route.ts
Live backend proxy
• app/api/payments/intent/route.ts
Live backend proxy
• app/api/trade/account/route.ts
Live backend proxy

⸻

2.3 Not Yet Fully Wired
• app/api/products/search-image/route.ts → returns 501 (visual provider pending)
• app/api/cart/abandonment/route.ts → mock/TODO
• /api/customer/context → not implemented (cross-device memory pending)
• Chat route is rule-based (not LLM tool planner yet)

⸻

3. Decision Mode — Stable V1 Model

3.1 Step Model

Decision Mode now follows a strict 3-step maximum flow: 1. Product Query (required)
• “What are you shopping for?”
• Example options: Cordless drill, Circular saw, Paint, Nails, Skip 2. Budget 3. Priorities + Usage
• “Any priorities or must-haves?”
• Options:
• Home use
• Business use
• In-stock only
• Top rated
• Best value
• Fast delivery
• Skip

Product search is blocked until a valid product query exists.

⸻

3.2 Data Model Improvements
• usage?: "home" | "business" added
• buildDecisionQuery appends usage context when present
• Internal command strings are sanitized from decision answers
• Colon-contaminated values never render in summaries

⸻

3.3 Loop + Spam Protection
• Question count increments only after valid answer or skip
• Usage selections no longer satisfy product step
• Duplicate question rendering guard implemented
• Internal commands (CHECK*STOCK:\*, DECISION*_, FINDER\__) blocked from parsing
• Decision summary only renders when productQuery exists
• Tool-based intents hard-exit decision mode

⸻

4. Core Journeys

4.1 Recommendation Journey 1. User asks for products 2. Chat route emits productSearch 3. Results render 4. Enrichment applies stock + delivery metadata

⸻

4.2 Decision Journey 1. User triggers Decision Mode 2. Product → Budget → Priorities 3. Product search only runs when productQuery exists 4. Best Fit + shortlist rendered 5. No duplicate spam 6. No contamination from internal commands

⸻

4.3 Stock Journey 1. User taps Check stock 2. getStock tool runs directly 3. Stock card updates 4. Product cards refresh availability

No decision loop triggered.

⸻

4.4 Buy Now Journey 1. User taps Buy now 2. Product resolved via:
• in-memory list OR
• live fetch by ID 3. Order created 4. Payment intent initiated 5. Checkout continues normally

No false “Product not found” errors for valid SKUs.

⸻

4.5 Trade Accounts Journey 1. User requests trade status 2. getTradeAccount tool runs 3. Status block renders:
• Approved / Pending / Not registered 4. Messaging aligned with Trade pricing eligibility

Trade logic is isolated from Decision Mode.

⸻

5. Known Gaps
   • LLM planner not yet implemented
   • Visual search provider pending
   • Cart abandonment backend orchestration pending
   • Backend customer context pending
   • Results filter UI still visual-only
   • Trade intelligence can expand (bulk pricing nudges, account-aware ranking bias)

⸻

6. Key Files

Core:
• src/features/chatbot/components/BelimsChatbot.tsx
• src/features/chatbot/lib/decisionMode.ts
• src/features/chatbot/components/ChatMessageItem.tsx
• src/features/chatbot/lib/api.ts

Backend proxies:
• app/api/chat/route.ts
• app/api/products/search/route.ts
• app/api/products/[id]/stock/route.ts
• app/api/cart/apply-promo/route.ts
• app/api/orders/create/route.ts
• app/api/orders/[id]/route.ts
• app/api/payments/intent/route.ts
• app/api/trade/account/route.ts

⸻

7. V1 Status

V1 Complete
• Reviews fully removed
• Loyalty fully removed
• Trade Accounts Programme integrated
• Decision Mode loop + contamination issues resolved
• Payment flow aligned to real sandbox journey
• Live product search enforced
• Command parsing hardened
• Fulfillment-aware ranking stable

Belims Chatbot V1 is now:
• Structurally stable
• Loop-safe
• Tool-safe
• Production-aligned
• Trade-integrated
• Live-data backed

⸻

8. Next Phase
   1. Replace rule-based planner with LLM tool planner
   2. Integrate visual search provider
   3. Wire cart abandonment backend
   4. Implement backend customer context (cross-device memory)
   5. Expand trade-aware ranking + bulk intelligence

⸻

9. V2 Roadmap — Klarna-Level Assistant Evolution

V1 establishes a stable, tool-safe, live-data assistant.
V2 transforms the Belims Chatbot into a proactive, context-aware, trade-intelligent commerce assistant.

The goal is not just support automation — but conversion acceleration + lifecycle intelligence.

⸻

9.1 Persistent Intelligence (Cross-Device Memory)

Objective

Move from local session memory to backend-backed customer intelligence.

V2 Implementation
• Implement /api/customer/context backend
• Store:
• Viewed products
• Frequently browsed categories
• Trade account metadata
• Budget preferences
• Delivery location history
• Purchase history summary
• Decision patterns (fast delivery bias, cheapest bias, etc.)
• Sync context across:
• PDP
• Chatbot
• Checkout
• Account dashboard

Result

Assistant evolves from reactive to contextually continuous across sessions and devices.

⸻

9.2 LLM Tool Planner (Replace Rule-Based Chat Route)

Objective

Upgrade from rule-based chat/route.ts to structured LLM-based planner.

V2 Implementation
• Introduce:
• Tool-calling LLM layer
• Structured schema validation for tool outputs
• LLM decides:
• When to ask clarification
• When to call productSearch
• When to call getStock
• When to check Trade status
• When to escalate

Guardrails:
• Strict tool schema validation
• Safety layer to prevent command injection
• Deterministic fallback path

Result

Assistant becomes more natural, less brittle, and able to reason across multiple intents.

⸻

9.3 Decision Acceleration 2.0 (Conversion Engine)

Objective

Turn Decision Mode into a conversion accelerator.

Enhancements
• Smart defaults:
• Auto-skip steps when confidence > threshold
• Dynamic comparison table inline
• Trade-aware ranking boost
• Real-time urgency nudges:
• “Only 2 left at Umzinto”
• “Arrives tomorrow if ordered in 2h”
• Context-based focus bias:
• If trade account approved → prioritize trade specials
• If budget low → bias toward best value

Result

Assistant reduces time-to-purchase and improves checkout completion.

⸻

9.4 Proactive Intelligence Layer

Objective

Move from reactive to proactive assistant behavior.

V2 Additions
• On PDP open:
• “Need this delivered tomorrow?”
• “Trade special available on this item.”
• On cart idle:
• Suggest compatible accessories
• On repeat browsing:
• “Still comparing drills? Here’s the best-rated under R2500.”
• Trade intelligence:
• “Bulk pricing available on 10+ units.”

Guardrails:
• Max 1 proactive prompt per session
• Cooldown timer (5–10 minutes)

Result

Assistant behaves like a shopping concierge, not a support bot.

⸻

9.5 Trade Accounts Intelligence Expansion

Objective

Make Trade Accounts Programme a first-class intelligence layer.

Enhancements
• Bulk pricing awareness in product ranking
• Trade-only badge visibility inside chat
• “You save R239.85 with trade pricing”
• Trade upsell flows:
• If not registered → contextual CTA
• If pending → status nudges
• Trade checkout acceleration:
• Skip redundant validation steps

Result

Trade becomes a growth lever, not just a status check.

⸻

9.6 Visual Search Integration

Objective

Complete image search pipeline.

Implementation
• Integrate provider (e.g., AWS Rekognition / Google Vision / custom embedding)
• Convert image → embedding → vector similarity search
• Return confidence score
• Allow:
• “Find similar”
• “Find cheaper”
• “Find in stock near me”

Result

Unlocks hardware retail use cases (bring photo of part → find match).

⸻

9.7 Unified Fulfillment Intelligence

Objective

Make fulfillment part of ranking logic, not post-filter.

Enhancements
• ETA-aware ranking
• Pickup vs delivery bias based on:
• User history
• Store proximity
• Same-day prioritization for urgent users
• “Arrives tomorrow” sorting chip auto-enabled when urgency detected

Result

Assistant optimizes for delivery speed + availability, not just price.

⸻

9.8 Cart & Lifecycle Intelligence

Objective

Extend assistant beyond pre-purchase.

Add:
• Post-purchase:
• “Need accessories for your drill?”
• Warranty reminders
• Reorder flows
• Trade reorder shortcuts
• Smart reminders based on product lifecycle

⸻

9.9 Analytics + Optimization Layer

Add instrumentation for:
• Decision Mode completion rate
• Question drop-off rate
• Trade status checks
• Conversion after assistant interaction
• Fulfillment tab selection patterns
• Time-to-checkout delta

Result

Assistant becomes measurable revenue channel.

⸻

V2 Target State

At Klarna-level maturity, Belims Assistant will:
• Maintain persistent cross-device intelligence
• Reason with an LLM tool planner
• Proactively guide purchasing decisions
• Integrate deeply with Trade Accounts Programme
• Optimize for fulfillment speed and availability
• Reduce support tickets
• Increase checkout conversion
• Accelerate trade adoption
• Act as a revenue driver, not just a chat UI

⸻

Strategic Framing

V1 = Stable transactional assistant
V2 = Intelligent commerce layer

The transition is architectural, not cosmetic.
