# Global Site Settings — User Guide

**Plugin version:** 2.10.9 · **For:** Belims Hardware store administrators

> Technical overview for developers: [README.md](README.md) · Project docs: [root README](../../../README.md)

Global Site Settings is the control centre for the Belims online store. The storefront customers see (www.belims.co.za) is a separate website that reads products, prices and orders from this WordPress CMS. This plugin connects the two, and brings in products from the FTG supplier feed, shipping (BobGo), customer sign-in (Firebase), AI product descriptions and media tools.

Everything lives in **WP Admin → Site Settings**. The WordPress admin menu under **Site Settings** shows four groups — **Overview, Settings, Integrations, Tools**. Pick a group, then pick a page from the row of tabs across the top of the screen. The groups contain:

| Group | Pages |
|-------|-------|
| Overview | Dashboard |
| Settings | Branding · Store Details · Homepage · CORS & Security · WooCommerce |
| Integrations | FTG Sync · BobGo Shipping · Firebase Auth · AI Services |
| Tools | Media Management |

Clicking **Site Settings** or **Overview** in the WordPress menu opens the **Dashboard**; each other group opens on its first page. Switching groups or pages happens straight away, without reloading.

### Saving

- Clicking a **Save** button shows **Saving…** and locks the button until the page reloads.
- A small message in the bottom-right corner confirms the result — green when saved, red when something went wrong (for example a required field is empty or your session expired). Close it with **×**; success messages disappear after a few seconds.
- After saving, the page reopens on the page you saved.
- If you try to leave Site Settings with **unsaved changes** in a form, your browser asks you to confirm. This only happens for forms you actually changed and haven't saved — switching between Site Settings pages never asks.
- Tools that run in the background (FTG sync, media conversion, homepage publishing) report success or errors the same way; detailed results such as sync reports stay on the page.

---

## Dashboard

- **System strip** — WordPress, WooCommerce and PHP versions, plus the storefront address the CMS is connected to.
- **Integrations** — a card each for FTG Sync, BobGo Shipping, Firebase Auth and AI Services with its status (see *Status labels* below); **Configure** opens its page. Integrations are switched on or off on their own pages, not here.
- **Settings** — shortcuts to Branding, Store Details, Homepage, CORS & Security and WooCommerce.
- **REST API endpoints** — technical list of what the storefront uses (for developers).

### Status labels

| Integration | All good | Needs attention / off |
|---|---|---|
| FTG Sync | **Connected** | **Not connected** |
| BobGo Shipping | **Enabled · Production** or **Sandbox** | **Disabled** |
| Firebase Auth | **Configured** | **Setup** |
| AI Services | **Configured** | **Setup** |

### WordPress Dashboard

The main **WP Admin → Dashboard** starts with a full-width Site Settings panel:

- **Top row** — which copy of the CMS this is (Production, Staging or Local), how many products are published, when the FTG catalogue last synced, and **Run Diagnostics** (coming soon).
- **Integrations** — FTG Sync, BobGo Shipping, Firebase Auth and AI Services with their status. An amber label (**Not connected** / **Setup**) means it needs attention — click it to open that page.
- **Quick links** — shortcuts to Site Settings pages, plus **Open Site Settings**.

To hide the panel, untick **Welcome** under **Screen Options** at the top of the Dashboard.

Every Site Settings page starts with the same header: the plugin name and version, which copy of the CMS you are in (**Production**, or **Staging** / **Local** for test copies — a test copy can never send customers or rebuilds to the live website), and a **View Storefront ↗** button that opens the website in a new tab.

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

**Saving rebuilds** — choose which storefront a save rebuilds:
- **Preview** (https://belims.vercel.app) — use while developing. This is the setting until launch.
- **Production** (https://www.belims.co.za) — once the site is live.
- **Both** — rebuild both.

**Hero** (the large banner at the top):
1. Under **Homepage Sections**, open the **Hero** section (or **Add Section → Hero** if none exists).
2. Fill in **Title**, **Description**, **Button Text** and **Button Link** (e.g. `/shop`).
3. Choose a **Desktop Image** (recommended 1600×800 WebP) and optionally a **Mobile Image** (800×800) for phones.
4. Add **Image Alt Text** describing the picture.
5. Untick **Show on homepage** to hide the hero without deleting it.
6. Click **Save Homepage**.

**Publishing** card:
- Each storefront shows *Up to date*, *Publishing…*, *Out of date* or *Unreachable*; the one(s) a save rebuilds are marked *(rebuilds on save)*.
- **Publish now** rebuilds the selected storefront(s) without changing content (e.g. if a build failed).
- **Preview / Production Deploy Hook** — set once by your developer; shown partly hidden.

If the storefront can't reach the CMS during a rebuild it keeps a default hero and shows *Out of date* — click **Publish now** to retry.

## CORS & Security

**Allowed Storefronts** lists every site allowed to use the CMS — the live store, the preview site and local development work at the same time, so there's nothing to switch. When a customer pays with PayFast they're returned to the storefront they ordered on. The **default frontend URL** is only used for orders with no saved storefront; your developer changes it at launch.

## WooCommerce

WooCommerce API settings and product description import.

---

# Integrations

## FTG Sync

Brings products from the FTG supplier feed into WooCommerce.

The page has a menu on the left — **Connection**, **Auto Sync**, **Tools**, **Activity Log** — and shows one section at a time on the right. While FTG is turned off, only **Connection** is listed.

**Connect FTG (once)**
1. Turn on **Enable integration**.
2. Enter the FTG email and password and click **Get Token** — it signs in to FTG and fills in the collection token. Nothing is saved yet. **Save Credentials** only becomes clickable once the token is in.
3. Click **Save Credentials**. The page doesn't reload: a message in the bottom-right confirms it was saved (or says why not), and the form is replaced by a summary (email, hidden password, shortened token) with **Edit Credentials** and **Test Connection**, and the badge shows **Connected**.

**Change or remove the connection** — click **Edit Credentials**; the form opens filled in with what's saved (the password shows as dots — it is never shown). To change the account, type the new email and/or password and click **Get Token**, then **Save Credentials**. **Cancel** leaves everything as it was. **Disconnect FTG** (in the same form) deletes the saved credentials after you confirm.

**Turn FTG on or off** — in the **FTG integration** box at the top of Connection, switch **Enable integration** and click **Save** (Save only lights up when you've changed something; nothing changes until you click it). Turning it off asks you to confirm **Disable connection**. A message in the bottom-right confirms the change. When off, syncing stops and the badge shows **Not connected**; your credentials are kept, so switching it back on reconnects straight away.

**What gets imported** — a product is only brought in or updated when FTG supplies **all three** of:
- **Stock** above 0
- **Price** above 0
- At least one **category**

Anything missing one of these is never imported and is listed as **skipped** with the reason (e.g. *Missing stock, price*). If that product is already in the store, it is moved to **Products → Trash** so customers never see it. When FTG has stock, a price and a category for it again, the next sync restores it automatically (same page and link). FTG prices exclude VAT; 15% VAT is added automatically. Imported product images go into **Media → Folders → Products**.

**Tools** — pick the **Brand** (and a **Product SKU** for single-product actions) in the first box, then use one of:

- **Look up** (*Read only* — nothing changes): Search Available Brands, Check Catalogue Count, Count Display On Web Active, Inspect Product (shows FTG's data for the SKU), Export Brand Products (CSV).
- **Sync to WooCommerce** (*Changes products* — each asks you to confirm):

| Action | When to use it |
|--------|----------------|
| **Sync first 10 (test)** | Check a brand imports correctly (imports 10 products) |
| **Sync Catalogue** | Sync the selected brand |
| **Sync Single Product** | Import/update the product with the SKU entered above |
| **Sync All Brands** | Sync every brand; tick **Dry run** first to see counts without changing anything |

- **Maintenance** (*Caution*): Cleanup Duplicate Attributes removes duplicate Range and Color attribute terms.

**Automatic synchronization** — pick Hourly, Twice Daily, Daily, Weekly or Disabled and click **Save Schedule**. **Run Now** syncs immediately.


## BobGo Shipping

1. Switch **Enable Shipping** on and click **Save Settings**.
2. Shipping rates at checkout come from the **Bob Go Smart Shipping** WooCommerce plugin automatically — it must be active under **Plugins**. If it can't return rates for an address, the storefront shows no delivery options and the customer can't pay for delivery (they're asked to contact you) — no estimated prices are charged.
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
