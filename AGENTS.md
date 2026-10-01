# Agent instructions — Belims headless

1. **Read [README.md](README.md) first**, then the doc for your area via its documentation map ([docs/README.md](docs/README.md)).
2. Check [docs/ROADMAP.md](docs/ROADMAP.md) for urgent issues and open work before starting.
3. Branches: develop on **`main`** (preview → https://belims.vercel.app). Release only with `git push origin main:vercel` (production → https://www.belims.co.za), and only when asked. Never Promote/Redeploy builds across Vercel environments.
4. One CMS (`cms.belims.co.za`) serves preview **and** production — plugin deploys and WP option changes are live immediately.
5. **Agent deploys files to the CMS on Cloudways — ask the user before deploying any files to Cloudways.** List the files, the target path and the backup, and wait for explicit approval every time; then back up, check server copies match git, upload, and `php -l` ([docs/OPERATIONS.md](docs/OPERATIONS.md#cms-plugin-deploys)). The same applies to changing WP options on the server.
6. **Never commit secrets** or `wp-config.php`. Credentials come from the local SSH Vault, never from docs.
7. Don't edit vendored code: `wp-admin/`, `wp-includes/`, WooCommerce, ACF, uAfrica and other third-party plugins.
8. Every change: update the relevant doc in `docs/`, add a [CHANGELOG.md](CHANGELOG.md) entry (format at its top), bump the plugin version for plugin changes.
9. Verify before claiming done: `npm run build` (in `frontend/`), `php -l` for PHP, live checks against preview.
