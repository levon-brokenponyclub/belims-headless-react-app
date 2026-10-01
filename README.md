# Belims Hardware — Headless WooCommerce Store

Headless storefront for Belims Hardware: a React + TypeScript + Vite frontend on Vercel, backed by WordPress/WooCommerce at `cms.belims.co.za` (Cloudways) through a custom REST API.

| | URL | Branch |
| --- | --- | --- |
| Production (Coming Soon until launch) | https://www.belims.co.za | `vercel` |
| Preview (development) | https://belims.vercel.app | `main` |
| CMS | https://cms.belims.co.za/wp-admin | — |

> **Humans and AI agents: read this file first**, then follow the links below for the area you're working on. Record every change in [CHANGELOG.md](CHANGELOG.md).

---

## Documentation map

| Doc | Read it for |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Repo layout, routes, data flow, images, env vars, design tokens |
| [docs/FEATURES.md](docs/FEATURES.md) | What the storefront and CMS do, and where each feature lives |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Vercel, Cloudflare, Cloudways, plugin deploys, local dev, performance baseline |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Open work, urgent issues, **launch checklist** |
| [CHANGELOG.md](CHANGELOG.md) | Full change history + how to write entries |
| [Global Site Settings plugin](wp-content/plugins/global-site-settings/README.md) · [user guide](wp-content/plugins/global-site-settings/USERGUIDE.md) | CMS plugin: REST API, admin dashboard, FTG / BobGo / PayFast / Firebase |
| [AI Product Descriptions plugin](wp-content/plugins/belims-ai-product-descriptions/README.md) · [user guide](wp-content/plugins/belims-ai-product-descriptions/USERGUIDE.md) | Gemini product descriptions in WP admin |
| [docs/archive/](docs/archive/README.md) | Superseded plans and notes (reference only) |

---

## Getting started (local)

Prerequisites: Node.js 20+ (Vercel builds on Node 24), npm, Git.

```bash
git clone https://github.com/levon-brokenponyclub/belims-headless-react-app.git
cd belims-headless-react-app/frontend
npm install
cp .env.example .env.local   # fill in VITE_FIREBASE_* and VITE_GOOGLE_MAPS_API_KEY
npm run dev                  # http://localhost:3000
```

- Port **3000 is fixed** (`strictPort`) — the CMS CORS allowlist expects it.
- `/api/*` is proxied to `https://cms.belims.co.za/wp-json/*` (override with `VITE_CMS_URL`). No local WordPress is needed.
- `npm run build` → `frontend/dist`. Env var reference: [ARCHITECTURE → Environment variables](docs/ARCHITECTURE.md#environment-variables-frontend).

---

## Deployment (Vercel)

Vercel project `belims` (team `levon-brokenponycs-projects`), root directory `frontend`, connected to `levon-brokenponyclub/belims-headless-react-app`. Infrastructure detail: [docs/OPERATIONS.md](docs/OPERATIONS.md).

### Branches & environments

| Branch | Vercel environment | URL | Purpose |
| --- | --- | --- | --- |
| `main` | Preview | https://belims.vercel.app (public) | Development & verification |
| `vercel` | Production | https://www.belims.co.za | Live site (Coming Soon until launch) |

### Workflow

1. Commit to `main` and push → Vercel builds a Preview deployment and serves it on `belims.vercel.app`.
2. Verify on https://belims.vercel.app.
3. Release to production by fast-forwarding `vercel`:

```bash
git push origin main:vercel
```

### Rules

- **Release through Git only.** `VITE_*` variables are inlined at build time, so a build carries the environment it was built for. Do not use Vercel's *Promote* or *Redeploy* to move a build between Preview and Production — that is how a Production build (with `VITE_COMING_SOON=true`) leaked onto `belims.vercel.app`.
- `VITE_COMING_SOON` is set for **Production only**. Remove it (and redeploy) at launch — see the [launch checklist](docs/ROADMAP.md#launch-checklist-wwwbelimscoza).
- Pushing a commit that Vercel has already built (e.g. after a fast-forward) does not trigger a new build. Use `vercel deploy` or the Vercel API (`POST /v13/deployments` with `gitSource.ref`) to force one.

### CMS-triggered builds

- Saving **Site Settings → Homepage** in the CMS fires the deploy hook(s) for the storefront(s) picked under *Saving rebuilds* (Preview → `main` hook "CMS Homepage (preview)", Production → `vercel` hook "CMS Homepage", or Both). Until launch it is set to **Preview**, so homepage content rebuilds `belims.vercel.app`.
- **At launch:** switch the option back to the `vercel` hook ("CMS Homepage") so content edits rebuild production, and set the CMS frontend URL (ACF option `headless_frontend_url`, currently `https://belims.vercel.app`) to `https://www.belims.co.za` — it drives the Homepage live-version check, the PayFast return URL and the CORS origin.

### CMS plugin deploys

- `wp-content/plugins/deploy.sh` bumps the deploy timestamp, commits and pushes the **current branch** (work on `main`), then uploads `global-site-settings` to the server. Targeted uploads and checks: [OPERATIONS → CMS plugin deploys](docs/OPERATIONS.md#cms-plugin-deploys).
- ⚠ There is a single CMS (`cms.belims.co.za`) behind both Preview and Production — plugin and WordPress content changes reach both immediately. "Preview first" applies to frontend code only.
- **Agent deploys files to the CMS on Cloudways** (`deploy.sh` or a targeted SSH upload) — and **asks the user for explicit approval before deploying any files to Cloudways**, every time, naming the files and the target.

---

## Working rules

- **Never commit secrets** (passwords, API keys, `wp-config.php`). Server credentials live in the local SSH Vault — see [OPERATIONS](docs/OPERATIONS.md).
- Don't edit vendored WordPress core or third-party plugins (`wp-admin/`, `wp-includes/`, WooCommerce, ACF, uAfrica…).
- Plugin changes: bump the plugin version and add a [CHANGELOG](CHANGELOG.md) entry.
- Keep docs in sync with the code — update the relevant file in `docs/` in the same commit.

## Tech stack

React 19 · TypeScript · Vite 6 · Tailwind CSS 3 · React Router 7 · Motion · Firebase Auth · WordPress + WooCommerce + ACF Pro · Vercel · Cloudflare · Cloudways.
