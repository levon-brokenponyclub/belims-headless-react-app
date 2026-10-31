// Selected header (option C layout + option B black styling). Needs data.js, shop.js, header.js.
function renderSiteHeader(mount, { homeHref = "../home/index.html" } = {}) {
  const pills = DEPTS.flatMap((d) => d.kids).sort((a, b) => b.count - a.count).slice(0, 10);
  mount.classList.add("sh-mount");
  mount.innerHTML = `
  <header class="sh" id="sh">
    <div class="sh-util hide-mobile"><div class="container">
      <div class="l"><span>${ICON.pin} Pickup from <b>${esc(STORE?.name || "—")}</b></span><span>${ICON.truck} ${esc(DB.policies.shipping)}</span></div>
      <div class="r"><a href="#">Track your order</a><a href="#">Store locator &amp; leaflets</a><a href="#">Trade accounts</a></div>
    </div></div>
    <div class="sh-top"><div class="container">
      <button class="hdr-action show-mobile" type="button" id="sh-burger" aria-label="Open menu">${ICON.menu}</button>
      <a class="sh-logo" href="${homeHref}"><i aria-hidden="true"></i><span class="sh-word">BELIMS</span><img class="sh-img" src="../../../frontend/public/images/belims-logo-white.webp" alt="Belims" width="400" height="106"></a>
      <button class="sh-depts sh-mini hide-mobile" type="button" id="sh-mini" aria-label="Departments">${ICON.menu}</button>
      <div class="sh-search hide-mobile">
        <form role="search">
          ${ICON.search}
          <label class="sr-only" for="sh-q">Search products, brands and SKUs</label>
          <input id="sh-q" placeholder="Search ${DB.products.length.toLocaleString("en-US")} products, brands and SKUs" autocomplete="off">
          <button class="go" type="submit">Search</button>
        </form>
        <div class="ta" id="sh-ta" hidden></div>
      </div>
      <div class="sh-right">
        <button class="sh-store hide-mobile" type="button">${ICON.pin}<span>Collect from <b>${esc(STORE?.name || "—")}</b></span>${ICON.down}</button>
        <a class="hdr-action hide-mobile" href="#">${ICON.user}<span><small>Good morning</small><b>Sign in · Sign up</b></span></a>
        <a class="hdr-action" href="#" aria-label="Cart, 0 items, R0.00"><span class="cart-wrap">${ICON.cart}<span class="cart-count">0</span></span><span class="hide-mobile"><small>Cart</small><b>R0.00</b></span></a>
      </div>
    </div></div>
    <div class="sh-msearch show-mobile">
      <div class="sh-search">
        <form role="search">
          <label class="sr-only" for="sh-qm">Search products and brands</label>
          <input id="sh-qm" placeholder="Search products and brands" autocomplete="off">
          <button class="go" type="submit">Go</button>
        </form>
        <div class="ta" id="sh-tam" hidden></div>
      </div>
    </div>
    <nav class="sh-sub hide-mobile" aria-label="Shop"><div class="container">
      <button class="sh-depts" type="button" id="sh-dept">${ICON.menu} Departments ${ICON.down}</button>
      <div class="sh-pills">${pills.map((p) => `<a href="${catHref(p.slug)}">${esc(p.name)}</a>`).join("")}</div>
      <a class="sh-deal" href="${DEALS_HREF}">${ICON.tag} Deals</a>
    </div></nav>
    <div class="mega sh-mega" id="sh-mega" hidden><div class="container">
      <div class="sh-pane" id="sh-p1"></div>
      <div class="sh-pane" id="sh-p2"></div>
      <div class="sh-pane" id="sh-p3"></div>
    </div></div>
  </header>
  <div class="mega-scrim" id="sh-scrim"></div>`;

  // 3-pane cascade: department → subcategory → its children + products in that branch
  const p1 = mount.querySelector("#sh-p1"), p2 = mount.querySelector("#sh-p2"), p3 = mount.querySelector("#sh-p3");
  const row = (n, attr, i) => `<button class="sh-row" type="button" ${attr}="${i}"><span>${esc(n.name)} <small>${n.count}</small></span>${n.kids.length ? `<span class="chev">${ICON.right}</span>` : ""}</button>`;
  const prodCard = (p) => {
    const tag = p.deal ? `<span class="tag ${p.deal.trade ? "trade" : ""}">${p.deal.trade ? `Trade · save ${p.deal.pct}%` : `${p.deal.pct}% off`}</span>` : "";
    const price = p.deal && !p.deal.trade ? `<b class="sale">${money(p.deal.price)}</b>` : `<b>${money(p.price)}</b>`;
    return `<a class="sh-prod" href="${productHref(p.id)}">${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy">` : ""}${tag}<span class="n">${esc(p.name)}</span>${price}</a>`;
  };
  let cur1 = DEPTS[0];
  const showProducts = (node) => {
    const items = CAT.productsIn(node.slug);
    const picks = [...items.filter((p) => p.deal), ...items.filter((p) => !p.deal && p.img)].slice(0, node.kids.length ? 3 : 6);
    p3.innerHTML = `<h3>${esc(node.name)}</h3>
      ${node.kids.length ? `<ul class="sh-links">${node.kids.map((g) => `<li><a href="${catHref(g.slug)}">${esc(g.name)} <small style="color:var(--color-text-tertiary)">${g.count}</small></a></li>`).join("")}</ul>` : ""}
      <h3 class="small">${picks.some((p) => p.deal) ? "Deals &amp; popular here" : "Popular here"}</h3>
      <div class="sh-prods">${picks.map(prodCard).join("")}</div>
      <a class="sh-all" style="padding-left:0" href="${catHref(node.slug)}">Shop all ${esc(node.name)} (${node.count})</a>`;
  };
  const show1 = (d) => {
    cur1 = d;
    p1.querySelectorAll("[data-s1]").forEach((b) => b.setAttribute("aria-current", String(DEPTS[b.dataset.s1] === d)));
    p2.innerHTML = `<h3>${esc(d.name)}</h3><a class="sh-all" href="${catHref(d.slug)}">Shop all ${d.count}</a>${d.kids.map((k, i) => row(k, "data-s2", i)).join("")}`;
    showProducts(d);
  };
  const show2 = (k) => {
    p2.querySelectorAll("[data-s2]").forEach((b) => b.setAttribute("aria-current", String(cur1.kids[b.dataset.s2] === k)));
    showProducts(k);
  };
  p1.innerHTML = `<h3>Departments</h3>${DEPTS.map((d, i) => row(d, "data-s1", i)).join("")}<a class="sh-all" href="${SHOP}archive.html">All products</a>`;
  show1(DEPTS[0]);
  ["mouseover", "focusin"].forEach((ev) => {
    p1.addEventListener(ev, (e) => { const b = e.target.closest("[data-s1]"); if (b) show1(DEPTS[b.dataset.s1]); });
    p2.addEventListener(ev, (e) => { const b = e.target.closest("[data-s2]"); if (b) show2(cur1.kids[b.dataset.s2]); });
  });
  const mega = mount.querySelector("#sh-mega");
  mega.addEventListener("keydown", (e) => {
    const pane = e.target.closest(".sh-pane");
    if (!pane) return;
    const items = [...pane.querySelectorAll("button, a")];
    const i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus(); }
    if (e.key === "ArrowRight") { e.preventDefault(); pane.nextElementSibling?.querySelector("button, a")?.focus(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); pane.previousElementSibling?.querySelector("[aria-current=true], button, a")?.focus(); }
  });

  const scrim = mount.querySelector("#sh-scrim");
  const deptBtn = mount.querySelector("#sh-dept"), mini = mount.querySelector("#sh-mini");
  initMega(deptBtn, mega, { scrim });
  initMega(mini, mega, { scrim });
  [deptBtn, mini].forEach((b) => b.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown") return;
    e.preventDefault();
    if (mega.hidden) b.click();
    p1.querySelector("button").focus();
  }));

  const header = mount.querySelector("#sh");
  let ticking = false;
  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { header.classList.toggle("condensed", scrollY > 80); ticking = false; });
  }, { passive: true });

  initTypeahead(mount.querySelector("#sh-q"), mount.querySelector("#sh-ta"));
  initTypeahead(mount.querySelector("#sh-qm"), mount.querySelector("#sh-tam"));
  initDrawer(mount.querySelector("#sh-burger"), { title: "Menu", theme: { "--d-bg": "#0d0d0d", "--d-fg": "#fff", "--d-line": "#262626", "--d-head": "#000" } });
}
