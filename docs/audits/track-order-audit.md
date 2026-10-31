# Track Order audit — `/track-order?order-number=UASSNTHC`

Date: 2026-10-31 · Status: **STEP 0 + STEP 1 done (2026-10-31). Questions answered with the recommended options. See "Fixed / Deferred" at the end.**

Files: `frontend/components/TrackOrderPage.tsx` (218 lines — form + fetch + polling), `frontend/components/TrackingProgressCard.tsx` (667 lines — normalisation + all UI), `frontend/services/tracking.ts` (types; `TrackResponse`), plugin `wp-content/plugins/global-site-settings/includes/bobgo-shipping/class-bobgo-tracking-endpoint.php` (`POST belims/v1/track`, public). Raw response: [track-order-raw-UASSNTHC.json](track-order-raw-UASSNTHC.json) (staff name anonymised).

## How the data flows

`POST {apiBase}/track {trackingRef}` → plugin calls Bob Go `GET /tracking?channel=<domain>&tracking_reference=<ref>` → returns `{success, trackingRef, status, eta, events[], raw:[shipment]}`.

- `events[]` is **not** the courier events: it is Bob Go's 5 *stepper steps* (label empty, `status/time/location` null, the real values sit in `events[i].raw`). The UI ignores it whenever `raw[0].checkpoints` exists.
- The real courier events are `raw[0].checkpoints[]` (also pre-grouped by date in `raw[0].grouped_checkpoints[]`).
- `UASSNTHC` only resolves on the **staging / sandbox** CMS (`wordpress-1482444-6707114.cloudwaysapps.com`, which the preview uses). Production `cms.belims.co.za` answers `"Shipment with reference UASSNTHC not found"` — and still as **HTTP 200 `success:true`** with empty `events` (see UI audit).
- Other sandbox refs found in the repo: `UASS33KZ` (delivered, 2 checkpoints, same shape) and `UASSBNJ9` (`pending-collection`, 0 checkpoints, steps: created=current, rest pending).

## 1. Data audit

`raw[0]` = `data.raw[0]`. "Bob Go" = what <https://track.sandbox.bobgo.co.za/UASSNTHC> renders (read in the browser pane). "Belims" = what the page renders today on belims.vercel.app (staging CMS), measured in the DOM.

| Field (API path) | In API? | Shown on Bob Go? | Shown on Belims today? | Notes |
|---|---|---|---|---|
| `trackingRef` / `raw[0].shipment_tracking_reference` / `id` | Yes (`UASSNTHC`) | Yes (title) | Yes — **3×** (input, header, shipment card) | |
| `status` / `raw[0].status_friendly` / `raw[0].status` | Yes (`Delivered` / `delivered`) | Yes (badge) | Yes (badge, twice) | Belims derives its own badge by substring-matching the status text |
| `raw[0].courier_name` | Yes (`Sandbox Couriers`) | Yes | Yes (pill + card) | |
| `raw[0].courier_slug`, `courier_logo`, `courier_phone` | Yes (phone empty) | Logo not in text; phone n/a | **No** | Phone is worth showing when present (support for a late parcel) |
| `raw[0].service_level` | Yes (`ECO – Economy`) | Yes | Yes (pill + card) | |
| `raw[0].service_level_delivery_type` | Yes (`door`) | No | No | `door` vs pickup point; drives pickup-point UI |
| `raw[0].order_number` / `channel_order_number` / `custom_order_name` | Yes (`5576`) | Yes | Yes | Same value three times in the API |
| `raw[0].merchant_name` | Yes (`Belims hardware `, trailing space) | Yes (bottom right of Shipping details) | **No** | On Belims's own page this is redundant — see Q |
| `raw[0].merchant_logo`, `show_branding`, `bob_go_logo*` | Yes (logo empty) | Bob Go logo | No | Bob Go branding — do not copy |
| `raw[0].shipment_time_created` | Yes (`2026-10-05 18:54:52+00:00`) | Yes → CREATED `5 Oct 2026 20:54` | **No (CREATED has no timestamp)** | Belims fills step times only from `events`, which contain no "Created" event. Source exists: `shipment_time_created` and `tracking_steps.created.time` |
| `raw[0].tracking_steps.{created,collected,in-transit,out-for-delivery,delivered}.stage` (`done`/`current`/`pending`) | Yes | Yes (drives tick state) | **No — stage ignored**; state inferred from status text | Courier skipped in-transit / out-for-delivery but API says `stage:"done"`, `time:""` |
| `raw[0].tracking_steps.*.time` | Yes (created, collected, delivered set; transit steps `""`) | Yes (shown only when set) | Partly (collected, delivered; not created) | `+00:00` UTC; Bob Go converts to SAST |
| `raw[0].tracking_steps.*.label / step_number / image` | Yes | Label yes, images (box art / ticks) | Label yes | Images are Bob Go assets — not to be copied |
| `raw[0].shipment_movement_events.{collected,in_transit,out_for_delivery,ready_for_pickup,delivered}_time` | Yes | Indirectly | No | Duplicates `tracking_steps` times; useful fallback |
| `raw[0].checkpoints[].status_friendly` / `status` | Yes | Yes (event title) | Yes | |
| `raw[0].checkpoints[].message` (`Manually set by …`) | Yes | **Yes** (event description) | **No — dropped** | `eventLabelFromCheckpoint` takes `status_friendly` first, so `message` is never rendered; the second line shows `location` (empty → "—") |
| `raw[0].checkpoints[].time` (`+02:00`) | Yes | Yes (`21:26`) | Yes (`Mon, 05 Oct 2026, 21:26`, browser-locale) | Already SAST here |
| `raw[0].checkpoints[].time_string` (`21:26`) | Yes | Yes | No | Server-formatted; not needed if we format ourselves |
| `raw[0].checkpoints[].location / city / zone / country / zip` | Yes (all `""` for manual events) | n/a (empty) | `—` placeholder | Real courier scans should populate these; hide when empty |
| `raw[0].grouped_checkpoints[].date` (`Mon, 5 October 2026`) + `.checkpoints[]` | Yes | **Yes** (date heading, times beneath) | **No — flat list** | Belims ignores the pre-grouped data |
| `raw[0].last_checkpoint_time` | Yes (`""`) | No | No | Belims computes "Updated" from the newest event |
| `eta` / `etaText`, `raw[0].shipment_earliest_delivery_date`, `shipment_estimated_delivery_date_from/to` | Yes (all empty — delivered) | Not shown | `Estimated Arrival —` row | Hide when empty or terminal |
| `raw[0].has_ready_for_pickup_status`, `show_pickup_point_details`, `show_pickup_point_details_instructions`, `pickup_point_header`, `pickup_point_location_type`, `pickup_point_instructions`, `pickup_point_provider_name`, `pickup_point_provider_logo` | Yes (false / empty) | Not shown for this shipment | No | Needed for pickup-point deliveries (ready-for-pickup step + instructions) |
| `raw[0].type` (`shipment`) | Yes | No | No | |
| `raw[0].customer`, `raw[0].expected_delivery_date`, `raw[0].current_status` | **Not in this payload** | — | Read by code (`customer`, `expected_delivery_date`, `current_status`) | Dead mappings from an older shape; `customer` row never renders |
| POD / signature / recipient / parcel count / weight / delivery address / submitted & collection dates (beyond steps) | **Not returned** | Not shown | Not shown | Cannot be shown without inventing data. Available only if Bob Go returns them for other shipments / another endpoint |

### Known gaps from the brief — confirmed

| Gap | Confirmed | Cause |
|---|---|---|
| CREATED has no timestamp | Yes | Step times derived from event labels; no "Created" event exists. Use `tracking_steps.created.time` / `shipment_time_created` |
| Event descriptions render "—" | Yes | `message` is never mapped; `location` is empty and shown as "—" |
| Events not grouped by date | Yes | `grouped_checkpoints` ignored |
| Merchant name missing | Yes (field exists: `merchant_name`) | Not mapped |

## 2. UI / UX audit

| Area | Issue | Sev | Evidence | Proposed fix |
|---|---|---|---|---|
| Stepper | Inverted end state: completed steps are filled, the final **Delivered** step is an outline with a pulsing ring | P1 | `isDone = idx < activeIdx`; active gets `bg-white border-2` + `softPulse` | Terminal state = most complete (filled + check, no pulse) |
| Stepper | Skipped steps look identical to completed ones; no timestamp but full-colour | P1 | In transit / Out for delivery: API `stage:"done"`, `time:""`; UI colours all `idx < activeIdx` | Distinguish completed (time) / implied-skipped / current / pending (needs Q1) |
| Stepper | Progress bar is a separate 3px line above the icons, not connecting them | P1 | Separate `h-[3px]` div before the grid | Connector track between steps that fills to the current step |
| Stepper (375px) | 5 steps at 47px each; labels and dates overflow their columns and overlap | P0 | Measured at 375px: every step cell `scrollWidth > clientWidth`; date strings "Mon, 05 Oct 2026, 21:09" in 11px | Condensed / stacked stepper on mobile |
| Dates | `toLocaleString(undefined…)` → browser locale and timezone ("Mon, Oct 05, 2026, 09:26 PM" in en-US), not en-ZA 24h / SAST | P1 | `formatFriendlyDate` | One formatter: `en-ZA`, 24h, `Africa/Johannesburg` ("5 Oct 2026, 21:26") |
| Dates | API strings use a space (`2026-10-05 21:26:56+02:00`); `new Date()` of that is `Invalid Date` in older Safari → the raw string is shown | P1 | `safeDate()` | Normalise to ISO (`T`) before parsing |
| Placeholders | `—` shown for empty location, ETA, courier, service | P1 | 3 dashes measured; "Estimated Arrival —" on a delivered shipment | Hide empty fields; ETA row → "Delivered on …" when delivered |
| Controls | Refresh and Auto-refresh stay active on a terminal (delivered) status; polling continues if toggled | P1 | No terminal check | Hide / disable on delivered, returned, cancelled |
| Controls | Auto-refresh is a `<button>` styled as a switch without `role="switch"` / `aria-checked` | P1 | `toggleRole: none` | `role="switch"` + `aria-checked` |
| Controls | Copy link uses `alert("Tracking link copied ✅")` (blocking dialog) and `prompt()` fallback | P1 | `copyLink` | Inline "Copied" status (live region) |
| Layout | Three nested bordered cards (page card → section card → inner boxes); the shipment box on the left is mostly empty | P1 | `rounded-xl` page card → `rounded-2xl` cards → `rounded-xl` boxes | Flatten; one surface level; single details list |
| Layout | Tracking reference appears three times (input, header, shipment card "Shipment") | P2 | Measured 2 text + input | Show once in the header |
| Layout | "Newest first" pill is **interactive** (toggles to "Oldest first") but looks decorative | P2 | `setNewestFirst` | Make it a labelled toggle or drop (Q3) |
| Layout | Section titles "Shipping details" / "Tracking events" are `div`s, not headings; page jumps H1 → nothing | P1 | Heading list: only the H1 | `h2` per section |
| States | **No loading skeleton** — only the button text changes | P1 | `loading` only affects the button | Skeleton |
| States | **No not-found state.** The endpoint returns HTTP 200 `success:true` with empty events for an unknown ref, so the page shows "No tracking events yet…" or just the tip | P0 | Prod CMS + `UASSNTHC` | Detect empty/`raw.message` "not found" client-side, or return 404 from the plugin (Q7) |
| States | **API errors are shown raw**: `throw new Error(await res.text())` can render a JSON blob; no retry button | P1 | `track()` | Friendly message + Retry |
| States | Empty submit silently does nothing; no invalid-format hint | P2 | `if (!value) return` | Inline validation message |
| States | No exception / failed-delivery treatment; the status badge only knows delivered / out for delivery / in transit / collected / pending — anything else ("failed", "returned", "exception") falls back to **"Pending collection"** | P0 | `badgeFromStatus` | Map more statuses; contact CTA on exceptions |
| States | `UASSBNJ9` (`pending-collection`, 0 checkpoints) shows an empty-events box; copy is fine but the stepper marks nothing as pending/current distinctly | P2 | | |
| Context | No link to the customer's order when signed in; no order items / address | P2 | Account → Track exists, reverse missing | Order context block (Q6) |
| Motion | `softPulse` animation runs infinitely; no `prefers-reduced-motion` guard; events use a staggered transition | P1 | `<style>` block | Respect reduced motion; remove pulse on terminal state |
| A11y | Input has only a placeholder — no `<label>` | P0 | `TrackOrderPage` form | Visible label |
| A11y | Stepper is `div`s: no `<ol>`, no `aria-current="step"`, no text alternative for state (colour-only) | P0 | `ol:false`, `aria-current:false` | `<ol>`, `aria-current`, sr-only state text |
| A11y | No live region for refresh / status changes / copy | P1 | `liveRegion:false` | `role="status"` |
| A11y | 10–12px grey text (`text-[11px]`, `text-xs text-gray-500` on `bg-gray-50` pills ≈ 4.3:1) | P1 | min font 10px measured | `text-caption` (13px) + token greys |
| A11y | No page title ("Belims Hardware") | P2 | `document.title` | "Track order UASSNTHC · Belims" |
| Design | Hard-coded colours (`blue-50`, `green-50`, `amber-50`, `rgba(30,64,175,…)`), radii mix (`rounded-xl/2xl/full`), shadows — not the approved tokens (industrial + brand, square-ish radii, no shadows) | P1 | throughout | Tokens: `belims-blue`, status tones from the account `StatusBadge` set |
| Code | `rawResult` state, `{false && rawResult}` debug block, `checkpoints` prop (unused), duplicate `NormalizedTracking` types in two files, dead `customer` / `current_status` / `expected_delivery_date` mappings | P2 | | Remove while rewriting |

## 3. Other statuses

Available now: delivered (`UASSNTHC`, `UASS33KZ`), `pending-collection` (`UASSBNJ9`). **No sandbox references available** for in transit, out for delivery, failed / exception, returned, ready for pickup, or an order with several shipments — see Questions.

## Decisions (recommended options accepted)

1 skipped steps = completed (no time shown, screen-reader text "no scan recorded") · 2 staff attribution relabelled "Updated by Belims team" · 3 newest first with a labelled Newest / Oldest toggle · 4 two columns on desktop (events left, summary right), flat · 5 delivered headline + "Need help" actions, refresh hidden · 6 signed-in: order link + items + total · 7 frontend only (`TrackOrderPage.tsx`, `TrackingProgressCard.tsx`, `services/tracking.ts`) · 8 several shipments → selector · 9 SAST always, merchant name hidden · 10 pickup-point step/instructions when flagged · 11 no extra sandbox refs supplied. Suggestions applied: courier phone (text only, no logo), page title, `noindex`.

## Fixed

- **Data:** CREATED timestamp (from `tracking_steps.created.time`, falling back to `shipment_time_created`); step times fall back to `shipment_movement_events`; step state taken from Bob Go's `stage` instead of guessing from status text; event message shown (relabelled when manual); events grouped by SAST date with the time under each; location / city / zone / country joined and hidden when empty; courier phone, pickup-point details, estimated delivery range, order number; ETA row removed once delivered; every `—` placeholder removed.
- **Formatting:** one formatter set in `services/tracking.ts` — `en-ZA`, 24 h, `Africa/Johannesburg`, no zero-padded day ("5 Oct 2026, 21:26", "Mon, 5 October 2026"); space-separated Bob Go timestamps normalised so Safari parses them.
- **Stepper:** connected track that fills to the current step; Delivered reads as the strongest state (filled green); vertical on mobile (343 px per step at 375 px, no overflow); `<ol>` + `aria-current="step"` + screen-reader state text; no pulse animation.
- **States:** loading skeleton; not found (a response without a shipment object); API error with Retry; refresh failure keeps the last result with a Retry banner; empty / malformed reference messages; delivered, delivery-problem and returned banners with call / email actions; statuses beyond the old five (failed, returned, ready for pickup, unknown) map correctly instead of falling back to "Pending collection".
- **Layout:** card nesting flattened to one level; reference shown once; sections are real headings; summary list with only populated rows.
- **Controls:** Refresh and Auto-refresh hidden on delivered / returned and polling stops; Auto-refresh is `role="switch"`; Copy link uses a live-region confirmation (no `alert()`), with a read-only field fallback; the sort pill is a labelled toggle.
- **A11y / quality:** input `<label>` + `aria-invalid` / `aria-describedby`; polite live region for lookups, refreshes and copy; focus moves to the reference heading after a lookup; `prefers-reduced-motion` honoured; 13 px minimum text; tap targets ≥ 44 px; page title and `noindex`; dead state / props / debug block and duplicate types removed.
- **Shared behaviour kept:** `?order-number=` lookup and shareable URL, the API contract, Copy link, the footer bands.

## Deferred / not verifiable

- **Not-found detection is client-side.** The plugin still answers HTTP 200 `success:true` for an unknown reference; returning 404 would need a plugin change and a Cloudways deploy (not requested).
- **Multiple shipments:** the selector is built but untested against live data — no multi-shipment reference exists. The same applies to **in transit / out for delivery / failed / returned / ready for pickup**: verified against payloads shaped like Bob Go's real ones (the real `UASSNTHC` and `UASSBNJ9` responses, mutated), not live sandbox shipments.
- **Fields the API does not return** (POD, signature, recipient, parcel count / weight, delivery address) remain unshown.
- **Raw `message` text other than "Manually set by …"** is shown as returned (courier-written).
- Footer helpers (`Delivery & collection`, `Returns` anchors) point to `#delivery` / `#returns`, so the delivered banner offers phone and email only.
