// Shared header-mockup behaviour. Needs ../shop-product/data.js + shop.js (DB, CAT, esc, money).
const SHOP = "../shop-product/";
const catHref = (slug) => `${SHOP}archive.html?cat=${slug}`;
const productHref = (id) => `${SHOP}product.html?id=${id}`;
const DEALS_HREF = `${SHOP}archive.html?offer=deal_of_day,weekly_special,trade_special`;
const STORE = DB.policies.stores[0];

const ICON = {
  search: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  user: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  cart: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>',
  menu: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  close: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  right: '<svg class="icon" style="width:18px;height:18px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  left: '<svg class="icon" style="width:18px;height:18px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>',
  down: '<svg class="icon" style="width:16px;height:16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  pin: '<svg class="icon" style="width:16px;height:16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s7-6.3 7-12a7 7 0 0 0-14 0c0 5.7 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  truck: '<svg class="icon" style="width:16px;height:16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>',
  tag: '<svg class="icon" style="width:16px;height:16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/></svg>',
};

// Departments and their trees, with catalogue-consistent counts and a real product image.
const count = (slug) => CAT.productsIn(slug).length;
const withKids = (c) => ({
  slug: c.slug, name: c.name, count: count(c.slug), img: CAT.imageFor(c.slug),
  kids: c.children.map(withKids).filter((k) => k.count > 0).sort((a, b) => b.count - a.count),
});
const DEPTS = CAT.top.map(withKids).filter((d) => d.count > 0).sort((a, b) => b.count - a.count);
const tagline = (d) => d.kids.slice(0, 3).map((k) => k.name).join(", ");
const dealsIn = (slug) => CAT.productsIn(slug).filter((p) => p.deal);
const ALL_DEALS = DB.products.filter((p) => p.deal);

// ---------- Typeahead (combobox) ----------
function initTypeahead(input, panel) {
  let opts = [], idx = -1;
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", panel.id);
  const hl = (s, words) => words.reduce((acc, w) => acc.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"), "<mark>$1</mark>"), esc(s));
  const close = () => { panel.hidden = true; input.setAttribute("aria-expanded", "false"); idx = -1; input.removeAttribute("aria-activedescendant"); };
  const run = () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) return close();
    const words = q.split(/\s+/);
    const prods = DB.products.filter((p) => words.every((w) => `${p.name} ${p.brand}`.toLowerCase().includes(w))).slice(0, 5);
    const cats = [...CAT.bySlug.values()].filter((c) => words.every((w) => c.name.toLowerCase().includes(w)) && count(c.slug) > 0).slice(0, 5);
    const brands = DB.brands.filter(([b]) => words.every((w) => b.toLowerCase().includes(w))).slice(0, 3);
    let i = 0;
    const opt = (href, inner) => `<a role="option" id="${panel.id}-o${i++}" href="${href}">${inner}</a>`;
    panel.innerHTML = prods.length + cats.length + brands.length === 0
      ? `<p class="ta-empty">No matches for “${esc(input.value)}”. Press Enter to search all products.</p>`
      : `<div class="ta-col"><h3>Products</h3>${prods.map((p) => opt(productHref(p.id), `${p.img ? `<img src="${esc(p.img)}" alt="">` : `<span style="width:40px"></span>`}<span>${hl(p.name, words)}</span><span class="p">${money(effectivePrice(p))}</span>`)).join("") || '<p class="ta-empty" style="padding:4px 8px">No products</p>'}</div>
         <div class="ta-col"><h3>Categories</h3>${cats.map((c) => opt(catHref(c.slug), `<span>${hl(c.name, words)}</span><span class="p" style="font-weight:500;color:var(--color-text-tertiary)">${count(c.slug)}</span>`)).join("") || '<p class="ta-empty" style="padding:4px 8px">No categories</p>'}
         ${brands.length ? `<h3 style="margin-top:12px">Brands</h3>${brands.map(([b, n]) => opt(`${SHOP}archive.html?brand=${encodeURIComponent(b)}`, `<span>${hl(b, words)}</span><span class="p" style="font-weight:500;color:var(--color-text-tertiary)">${n}</span>`)).join("")}` : ""}</div>`;
    opts = [...panel.querySelectorAll("[role=option]")];
    panel.setAttribute("role", "listbox");
    panel.hidden = false;
    input.setAttribute("aria-expanded", "true");
  };
  let t;
  input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(run, 80); });
  input.addEventListener("focus", run);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") return close();
    if (!opts.length || panel.hidden) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      idx = (idx + (e.key === "ArrowDown" ? 1 : -1) + opts.length) % opts.length;
      opts.forEach((o, j) => o.setAttribute("aria-selected", String(j === idx)));
      input.setAttribute("aria-activedescendant", opts[idx].id);
    }
    if (e.key === "Enter" && idx >= 0) { e.preventDefault(); location.href = opts[idx].href; }
  });
  input.form?.addEventListener("submit", (e) => { e.preventDefault(); location.href = `${SHOP}archive.html?q=${encodeURIComponent(input.value.trim())}`; });
  document.addEventListener("click", (e) => { if (!panel.contains(e.target) && e.target !== input) close(); });
}

// ---------- Mega trigger (hover intent + click + keyboard) ----------
function initMega(trigger, panel, { scrim, onOpen } = {}) {
  let openT, closeT;
  const isOpen = () => !panel.hidden;
  const open = () => {
    clearTimeout(closeT);
    document.querySelectorAll("[data-mega-open]").forEach((t) => t !== trigger && t._closeMega?.());
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    trigger.setAttribute("data-mega-open", "");
    scrim?.classList.add("open");
    onOpen?.();
  };
  const close = () => {
    clearTimeout(openT);
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    trigger.removeAttribute("data-mega-open");
    if (!document.querySelector("[data-mega-open]")) scrim?.classList.remove("open");
  };
  trigger._closeMega = close;
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", panel.id);
  trigger.addEventListener("click", (e) => { e.preventDefault(); isOpen() ? close() : open(); });
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (fine) {
    [trigger, panel].forEach((el) => {
      el.addEventListener("mouseenter", () => { clearTimeout(closeT); if (!isOpen()) openT = setTimeout(open, 140); });
      el.addEventListener("mouseleave", () => { clearTimeout(openT); closeT = setTimeout(close, 220); });
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) { close(); trigger.focus(); }
  });
  scrim?.addEventListener("click", close);
  panel.addEventListener("focusout", (e) => { if (!panel.contains(e.relatedTarget) && e.relatedTarget !== trigger) close(); });
  return { open, close };
}

// ---------- Mobile multi-level drawer ----------
function initDrawer(openBtn, { title = "Menu", theme = {} } = {}) {
  const back = document.createElement("div");
  back.className = "m-backdrop";
  const d = document.createElement("div");
  d.className = "m-drawer";
  d.id = "m-drawer";
  d.hidden = true;
  d.setAttribute("role", "dialog");
  d.setAttribute("aria-modal", "true");
  d.setAttribute("aria-label", title);
  Object.entries(theme).forEach(([k, v]) => d.style.setProperty(k, v));
  d.innerHTML = `<div class="m-head"><strong>${esc(title)}</strong><button type="button" data-m-close aria-label="Close menu">${ICON.close}</button></div><div class="m-panels"></div>`;
  document.body.append(back, d);
  const panels = d.querySelector(".m-panels");
  const stack = [];

  const itemHTML = (node) => {
    const media = node.img ? `<img src="${esc(node.img)}" alt="">` : `<span class="m-noimg"></span>`;
    return node.kids?.length
      ? `<li><button class="m-item" type="button" data-m-open="${node.slug}">${media}<span>${esc(node.name)}<small>${node.count} products</small></span><span class="chev">${ICON.right}</span></button></li>`
      : `<li><a class="m-item" href="${catHref(node.slug)}">${media}<span>${esc(node.name)}<small>${node.count} products</small></span></a></li>`;
  };
  const find = (slug, list = DEPTS) => {
    for (const n of list) { if (n.slug === slug) return n; const f = find(slug, n.kids); if (f) return f; }
    return null;
  };
  const rootHTML = () => `
    <div class="m-section-label">Shop</div>
    <div class="m-quick"><a class="deal" href="${DEALS_HREF}">${ICON.tag} Deals</a><a href="${SHOP}archive.html">All products</a></div>
    <div class="m-section-label">Departments</div>
    <ul class="m-list">${DEPTS.map(itemHTML).join("")}</ul>
    <div class="m-section-label">Help</div>
    <ul class="m-list">
      <li><a class="m-item" href="#">${ICON.pin}<span>Store locator${STORE ? `<small>${esc(STORE.name)} — ${esc(STORE.address)}</small>` : ""}</span></a></li>
      <li><a class="m-item" href="#">${ICON.truck}<span>Track your order</span></a></li>
      <li><a class="m-item" href="#">${ICON.user}<span>Sign in / Sign up</span></a></li>
    </ul>`;
  const panelFor = (node) => `
    <button class="m-back" type="button" data-m-back>${ICON.left} Back</button>
    <div class="m-title">${esc(node.name)}</div>
    <ul class="m-list"><li><a class="m-item all" href="${catHref(node.slug)}">Shop all ${esc(node.name)}<span class="chev">${ICON.right}</span></a></li>${node.kids.map(itemHTML).join("")}</ul>`;

  const push = (html) => {
    const p = document.createElement("div");
    p.className = "m-panel";
    p.innerHTML = html;
    panels.append(p);
    stack.at(-1)?.classList.replace("active", "behind");
    stack.push(p);
    void p.offsetWidth;
    p.classList.add("active");
    setTimeout(() => p.querySelector("button, a")?.focus(), 260);
  };
  const pop = () => {
    if (stack.length < 2) return;
    const p = stack.pop();
    p.classList.remove("active");
    stack.at(-1).classList.replace("behind", "active");
    setTimeout(() => p.remove(), 260);
    setTimeout(() => stack.at(-1).querySelector("button, a")?.focus(), 260);
  };
  const setOpen = (open) => {
    if (open) {
      panels.innerHTML = "";
      stack.length = 0;
      d.hidden = false;
      push(rootHTML());
      void d.offsetWidth;
    }
    d.classList.toggle("open", open);
    back.classList.toggle("open", open);
    openBtn.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) { setTimeout(() => (d.hidden = true), 260); openBtn.focus(); }
  };
  openBtn.setAttribute("aria-controls", "m-drawer");
  openBtn.setAttribute("aria-expanded", "false");
  openBtn.addEventListener("click", () => setOpen(true));
  back.addEventListener("click", () => setOpen(false));
  d.addEventListener("click", (e) => {
    if (e.target.closest("[data-m-close]")) return setOpen(false);
    if (e.target.closest("[data-m-back]")) return pop();
    const o = e.target.closest("[data-m-open]");
    if (o) push(panelFor(find(o.dataset.mOpen)));
  });
  d.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
    if (e.key === "Tab") {
      const f = [...d.querySelectorAll(".m-head button, .m-panel.active button, .m-panel.active a[href]")];
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    }
  });
}

// Option switcher bar + demo body
function renderChromeFor(option) {
  document.getElementById("mock-bar").innerHTML = `<nav class="mock-bar" aria-label="Mockup pages"><strong>HEADER OPTIONS</strong>
    ${["a", "b", "c"].map((o) => `<a href="option-${o}.html" ${o === option ? 'aria-current="page"' : ""}>Option ${o.toUpperCase()}</a>`).join("")}
    <a href="${SHOP}archive.html">Archive</a><a href="${SHOP}product.html">Product</a><a href="../home/index.html">Home</a></nav>`;
}
