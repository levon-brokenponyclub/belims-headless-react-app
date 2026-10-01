# Global Site Settings — User Guide

**Plugin version:** 2.8.1 · **For:** Belims Hardware store administrators

> Technical overview for developers: [README.md](README.md) · Project docs: [root README](../../../README.md)

Global Site Settings is the control centre for the Belims online store. The storefront customers see (www.belims.co.za) is a separate website that reads products, prices and orders from this WordPress CMS. This plugin connects the two, and brings in products from the FTG supplier feed, shipping (BobGo), customer sign-in (Firebase), AI product descriptions and media tools.

Everything lives in **WP Admin → Site Settings**. The sidebar is grouped into:

| Group | Pages |
|-------|-------|
| Overview | Dashboard |
| Settings | Branding · Store Details · Homepage · CORS & Security · WooCommerce |
| Integrations | FTG Sync · BobGo Shipping · Firebase Auth · AI Services |
| Tools | Media Management |

---

## Dashboard

- **System strip** — WordPress, WooCommerce and PHP versions, plus the storefront address the CMS is connected to.
- **Integrations** — a card each for FTG Sync, BobGo Shipping, Firebase Auth and AI Services with its status. Use the toggle on FTG Sync or BobGo to switch it on/off; **Configure →** opens its page.
- **Settings** — shortcuts to Branding, Store Details, Homepage, CORS & Security and WooCommerce.
- **REST API Endpoints** — technical list of what the storefront uses (for developers).
- **Quick Tools → Clear Cache** — opens the admin with caching bypassed.

---

# Settings

## Branding

Colours of the WordPress admin dashboard: **Admin Bar Background**, **Admin Menu Background**, **Admin Submenu Background**, **Menu Item Text Color** and **Accent/Active Color**.

1. Click **Select Color** next to a setting and choose a colour.
2. Click **Save Branding Settings**.

## Store Details

Store information and the policies shown on product pages.

**Google Maps API Key** — used for address autocomplete. Once saved it's shown partly hidden (e.g. `AIzaSyDn••••••••`); click **Edit** to change it.

**Stores** — for each store enter Name, Phone, Map URL, Latitude/Longitude and Address, then the opening hours:
- Set **Opening**, **Closing**, **Lunch Start** and **Lunch End** per day.
- Tick **Closed** for days the store is shut and optionally add a **Custom Note** (e.g. *Closed*).
- **Add Store** adds another location; **Remove** deletes one.

**Policies** — edit the text for **15-Days Return Policy**, **Change of Mind Return**, **Warranty** and **Delivery and Shipping**. These appear as accordion sections on every product page.

**Ask an Expert Block** — Expert Name, Title, Avatar (**Upload Avatar**, square image), Video Chat URL, Chat URL, Email and Phone shown on product pages.

Click **Save Settings** at the bottom.

## Homepage

Edit the storefront homepage. Changes go live about **1–2 minutes** after saving (the storefront rebuilds itself).

> **Before launch:** saving rebuilds the **preview** site (https://belims.vercel.app), not www.belims.co.za — the deploy hook points at the preview branch until launch. The *Storefront* status reads the live site, so it may show *Out of date* until then.

**Hero** (the large banner at the top):
1. Under **Homepage Sections**, open the **Hero** section (or **Add Section → Hero** if none exists).
2. Fill in **Title**, **Description**, **Button Text** and **Button Link** (e.g. `/shop`).
3. Choose a **Desktop Image** (recommended 1600×800 WebP) and optionally a **Mobile Image** (800×800) for phones.
4. Add **Image Alt Text** describing the picture.
5. Untick **Show on homepage** to hide the hero without deleting it.
6. Click **Save Homepage**.

**Publishing** card:
- **Storefront** shows *Up to date*, *Publishing…* or *Out of date*.
- **Publish now** rebuilds the storefront without changing content (e.g. if a build failed).
- **Vercel Deploy Hook** — set once by your developer; shown partly hidden.

If the storefront can't reach the CMS during a rebuild it keeps a default hero and shows *Out of date* — click **Publish now** to retry.

## CORS & Security

Which storefront address is allowed to read data from the CMS. Only change this when the storefront moves to a new address.

## WooCommerce

WooCommerce API settings and product description import.

---

# Integrations

## FTG Sync

Brings products from the FTG supplier feed into WooCommerce.

**Connect FTG (once)**
1. Enter the FTG email and password and click **Save**.
2. Saved credentials collapse to a summary. **Edit Credentials** changes them; **Disconnect FTG** removes them.
3. **Test Connection** confirms the link is working.

**What gets imported** — a product is only brought in or updated when FTG supplies **all three** of:
- **Stock** above 0
- **Price** above 0
- At least one **category**

Anything missing one of these is listed as **skipped** with the reason (e.g. *Missing stock, price*). Products already in the store that later fail these checks are left as they are. FTG prices exclude VAT; 15% VAT is added automatically. Imported product images go into **Media → Folders → Products**.

**Sync products** — choose a brand first (or **Search Available Brands** / **Custom Brand**), then:

| Action | When to use it |
|--------|----------------|
| **Test Sync (first 10)** | Check a brand imports correctly |
| **Sync Single Product** | Enter a SKU to import/update one product |
| **SYNC CATALOGUE** | Sync the selected brand |
| **SYNC ALL BRANDS** | Sync every brand; tick **Dry Run** to preview without changes |

**Auto-Sync Schedule** — pick Hourly, Twice Daily, Daily, Weekly or Disabled and click **Save**. **Run Now** syncs immediately.

**Tools** — Inspect Product, Check Catalogue Count, Count Display On Web Active, Export Brand Products, Cleanup Duplicate Attributes.

## BobGo Shipping

1. Switch **Enable Shipping** on and click **Save Settings**.
2. Shipping rates at checkout come from the BobGo/uAfrica WooCommerce plugin automatically.
3. Paid orders (status *Processing*) appear in the BobGo dashboard automatically.

Logs: **WooCommerce → Status → Logs → `belims-bobgo`**.

## Firebase Auth

Shows whether customer sign-in (phone OTP and Google) is fully set up. Nothing to edit here — it lists:
- **Firebase API key** — must be **Set** so the CMS can verify sign-ins with Firebase. If it shows **Missing**, a warning explains that sign-ins aren't being verified; ask your developer to add the key.
- **JWT secret** — must be **Set** for customers to stay signed in.
- **Firebase Console ↗** — opens the Firebase project.

## AI Services

The Google Gemini key used to generate product descriptions. Enter the key and save.

---

# Tools

## Media Management

Tools to keep product images small and organised.

**Bulk Convert & Optimise** — converts PNG/JPEG images to **WebP** (typically ~90% smaller, no visible quality loss).
1. **To convert** shows how many images are still PNG/JPEG.
2. Click **Start conversion**. It runs in the background; you can leave the page.
3. Watch progress, MB saved and the log. **Pause** / **Resume** as needed.
4. Failed images are counted under **Failed** and retried next time you click Start.

The WooCommerce email header image is always skipped (some email programs can't show WebP).

**Auto-convert new uploads** — switch on to convert every new PNG/JPEG upload, including FTG product images, automatically.

**Archive Old Originals** — after converting, old PNG/JPEG files stay on the server until archived.
1. Wait a few hours after a conversion.
2. **Dry run** shows how many files and MB would be moved.
3. **Move files** moves them to a private archive folder (not deleted).

**Assign Product Images → Products Folder** — puts every image used by a product (main image, gallery, or uploaded to the product) into the Products folder, keeping any other folders. Safe to re-run; it only adds what's missing.

### Media Folders (WP Admin → Media → Folders)

Four folders are created for you: **Global**, **Products**, **Brands**, **Campaigns**.
- **Add, rename or nest folders:** Media → Folders.
- **Put an image in a folder:** open the image in the Media Library and set its **Folders** field.
- **Show one folder only:** in Media → Library, pick a folder from the **All folders** dropdown (grid and list view, and the "Add Media" window).

---

For technical details (endpoints, settings keys, deployment) see `README.md` in the plugin folder. Version history is in the project `CHANGELOG.md`.
