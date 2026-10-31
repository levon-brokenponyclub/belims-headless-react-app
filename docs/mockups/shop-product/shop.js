// Shared helpers for the shop/product mockups. Data: window.BELIMS from data.js (real snapshot).
const DB = window.BELIMS;
const money = (v) => "R" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const DEAL_LABEL = { deal_of_day: "Deal of the day", weekly_special: "Weekly special", trade_special: "Trade special" };

// Category tree (parent = parent slug, null for top level)
const CAT = (() => {
  const bySlug = new Map(DB.categories.map((c) => [c.slug, { ...c, children: [] }]));
  bySlug.forEach((c) => c.parent && bySlug.get(c.parent)?.children.push(c));
  const byName = new Map([...bySlug.values()].map((c) => [c.name.trim().toLowerCase(), c]));
  const names = (c) => [c.name.trim().toLowerCase(), ...c.children.flatMap(names)];
  const subtree = new Map([...bySlug.values()].map((c) => [c.slug, new Set(names(c))]));
  const top = [...bySlug.values()].filter((c) => !c.parent).sort((a, b) => b.count - a.count);
  const productsIn = (slug) => DB.products.filter((p) => subtree.get(slug)?.has(p.cat.trim().toLowerCase()));
  const imageFor = (slug) => productsIn(slug).find((p) => p.img)?.img || "";
  const pathOf = (slug) => {
    const out = [];
    for (let c = bySlug.get(slug); c; c = bySlug.get(c.parent)) out.unshift(c);
    return out;
  };
  return { bySlug, byName, subtree, top, productsIn, imageFor, pathOf };
})();

const effectivePrice = (p) => (p.deal && !p.deal.trade ? p.deal.price : p.price);

function cardHTML(p, { list = false } = {}) {
  const d = p.deal;
  const badge = d ? `<span class="badge${d.trade ? " trade" : ""}">${d.trade ? "Trade price" : `${d.pct}% off`}</span>` : "";
  const media = p.img
    ? `<img src="${esc(p.img)}" alt="" loading="lazy" decoding="async" width="300" height="300">`
    : `<span class="noimg">No image</span>`;
  const price = d && !d.trade
    ? `<span class="price-now sale">${money(d.price)}</span><span class="price-was">${money(d.was)}</span>`
    : `<span class="price-now">${money(p.price)}</span>`;
  const stock = d && d.trade
    ? `<span class="stock trade">Trade accounts save ${d.pct}%</span>`
    : p.stock <= 5
      ? `<span class="stock low">Only ${p.stock} left</span>`
      : `<span class="stock">In stock</span>`;
  return `<article class="card">
    <a class="card-media" href="product.html?id=${p.id}" tabindex="-1" aria-hidden="true">${badge}${media}</a>
    <div class="card-body">
      <span class="card-brand">${esc(p.brand || p.cat)}</span>
      <a class="card-name" href="product.html?id=${p.id}">${esc(p.name)}</a>
      ${stock}
      <div class="price">${price}</div>
      <button class="card-cta" type="button" data-add="${p.id}">Add to cart</button>
    </div>
  </article>`;
}

function toast(msg) {
  let t = document.querySelector(".toast");
  if (!t) {
    t = document.createElement("div");
    t.className = "toast";
    t.setAttribute("role", "status");
    t.setAttribute("aria-live", "polite");
    document.body.append(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 2200);
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-add]");
  if (!btn) return;
  const id = btn.dataset.add;
  const p = String(DB.product.id) === id ? DB.product : DB.products.find((x) => String(x.id) === id);
  if (p) toast(`Added to cart: ${p.name}`);
});

// Mockup bar + selected site header (../header/site-header.js). `options` = [param, label, values[]] switcher.
function renderChrome(pageLabel, options) {
  document.documentElement.dataset.theme = "brand";
  const params = new URLSearchParams(location.search);
  const switcher = options
    ? `<span style="margin-left:auto;opacity:.6">${options[1]}:</span>` + options[2].map(([v, l]) => {
        const p = new URLSearchParams(params);
        v ? p.set(options[0], v) : p.delete(options[0]);
        const cur = (params.get(options[0]) || "") === v;
        return `<a href="?${p}" ${cur ? 'aria-current="page"' : ""}>${l}</a>`;
      }).join("")
    : "";
  const bar = document.createElement("nav");
  bar.className = "mock-bar";
  bar.setAttribute("aria-label", "Mockup pages");
  bar.innerHTML = `<strong>MOCKUP</strong>
    <a href="archive.html" ${pageLabel === "archive" && !params.get("cat") ? 'aria-current="page"' : ""}>Archive</a>
    <a href="archive.html?cat=tools-and-machinery" ${params.get("cat") ? 'aria-current="page"' : ""}>Category archive</a>
    <a href="product.html" ${pageLabel === "product" ? 'aria-current="page"' : ""}>Product</a>
    <a href="../home/index.html">Home</a>${switcher}`;
  const mount = document.getElementById("site-header");
  mount.before(bar);
  renderSiteHeader(mount);
  renderFooter();
}

// Footer as built (white, TrustStrip copy from /belims/v1/ecommerce-policies)
function renderFooter() {
  const pol = DB.policies;
  const store = pol.stores[0];
  const items = [
    ["Delivery & collection", pol.shipping, "⇢"],
    ["Returns", pol.return_policy, "↺"],
    ["Warranty", pol.warranty, "◆"],
    ["Visit our store", store ? `${store.name} — ${store.address}` : "", "⌂"],
  ].filter(([, body]) => body);
  document.getElementById("site-footer").innerHTML = `
    <footer class="site-footer">
      <ul class="container trust-light" style="padding:0" aria-label="Shopping with Belims">
        ${items.map(([t, b, i]) => `<li><span class="ic" aria-hidden="true">${i}</span><span><strong>${t}</strong><span>${esc(b)}</span></span></li>`).join("")}
      </ul>
      <div class="footer-base"><div class="container">Existing footer columns unchanged · copy from /belims/v1/ecommerce-policies</div></div>
    </footer>`;
}
