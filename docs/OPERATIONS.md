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

## Vercel

- **Project:** `belims`, framework Vite, root directory `frontend`, Node 24, production branch `vercel`. Git: `levon-brokenponyclub/belims-headless-react-app`.
- **Domains:** `www.belims.co.za` + `belims.co.za` (production); `belims.vercel.app` assigned to branch `main` (preview).
- **Config:** [`frontend/vercel.json`](../frontend/vercel.json)
  - Rewrites: `/api/:path*` → `https://cms.belims.co.za/wp-json/:path*`; everything else → `/app.html` (the homepage is `index.html` with the hero preload).
  - Headers: `/assets/*` `max-age=31536000, immutable`; `/images/*`, `/brands/*`, `/favicon.svg` 7 days + `stale-while-revalidate`. HTML stays `max-age=0`.
- **Env vars:** see [ARCHITECTURE → Environment variables](ARCHITECTURE.md#environment-variables-frontend). `VITE_*` values are build-time.
- **Deploy hooks:** "CMS Homepage (preview)" → `main` (currently in the CMS option `belims_vercel_deploy_hook`); "CMS Homepage" → `vercel` (switch to it at launch).
- **Forcing a build** of an already-deployed commit (e.g. after a fast-forward): `vercel deploy` from `frontend/`, or `POST https://api.vercel.com/v13/deployments` with `{"name":"belims","project":"<id>","gitSource":{"type":"github","repoId":1100803605,"ref":"main"}}`.
- **Do not** use *Promote* / *Redeploy to another environment* — builds carry their environment's `VITE_*` values.

## Cloudflare (`belims.co.za`, Free plan)

| Setting | Value | Why |
| --- | --- | --- |
| **Bot Fight Mode** | **Off** | It challenged Vercel's server-side (AWS) calls to `cms.belims.co.za/wp-json`. On Free, WAF skip rules **cannot** bypass it. |
| WAF custom rule "Skip bot protection for WP REST API" | Skip Super Bot Fight Mode for `/wp-json/belims/v1/`, `/wp-json/wp/v2/` | Harmless; kept. |
| Cache rule **"API catalogue"** | `www.belims.co.za` + path starts with `/api/belims/v1/products`, `/categories`, `/ecommerce-policies` → eligible, edge TTL *use origin Cache-Control, bypass if absent*, browser TTL *respect origin* | Origin sends `public, max-age=60, s-maxage=300, stale-while-revalidate=300` on JSON. Imunify challenge pages are `private, no-store` → never cached. |
| Images → **Transformations** | Enabled | Serves `/cdn-cgi/image/…` (AVIF/WebP, resized). Free tier: 5,000 unique transformations/month. |
| Web Analytics (RUM) | On | Core Web Vitals in the dashboard; filter by host `www.belims.co.za` (CMS admin traffic is mixed in otherwise). |

⚠ **Never** use an `override_origin` edge TTL on API paths: Imunify can return its challenge page as **200 `text/html`**, which would then be cached and served to everyone (happened for ~1 min on 2026-10-01).

Purge after urgent content changes: Cloudflare → Caching → Purge by URL (e.g. `https://www.belims.co.za/api/belims/v1/ecommerce-policies`).

## Cloudways / CMS

- **Server:** "Belims" #1482444, `209.38.84.64`, 5 apps (Belims WP CMS = `cms.belims.co.za`, its staging, and others). App path: `~/applications/uhkkwupuum/public_html`.
- **SSH:** master user via SSH Vault (`/vault-run "Belims CMS" "<cmd>"`). No root; `wp` (WP-CLI) is available.
- **Imunify360 SplashScreen ("One moment, please…")** challenges some `/wp-json/` requests from Vercel (AWS IPs) — the cause of intermittent `Belims API Error: Unexpected token '<'`. The Cloudways UI has **no per-path setting** (app Security only has Malware Protection/Vulnerability Scanner; server Security has IP-only firewall). **Open:** support escalation to whitelist `cms.belims.co.za` / exclude `/wp-json/` (server-level, root). Also see `CAPTCHA_DOS_ALERT` blacklists under server Security → Firewall.
- **Breeze / Varnish:** `/wp-json` excluded from page caching (Cloudways default). Breeze "Never cache" URLs must be absolute (`https://…/wp-json/`).
- **wp-config.php constants:** `BELIMS_FIREBASE_API_KEY` (required for Firebase sign-in).
- **Frontend URL:** ACF option `headless_frontend_url` = `https://belims.vercel.app` (environment `production`) → `get_frontend_url()` / `get_cors_origin()`. Used for the PayFast return redirect, the single allowed CORS origin and the Homepage live-version check. Switch to `https://www.belims.co.za` at launch.

### CMS plugin deploys

- **Script:** [`wp-content/plugins/deploy.sh`](../wp-content/plugins/deploy.sh) — updates `GLOBAL_SITE_SETTINGS_DEPLOY_TIMESTAMP`, commits + pushes the **current branch**, then tars `global-site-settings/` over SSH into the app.
- **Targeted deploy (preferred for small changes):** back up and upload only the changed files, e.g.
  ```bash
  tar -czf - global-site-settings.php includes/<file>.php | /vault-run "Belims CMS" "tar -xzf - -C public_html/wp-content/plugins/global-site-settings"
  ```
  then `php -l` the files on the server. Check server copies match git before overwriting (no drift).
- Every plugin change bumps the version in `global-site-settings.php` (header + `GLOBAL_SITE_SETTINGS_VERSION`) and gets a [CHANGELOG](../CHANGELOG.md) entry.
- **GitHub Actions workflow** [`.github/workflows/deploy-cloudways.yml`](../.github/workflows/deploy-cloudways.yml) (SFTP mirror of `global-site-settings`, `uafrica-shipping` and `wp-config.php` to `/public_html/`) is **disabled** — manual `workflow_dispatch` only since 2026-10-01, because `main` is now the preview branch. It never ran successfully (GitHub account locked for billing). Do not re-enable it without removing the `wp-config.php` step. Former setup notes: [archive/github/DEPLOYMENT.md](archive/github/DEPLOYMENT.md).

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
