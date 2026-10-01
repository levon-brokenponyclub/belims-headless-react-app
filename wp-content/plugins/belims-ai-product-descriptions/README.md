# Belims AI Product Descriptions

**Version:** 1.0.0 · **WordPress:** 5.8+ · **PHP:** 7.4+ · **Requires:** WooCommerce

Generates SEO-friendly WooCommerce product descriptions with Google Gemini, from the product edit screen or in bulk.

**Docs:** this file is the developer overview · admin how-to: [USERGUIDE.md](USERGUIDE.md) · project docs: [root README](../../../README.md) · history: [CHANGELOG.md](../../../CHANGELOG.md) · older notes: [docs/archive/plugins/belims-ai-product-descriptions/](../../../docs/archive/plugins/belims-ai-product-descriptions/)

---

## What it adds

| Surface | Where | Capability |
| --- | --- | --- |
| Settings page | **Settings → AI Descriptions** (`belims-ai-descriptions`) | Stores the Gemini API key (`manage_options`) |
| Product meta box | Product edit screen sidebar — "AI Product Description Generator" | Generate → preview → *Apply to Product* (inserts into the editor; you still click **Update**) |
| Bulk generator | **WooCommerce → Bulk AI Descriptions** (`belims-bulk-ai-descriptions`) | Lists products **without** a description; *Dry Run* (generate, don't save) or *Start Bulk Generation* (generate **and save**) (`manage_woocommerce`) |

## Files

```
belims-ai-product-descriptions/
├── belims-ai-product-descriptions.php   # Plugin bootstrap, settings page, meta box, bulk page, AJAX handlers, Gemini call
└── assets/
    ├── js/admin.js         # Meta box: generate / preview / apply (Classic + Block editor)
    ├── js/bulk-admin.js    # Bulk page: load, dry run, batch generation
    ├── css/admin.css
    └── css/bulk-admin.css
```

## How it works

1. JS sends an AJAX request (`wp_ajax_*`, nonce-protected).
2. PHP checks the nonce and capability, gathers product context (name, category, brand, features from short description/attributes).
3. Builds the prompt — ~100 words, SEO-optimised, professional hardware-store tone — and calls Gemini with `wp_remote_post()`.
4. Returns the text; the meta box previews it, the bulk handler saves it with `$product->set_description()` + `save()`.

| AJAX action | Purpose |
| --- | --- |
| `belims_generate_ai_description` | Single product (meta box) |
| `belims_get_products_without_description` | Bulk page product list |
| `belims_dry_run_generate_description` | Bulk dry run — generates, does not save |
| `belims_bulk_generate_description` | Bulk run — generates **and saves** |

## Configuration

| Option | Meaning |
| --- | --- |
| `belims_ai_gemini_api_key` | Gemini API key (from [Google AI Studio](https://aistudio.google.com/apikey)) |

**Model:** `gemini-2.0-flash-exp` via `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent`. ⚠ This is an experimental model name — move to a current Gemini model ([ROADMAP](../../../docs/ROADMAP.md)).

## Security

- Nonce verification on every AJAX request; capability checks (`edit_products`, `manage_woocommerce`, `manage_options`).
- Input sanitised, output escaped; API key stays server-side (never sent to the browser).

## Relationship to the storefront

The storefront's own Gemini features (Paint Assistant, Price Match, Onboarding) use `frontend/services/geminiService.ts` and are independent of this plugin. This plugin only writes product descriptions in WooCommerce.

## Deployment

Not covered by `deploy.sh` (which ships `global-site-settings` only). Upload changed files over SSH — see [docs/OPERATIONS.md → CMS plugin deploys](../../../docs/OPERATIONS.md#cms-plugin-deploys). Bump `Version:` in the plugin header and add a [CHANGELOG](../../../CHANGELOG.md) entry for every change.
