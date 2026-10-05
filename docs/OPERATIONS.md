# Operations

Hosting, deploys, caching and infrastructure quirks. Start at the root [README](../README.md) — the day-to-day **release workflow** is in [README → Deployment](../README.md#deployment-vercel). Code structure: [ARCHITECTURE.md](ARCHITECTURE.md).

> Never commit credentials. Server/SSH credentials live in the local **SSH Vault** (`~/Desktop/BPC/Sites/ssh-vault`, http://localhost:3005, entry "Belims" → app "Belims CMS").

---

## Environments at a glance

| | Preview | Production | CMS |
| --- | --- | --- | --- |
| URL | https://belims.vercel.app | https://www.belims.co.za (`belims.co.za` → 308 → www) | https://cms.belims.co.za |
| Source | branch `main` | branch `vercel` | Cloudways app `uhkkwupuum` ("Belims WP CMS"), server #1482444 `209.38.84.64` |
| Host | Vercel project `belims` (team `levon-brokenponycs-projects`, root `frontend`) | same | Cloudways Flexible (Imunify360) |
| Edge | Vercel only | Cloudflare (zone `belims.co.za`, Free plan) → Vercel | Cloudflare → Cloudways |
| Access | Public (Vercel Authentication **off**) | Public; shows Coming Soon until launch | WP admin |

There is **one CMS** behind both preview and production.

**Staging CMS (2026-10-02):** Cloudways *staging* app `xnmtexmyyf` (cloned from `uhkkwupuum`), https://wordpress-1482444-6707114.cloudwaysapps.com, path `~/applications/xnmtexmyyf/public_html`. No storefront reads from it. For testing plugin releases before production — see [Staging CMS](#staging-cms).

## Vercel

- **Project:** `belims`, framework Vite, root directory `frontend`, Node 24, production branch `vercel`. Git: `levon-brokenponyclub/belims-headless-react-app`.
- **Domains:** `www.belims.co.za` + `belims.co.za` (production); `belims.vercel.app` assigned to branch `main` (preview).
- **Config:** [`frontend/vercel.json`](../frontend/vercel.json)
  - Rewrites: `/api/:path*` → `https://cms.belims.co.za/wp-json/:path*`; everything else → `/app.html` (the homepage is `index.html` with the hero preload).
  - Headers: `/assets/*` `max-age=31536000, immutable`; `/images/*`, `/brands/*`, `/favicon.svg` 7 days + `stale-while-revalidate`. HTML stays `max-age=0`.
- **Env vars:** see [ARCHITECTURE → Environment variables](ARCHITECTURE.md#environment-variables-frontend). `VITE_*` values are build-time.
- **Deploy hooks:** "CMS Homepage (preview)" → `main` (CMS option `belims_vercel_deploy_hook_preview`); "CMS Homepage" → `vercel` (`belims_vercel_deploy_hook_production`). Which one a Homepage save triggers is chosen in Site Settings → Homepage → *Saving rebuilds* (`belims_homepage_deploy_target`: preview / production / both).
- **Forcing a build** of an already-deployed commit (e.g. after a fast-forward), or **when a push doesn't build**: `POST https://api.vercel.com/v13/deployments` with `{"name":"belims","project":"<id>","gitSource":{"type":"github","repoId":1100803605,"ref":"main","sha":"<sha>"}}` (a Git deployment keeps the branch domain). If pushes stop building (no Vercel status on the GitHub commit — seen 2026-10-01), check GitHub → Settings → Applications → Vercel and reconnect the repo in Vercel → Settings → Git.
- **Do not** use *Promote* / *Redeploy to another environment* — builds carry their environment's `VITE_*` values.

## Cloudflare (`belims.co.za`, Free plan)

| Setting | Value | Why |
| --- | --- | --- |
| **Bot Fight Mode** | **Off** | It challenged Vercel's server-side (AWS) calls to `cms.belims.co.za/wp-json`. On Free, WAF skip rules **cannot** bypass it. |
| WAF custom rule "Skip bot protection for WP REST API" | Skip Super Bot Fight Mode for `/wp-json/belims/v1/`, `/wp-json/wp/v2/` | Harmless; kept. |
| Cache rule **"API catalogue"** | `www.belims.co.za` + path starts with `/api/belims/v1/products` (incl. `/products/home`), `/categories`, `/ecommerce-policies` → eligible, edge TTL *use origin Cache-Control, bypass if absent*, browser TTL *respect origin* | Origin sends `public, max-age=60, s-maxage=300, stale-while-revalidate=300` on JSON. Imunify challenge pages are `private, no-store` → never cached. |
| Images → **Transformations** | Enabled | Serves `/cdn-cgi/image/…` (AVIF/WebP, resized). Free tier: 5,000 unique transformations/month. |
| Web Analytics (RUM) | On | Core Web Vitals in the dashboard; filter by host `www.belims.co.za` (CMS admin traffic is mixed in otherwise). |

⚠ **Never** use an `override_origin` edge TTL on API paths: Imunify can return its challenge page as **200 `text/html`**, which would then be cached and served to everyone (happened for ~1 min on 2026-10-01).

Purge after urgent content changes: Cloudflare → Caching → Purge by URL (e.g. `https://www.belims.co.za/api/belims/v1/ecommerce-policies`).

## Cloudways / CMS

- **Server:** "Belims" #1482444, `209.38.84.64`, 5 apps (Belims WP CMS = `cms.belims.co.za`, its staging, and others). App path: `~/applications/uhkkwupuum/public_html`.
- **SSH:** master user via SSH Vault (`/vault-run "Belims CMS" "<cmd>"`). No root; `wp` (WP-CLI) is available.
- **Imunify360 SplashScreen ("One moment, please…")** challenges some `/wp-json/` requests from Vercel (AWS IPs) — the cause of intermittent `Belims API Error: Unexpected token '<'`. The Cloudways UI has **no per-path setting** (app Security only has Malware Protection/Vulnerability Scanner; server Security has IP-only firewall). **Open:** support escalation to whitelist `cms.belims.co.za` / exclude `/wp-json/` (server-level, root). Also see `CAPTCHA_DOS_ALERT` blacklists under server Security → Firewall. **2026-10-02:** user disabled Imunify anti-bot protection and verified no Vercel IPs in the blocked IP list.
- **Breeze / Varnish:** `/wp-json` excluded from page caching (Cloudways default). Breeze "Never cache" URLs must be absolute (`https://…/wp-json/`).
- **wp-config.php constants:** `BELIMS_FIREBASE_API_KEY` (required for Firebase sign-in); `DISABLE_WP_CRON` = `true` (since 2026-10-05).
- **WP-Cron (production):** driven by a Cloudways **Cron Job Manager** job on app `uhkkwupuum` — every 5 minutes, type *Wget*, URL `https://cms.belims.co.za/wp-cron.php?doing_wp_cron` (the Wget type takes the URL only). Page loads no longer trigger WP-Cron, so the weekly FTG auto-sync, Action Scheduler and Bob Go background jobs depend on this job — if it is removed, set `DISABLE_WP_CRON` back to `false`. Check: Wget hits in `logs/backend_*access.log`; Bob Go → Settings shows cron **External**. Why: the CMS gets little direct traffic (storefront calls are often cached), so events fell behind.
- **Frontend URL:** ACF option `headless_frontend_url` = `https://belims.vercel.app` → `get_frontend_url()` / `get_cors_origin()`. It is the **default** storefront: the CORS fallback and the PayFast return for orders with no saved storefront. CORS allows every origin in `get_cors_origins()` (www, preview, `localhost:3000`, filter `belims_cors_origins`); each order saves the storefront it came from (`_belims_frontend_origin`) and PayFast returns the customer there. Switch the default to `https://www.belims.co.za` at launch.

### Staging CMS

- **Environment:** staging's `wp-config.php` sets `define('WP_ENVIRONMENT_TYPE', 'staging');` (production leaves it unset = `production`; local has `local`). It lives in wp-config, not the database, so clones and pushes never carry it. GSS 2.10.3+ reads it via `belims_environment()`: the Site Settings header badge shows the environment, and outside production the plugin never uses a production storefront URL (`www.belims.co.za` → preview), drops production origins from CORS / PayFast returns, refuses to save or run the **Production** homepage deploy hook, and warns if PayFast is live or BobGo is enabled with Production.
- **Safety settings (applied 2026-10-02):** FTG cron off, BobGo off, uAfrica + AI product descriptions plugins removed, deploy hooks cleared, `wp-content/mu-plugins/staging-block-mail.php` blocks all email (staging only — never commit or deploy it), search engines discouraged, PayFast in test mode.
- **Bob Go Sandbox + local storefront (2026-10-05):** the Bob Go Smart Shipping plugin on staging is on **Sandbox** (`api.sandbox.bobgo.co.za`, channel = the staging domain). For test orders run the local storefront against staging: `VITE_CMS_URL=https://wordpress-1482444-6707114.cloudwaysapps.com npm run dev` (in `frontend/`; staging CORS + default frontend URL = `http://localhost:3000`, PayFast test mode). Use **one tab** and don't reload while it loads — staging has no edge cache, and before GSS 2.10.9 repeated uncached catalogue requests saturated the shared server and slowed production.
- **WP-Cron (staging):** `DISABLE_WP_CRON` is `true`; a Cloudways Cron Job Manager job on `xnmtexmyyf` (every 5 min, Wget `https://wordpress-1482444-6707114.cloudwaysapps.com/wp-cron.php?doing_wp_cron`, added 2026-10-05) runs it — Bob Go order sync (Action Scheduler) needs it. FTG auto-sync stays off (event deleted).
- **Never push the staging database to production.** Release plugins to production by file (targeted deploy below) or Cloudways "push files only".

### CMS plugin deploys

- **Script:** [`wp-content/plugins/deploy.sh`](../wp-content/plugins/deploy.sh) — updates `GLOBAL_SITE_SETTINGS_DEPLOY_TIMESTAMP`, commits + pushes the **current branch**, then tars `global-site-settings/` over SSH into the app.
- **Targeted deploy (preferred for small changes):** back up and upload only the changed files, e.g.
  ```bash
  tar -czf - global-site-settings.php includes/<file>.php | /vault-run "Belims CMS" "tar -xzf - -C public_html/wp-content/plugins/global-site-settings"
  ```
  then `php -l` the files on the server. Check server copies match git before overwriting (no drift).
- Every plugin change bumps the version in `global-site-settings.php` (header + `GLOBAL_SITE_SETTINGS_VERSION`) and gets a [CHANGELOG](../CHANGELOG.md) entry.
- **Who deploys:** the agent deploys files to the CMS on Cloudways (`deploy.sh` or a targeted SSH upload via the SSH Vault). **Before deploying any files to Cloudways it asks the user and waits for explicit approval**, listing the files, the target path and the backup it will take. There is no CI/automatic deploy to Cloudways.

## Local development

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in VITE_FIREBASE_*, VITE_GOOGLE_MAPS_API_KEY
npm run dev                  # http://localhost:3000 (strictPort — the CMS CORS allowlist expects :3000)
```

- `/api/*` is proxied to `VITE_CMS_URL` (default `https://cms.belims.co.za`) `/wp-json/*`; `/api/google-reviews` is mocked locally.
- `npm run build` → `frontend/dist`; `npx vite preview` to serve it.
- Type-check edited files with `npx tsc --noEmit -p .` (ignore pre-existing errors in `frontend/backups/`).

## Performance baseline (2026-10-01)

| Lighthouse (local CLI, simulated) | Score | LCP | TBT |
| --- | --- | --- | --- |
| Desktop | 92 (PageSpeed: 97) | 1.4 s | 10 ms |
| Mobile | 55 | 6.1 s | 440 ms |

Mobile drivers: Firebase Auth `iframe.js` on every load (4.2 s in the critical chain) and 244 KB unused JS in one bundle — see [ROADMAP](ROADMAP.md).
