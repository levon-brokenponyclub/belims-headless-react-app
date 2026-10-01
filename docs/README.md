# Belims docs

Index of project documentation. **Start at the root [README](../README.md)** — it has the quick start, the preview → production workflow and working rules.

| Doc | Contents |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System overview, repo layout, routes, data flow, images, env vars, design system |
| [FEATURES.md](FEATURES.md) | Storefront + CMS features, with the files and endpoints behind each |
| [OPERATIONS.md](OPERATIONS.md) | Environments, Vercel, Cloudflare, Cloudways/Imunify, plugin deploys, local dev, performance baseline |
| [ROADMAP.md](ROADMAP.md) | Urgent issues, launch checklist, open work, ideas |
| [../CHANGELOG.md](../CHANGELOG.md) | Change history + how to write entries |
| [archive/](archive/README.md) | Superseded plans and notes — reference only |

Plugin docs live with each plugin:

- Global Site Settings — [README](../wp-content/plugins/global-site-settings/README.md) (developer overview, REST API) · [USERGUIDE](../wp-content/plugins/global-site-settings/USERGUIDE.md) (store admins)
- Belims AI Product Descriptions — [README](../wp-content/plugins/belims-ai-product-descriptions/README.md) · [USERGUIDE](../wp-content/plugins/belims-ai-product-descriptions/USERGUIDE.md)

Parent-repo reference: `belims-headless/docs/typography-migration.md` (typography token audit).

## Keeping docs current

- Change code → update the matching doc in the same commit, and add a [CHANGELOG](../CHANGELOG.md) entry.
- New feature → [FEATURES.md](FEATURES.md); new route/service/env var → [ARCHITECTURE.md](ARCHITECTURE.md); infra/hosting change → [OPERATIONS.md](OPERATIONS.md); done/added work → [ROADMAP.md](ROADMAP.md).
- Don't add new top-level `.md` files for one-off notes — extend these, or archive.
