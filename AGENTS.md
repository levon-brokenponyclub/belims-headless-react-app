# Agent instructions — Belims headless

1. **Read [README.md](README.md) first**, then the doc for your area via its documentation map ([docs/README.md](docs/README.md)).
2. Check [docs/ROADMAP.md](docs/ROADMAP.md) for urgent issues and open work before starting.
3. Branches: develop on **`main`** (preview → https://belims.vercel.app). Release only with `git push origin main:vercel` (production → https://www.belims.co.za), and only when asked. Never Promote/Redeploy builds across Vercel environments.
4. One CMS (`cms.belims.co.za`) serves preview **and** production — plugin deploys and WP option changes are live immediately. Back up and diff server files before uploading ([docs/OPERATIONS.md](docs/OPERATIONS.md#cms-plugin-deploys)).
5. **Never commit secrets** or `wp-config.php`. Credentials come from the local SSH Vault, never from docs.
6. Don't edit vendored code: `wp-admin/`, `wp-includes/`, WooCommerce, ACF, uAfrica and other third-party plugins.
7. Every change: update the relevant doc in `docs/`, add a [CHANGELOG.md](CHANGELOG.md) entry (format at its top), bump the plugin version for plugin changes.
8. Verify before claiming done: `npm run build` (in `frontend/`), `php -l` for PHP, live checks against preview.
