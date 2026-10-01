# Belims AI Product Descriptions — User Guide

**Plugin version:** 1.0.0 · **For:** Belims store administrators

Write product descriptions in seconds with Google Gemini. Technical overview: [README.md](README.md).

---

## 1. One-time setup

1. **WP Admin → Plugins** — make sure **Belims AI Product Descriptions** (and WooCommerce) are active.
2. Get a Gemini API key at [Google AI Studio](https://aistudio.google.com/apikey) → *Create API key* (starts with `AIza…`).
3. **WP Admin → Settings → AI Descriptions** → paste the key → **Save Settings**.

## 2. One product at a time

1. **Products → All Products** → edit a product.
2. Fill in the **name**, **category**, **brand** and a few **features** (short description or attributes) first — the AI uses them.
3. In the right sidebar, find **AI Product Description Generator** → **Generate AI Description**.
4. Read the preview. Not right? Click generate again for a new version.
5. **Apply to Product** inserts it into the description field.
6. Click **Update** to save the product.

Works with the Classic editor, the Block editor and the WooCommerce product editor.

## 3. Many products at once

1. **WooCommerce → Bulk AI Descriptions**. The page shows how many products have **no description**.
2. **Reload Products** to load the list.
3. **Dry Run** — generates sample descriptions **without saving**, so you can check quality.
4. **Start Bulk Generation** — generates **and saves** a description for every listed product. Only products without a description are touched.

Tip: run a dry run first, and keep the tab open until the batch finishes.

## Troubleshooting

| Message / symptom | Fix |
| --- | --- |
| "Gemini API key not configured" | Add the key under **Settings → AI Descriptions**. |
| "Failed to connect to Gemini API" | Check the key in Google AI Studio; wait a few minutes if you hit rate limits; ask your developer to check the server can reach Google. |
| Description doesn't appear in the editor | Save the product once, refresh, or copy the preview text in manually. |
| No meta box on the product screen | WooCommerce and this plugin must both be active, and you must be on a product edit screen. Check **Screen Options** at the top of the page. |
