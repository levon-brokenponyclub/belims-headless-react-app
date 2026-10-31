// Fills [data-cards="n"] with sample product cards. Mockup only — real cards stay ProductCard.tsx.
const SAMPLE = [
  { brand: "Bosch", name: "GSB 18V-55 Professional Cordless Impact Drill Kit", now: "R 2 499", was: "R 2 999", badge: "Sale" },
  { brand: "Makita", name: "DGA504Z 18V LXT Brushless Angle Grinder 125mm", now: "R 3 199" },
  { brand: "Stanley", name: "FatMax 25-Piece Screwdriver Set with Case", now: "R 649", stock: "low" },
  { brand: "Einhell", name: "TE-CD 18/40 Li-i Brushless Drill Driver", now: "R 1 899", was: "R 2 199", badge: "Sale" },
  { brand: "DeWalt", name: "DWE7485 210mm Compact Table Saw", now: "R 7 450", badge: "New" },
  { brand: "Ryobi", name: "ONE+ 18V Cordless Jigsaw (Tool Only)", now: "R 1 299" },
];
const TRADE = { badge: "Trade", trade: true };
const rand = (s) => Number(s.replace(/\D/g, ""));
const withWas = (p) => (p.was ? p : { ...p, was: "R " + Math.round(rand(p.now) * 1.2).toLocaleString("en-ZA") });

function card(p, opts) {
  const badge = p.badge ? `<span class="badge${p.trade ? " trade" : ""}">${p.badge}</span>` : "";
  const was = p.was ? `<span class="price-was">${p.was}</span>` : "";
  const stock = p.stock === "low" ? `<span class="stock low">Low stock</span>` : `<span class="stock">In stock</span>`;
  return `<article class="card">
    <div class="card-media">${badge}<div class="ph">Product</div></div>
    <div class="card-body">
      <span class="card-brand">${p.brand}</span>
      <a class="card-name" href="#">${p.name}</a>
      ${stock}
      <div class="price"><span class="price-now${p.was ? " sale" : ""}">${p.now}</span>${was}</div>
      ${opts.cta ? `<a class="card-cta" href="#">Add to cart</a>` : ""}
    </div>
  </article>`;
}

document.querySelectorAll("[data-cards]").forEach((el) => {
  const n = Number(el.dataset.cards);
  const trade = el.dataset.trade === "true";
  const onlySale = el.dataset.sale === "true";
  const pool = onlySale ? SAMPLE.map((p) => ({ ...withWas(p), badge: "Sale" })) : SAMPLE;
  el.innerHTML = Array.from({ length: n }, (_, i) => {
    const p = pool[i % pool.length];
    return card(trade ? { ...p, ...TRADE } : p, { cta: el.dataset.cta === "true" });
  }).join("");
});

// Tabs: visual toggle only
document.querySelectorAll("[role=tablist]").forEach((list) => {
  list.addEventListener("click", (e) => {
    const tab = e.target.closest("[role=tab]");
    if (!tab) return;
    list.querySelectorAll("[role=tab]").forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
    const note = list.closest("section")?.querySelector("[data-tab-note]");
    if (note && tab.dataset.note) note.textContent = tab.dataset.note;
    const rail = list.closest("section")?.querySelector("[data-cards]");
    if (rail) {
      rail.dataset.trade = String(tab.dataset.trade === "true");
      rail.dataset.sale = "true";
      const n = Number(rail.dataset.cards);
      const trade = rail.dataset.trade === "true";
      rail.innerHTML = Array.from({ length: n }, (_, i) => {
        const p = withWas({ ...SAMPLE[(i + (trade ? 2 : 0)) % SAMPLE.length] });
        p.badge = trade ? "Trade" : "Sale"; p.trade = trade;
        return card(p, { cta: rail.dataset.cta === "true" });
      }).join("");
    }
  });
});
