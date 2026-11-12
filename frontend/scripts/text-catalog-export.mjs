#!/usr/bin/env node
/**
 * Export the WooCommerce catalog to Text (LiveChat AI Agent) Product Directory JSON
 * and optionally upload it. Feeds the AI Agent's "Recommend products" skill.
 *
 * Usage (from frontend/):
 *   node scripts/text-catalog-export.mjs                      # write scripts/out/products.json
 *   node scripts/text-catalog-export.mjs --base-url https://www.belims.co.za
 *   TEXT_ACCOUNT_ID=… TEXT_PAT=… node scripts/text-catalog-export.mjs --upload
 *
 * Options:
 *   --cms <origin>       CMS origin (default https://cms.belims.co.za)
 *   --base-url <origin>  Storefront origin for product links (default https://belims.vercel.app)
 *   --out <path>         Output file (default scripts/out/products.json)
 *   --upload             Upload to Text and poll the import job until it finishes
 *
 * Docs: https://www.text.com/docs/api/product-directory/catalog/upload-a-product-catalog
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const TEXT_API = "https://api.text.com/product-directory/v1/catalogs/imports";
const PER_PAGE = 100;
const SKIP_CATEGORIES = new Set(["uncategorised", "uncategorized"]);

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const CMS = opt("cms", "https://cms.belims.co.za").replace(/\/$/, "");
const BASE_URL = opt("base-url", "https://belims.vercel.app").replace(/\/$/, "");
const OUT = resolve(opt("out", resolve(HERE, "out/products.json")));
const UPLOAD = args.includes("--upload");

const decodeEntities = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#8217;|&#8216;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;|&#8212;/g, "-")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

const stripHtml = (html = "") =>
  decodeEntities(
    html
      .replace(/<(br|\/p|\/li|\/h\d)\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();

const slugify = (text) =>
  text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function fetchAllProducts() {
  const products = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`${CMS}/wp-json/wc/store/v1/products?per_page=${PER_PAGE}&page=${page}`);
    if (!res.ok) throw new Error(`Store API page ${page}: HTTP ${res.status}`);
    const batch = await res.json();
    products.push(...batch);
    const totalPages = Number(res.headers.get("x-wp-totalpages") || page);
    process.stdout.write(`\rFetched page ${page}/${totalPages} (${products.length} products)`);
    if (page >= totalPages || batch.length === 0) break;
  }
  process.stdout.write("\n");
  return products;
}

/** Map one Store API product to a Text product, or return a skip reason. */
function toTextProduct(p) {
  const minor = p.prices?.currency_minor_unit ?? 2;
  const price = Number(p.prices?.price || 0) / 10 ** minor;
  if (!p.is_in_stock) return { skip: "out of stock" };
  if (!(price > 0)) return { skip: "zero price" };

  const categories = (p.categories || [])
    .map((c) => decodeEntities(c.name))
    .filter((n) => !SKIP_CATEGORIES.has(n.toLowerCase()));
  if (categories.length === 0) return { skip: "no category" };

  const images = (p.images || [])
    .filter((img) => img.src)
    .map((img) => (img.alt ? { url: img.src, alt_text: img.alt } : { url: img.src }));
  if (images.length === 0) return { skip: "no image" };

  const title = decodeEntities(p.name);
  const sku = p.sku || String(p.id);
  const brand = p.brands?.[0]?.name ? decodeEntities(p.brands[0].name) : null;

  const attributes = [
    ...(brand ? [{ key: "brand", value: brand }] : []),
    { key: "sku", value: sku },
    ...(p.attributes || []).flatMap((a) =>
      (a.terms || []).length
        ? [{ key: decodeEntities(a.name), value: a.terms.map((t) => decodeEntities(t.name)).join(", ") }]
        : [],
    ),
  ];

  return {
    product: {
      id: String(p.id),
      title,
      description: stripHtml(p.description) || stripHtml(p.short_description) || title,
      url: `${BASE_URL}/product/${p.slug || slugify(title)}-${p.id}`,
      currency: p.prices?.currency_code || "ZAR",
      categories,
      tags: (p.tags || []).map((t) => decodeEntities(t.name)),
      images,
      attributes,
      variants: [{ id: String(p.id), title, sku, available: true, price }],
    },
  };
}

async function upload(file) {
  const { TEXT_ACCOUNT_ID, TEXT_PAT } = process.env;
  if (!TEXT_ACCOUNT_ID || !TEXT_PAT) {
    throw new Error("--upload needs TEXT_ACCOUNT_ID and TEXT_PAT in the environment.");
  }
  const auth = `Basic ${Buffer.from(`${TEXT_ACCOUNT_ID}:${TEXT_PAT}`).toString("base64")}`;
  const form = new FormData();
  form.append("file", new Blob([await readFile(file)], { type: "application/json" }), basename(file));

  const res = await fetch(TEXT_API, { method: "POST", headers: { Authorization: auth }, body: form });
  if (res.status !== 202) throw new Error(`Upload failed: HTTP ${res.status} ${await res.text()}`);
  const { job_id } = await res.json();
  console.log(`Upload queued, job ${job_id}`);

  for (;;) {
    await new Promise((r) => setTimeout(r, 5000));
    const s = await fetch(`${TEXT_API}/${job_id}`, { headers: { Authorization: auth } });
    if (!s.ok) throw new Error(`Status check failed: HTTP ${s.status} ${await s.text()}`);
    const job = await s.json();
    console.log(
      `${job.status}: ${job.progress}/${job.total} (indexed ${job.indexed_count}, failed ${job.failed_count}, unchanged ${job.skipped_count})`,
    );
    if (job.status === "done") return;
    if (job.status === "failed") throw new Error("Import job failed.");
  }
}

const raw = await fetchAllProducts();
const skipped = {};
const products = [];
for (const p of raw) {
  const r = toTextProduct(p);
  if (r.skip) skipped[r.skip] = (skipped[r.skip] || 0) + 1;
  else products.push(r.product);
}

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(products, null, 2));
console.log(`Wrote ${products.length} products to ${OUT}`);
if (Object.keys(skipped).length) console.log("Skipped:", skipped);

if (UPLOAD) await upload(OUT);
