// Builds the static site into dist/ from data/*.json and src/.
// Usage: node build.mjs            (also: npm run build)
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL(".", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const site = JSON.parse(read("data/site.json"));
const products = JSON.parse(read("data/products.json"));
const partials = {
  head: read("src/partials/head.html"),
  header: read("src/partials/header.html"),
  footer: read("src/partials/footer.html"),
};
const pages = {
  home: read("src/pages/home.html"),
  shop: read("src/pages/shop.html"),
  print: read("src/pages/print.html"),
  about: read("src/pages/about.html"),
  contact: read("src/pages/contact.html"),
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const words = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

// {{key}}, {{obj.key}} and {{> partial}} substitution. Unknown keys become "".
function render(tpl, ctx) {
  tpl = tpl.replace(/\{\{>\s*(\w+)\s*\}\}/g, (_, name) => render(partials[name], ctx));
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const v = path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), ctx);
    return v == null ? "" : String(v);
  });
}

function page({ file, template, title, description, canonical, ogImage, pageId, base, extra = {}, jsonld = "" }) {
  const ctx = {
    ...site,
    ...extra,
    base,
    page: pageId,
    title,
    description: esc(description),
    canonical,
    og_image: ogImage,
    robots: site.noindex ? '<meta name="robots" content="noindex">' : "",
    jsonld: jsonld ? `<script type="application/ld+json">${jsonld}</script>` : "",
    form_action: site.form_action || "#",
  };
  const html = render(partials.head, ctx) + render(template, ctx);
  const out = join(ROOT, "dist", file);
  mkdirSync(join(out, ".."), { recursive: true });
  writeFileSync(out, html);
  console.log("built", file);
}

const decorate = (p) => ({ ...p, year_dot: p.year ? ` · ${p.year}` : "", price_fmt: `$${p.price}` });
const P = products.map(decorate);
const bySlug = Object.fromEntries(P.map((p) => [p.slug, p]));
const printUrl = (p, base = "") => `${base}prints/${p.slug}.html`;

// ---------- Home: the current release with an editorial rhythm ----------
function releaseMarkup(list) {
  const buy = (p) => `<a class="link-u buy" href="${printUrl(p)}">Buy print</a>`;
  const full = (p) => `
<article class="stack rule-t" style="padding: 48px 0 56px">
  <a href="${printUrl(p)}"><div class="mat"><img src="${p.image}" alt="${esc(p.alt)}"></div></a>
  <div class="caption-row">
    <span class="num">${p.number}</span>
    <span class="work-title">${p.title}</span>
    <span class="meta">${p.medium}${p.year_dot}</span>
    <span class="meta">Limited print · ${p.size}</span>
    <span class="price">${p.price_fmt}</span>
    ${buy(p)}
  </div>
</article>`;
  const side = (p) => `
<article class="grid12 rule-t" style="padding: 48px 0 56px; align-items: end">
  <a href="${printUrl(p)}" style="grid-column: 1 / span 8"><div class="mat"><img src="${p.image}" alt="${esc(p.alt)}"></div></a>
  <div class="stack" style="grid-column: 9 / span 4; gap: 18px; padding-bottom: 8px; font-size: 15px; color: var(--bone)">
    <span class="num">${p.number}</span>
    <span style="font-size: 44px; font-weight: 300; color: var(--white); letter-spacing: -0.02em; line-height: 1">${p.title}</span>
    ${p.short ? `<p style="line-height: 1.6; max-width: 360px">${p.short}</p>` : ""}
    <span>${p.medium}${p.year_dot} · Limited print · ${p.size}</span>
    <span class="price">${p.price_fmt}</span>
    <a class="link-u" href="${printUrl(p)}" style="align-self: flex-start">Buy print</a>
  </div>
</article>`;
  const half = (p) => `
<article class="stack">
  <a href="${printUrl(p)}"><div class="mat"><img src="${p.image}" alt="${esc(p.alt)}"></div></a>
  <div class="caption-compact">
    <span class="num">${p.number}</span><span class="work-title">${p.title}</span><span class="price">${p.price_fmt}</span>
    <span></span><span>${p.medium}${p.year_dot} · Limited print · ${p.size}</span><a class="link-u" href="${printUrl(p)}">Buy print</a>
  </div>
</article>`;
  const pair = (a, b) => `
<div class="grid2 rule-t" style="padding: 48px 0 56px">${half(a)}${half(b)}</div>`;

  // Pattern: full, side, pair, full, then repeat.
  const out = [];
  let i = 0;
  while (i < list.length) {
    const step = out.length % 4;
    if (step === 2 && list[i + 1]) { out.push(pair(list[i], list[i + 1])); i += 2; }
    else if (step === 1) { out.push(side(list[i])); i += 1; }
    else { out.push(full(list[i])); i += 1; }
  }
  return out.join("\n");
}

const release = P.slice(0, site.home_release_count);
const hero = bySlug[site.hero_product] || P[0];
page({
  file: "index.html", template: pages.home, pageId: "home", base: "",
  title: `${site.name} — ${site.tagline}`, description: site.description, canonical: "", ogImage: hero.image,
  extra: { hero, release: releaseMarkup(release), release_count_words: words[release.length] || release.length },
  jsonld: JSON.stringify({ "@context": "https://schema.org", "@type": "Person", name: site.name, jobTitle: "Artist", url: `https://${site.domain}/`, sameAs: [site.instagram] }),
});

// ---------- Shop ----------
const shopCards = P.map((p) => `
<article class="stack rule-b" style="padding: 56px 0" data-tags="${p.tags.join(" ")}">
  <a href="${printUrl(p)}"><div class="mat" style="padding: 12px"><img src="${p.image}" alt="${esc(p.alt)}"></div></a>
  <div class="caption-compact">
    <span class="num">${p.number}</span><span class="work-title">${p.title}</span><span class="price">${p.price_fmt}</span>
    <span></span><span>${p.medium}${p.year_dot} · ${p.size}</span><a class="link-u" href="${printUrl(p)}">Buy print</a>
  </div>
</article>`).join("\n");
page({
  file: "shop.html", template: pages.shop, pageId: "shop", base: "",
  title: `Shop — ${site.name}`, description: `Limited 16 × 20 inch prints by ${site.name}, each made and signed by hand.`, canonical: "shop.html", ogImage: hero.image,
  extra: { products: shopCards, count: P.length },
});

// ---------- One page per print ----------
for (const p of P) {
  const details = (p.details || []).map((d) => `
<figure class="stack" style="grid-column: span 4; gap: 14px">
  <div class="detail-frame"><img src="../${p.image}" alt="${esc(p.title)}, ${esc(d.caption.toLowerCase())}" style="object-position: ${d.position}; transform: scale(${d.zoom}); transform-origin: ${d.position}"></div>
  <figcaption class="label">${d.caption}</figcaption>
</figure>`);
  const ctx = (p.context || []);
  const first = ctx[0] ? `
<figure class="stack" style="grid-column: span 4; gap: 14px">
  <img src="../${ctx[0].image}" alt="${esc(ctx[0].alt)}">
  <figcaption class="label">${ctx[0].caption}</figcaption>
</figure>` : "";
  const rest = ctx.slice(1);
  const contextRow = rest.length ? `
<div class="grid12" style="align-items: start">${rest.map((c) => `
<figure class="stack" style="grid-column: span ${12 / rest.length}; gap: 14px">
  <img src="../${c.image}" alt="${esc(c.alt)}">
  <figcaption class="label">${c.caption}</figcaption>
</figure>`).join("")}</div>` : "";
  const more = P.filter((q) => q.slug !== p.slug).slice(0, 4).map((q) => `
<a class="stack" href="${q.slug}.html" style="gap: 14px">
  <div class="mat-sm"><img src="../${q.image}" alt="${esc(q.title)}"></div>
  <span style="display: flex; justify-content: space-between; gap: 12px; font-size: 15px"><span>${q.number} · ${q.title}</span><span style="color: var(--stone)">${q.price_fmt}</span></span>
</a>`).join("\n");
  page({
    file: `prints/${p.slug}.html`, template: pages.print, pageId: "shop", base: "../",
    title: `${p.title} — ${site.name}`, description: p.story, canonical: `prints/${p.slug}.html`, ogImage: p.image,
    extra: { p: { ...p, context_note: ctx.length ? " and the piece in the world" : "" }, perspectives: details.join("") + first, context: contextRow, more },
    jsonld: JSON.stringify({ "@context": "https://schema.org", "@type": "Product", name: `${p.title} — limited print`, image: `https://${site.domain}/${p.image}`, description: p.story, brand: { "@type": "Person", name: site.name }, offers: { "@type": "Offer", priceCurrency: "USD", price: p.price, availability: "https://schema.org/InStock", url: `https://${site.domain}/prints/${p.slug}.html` } }),
  });
}

// ---------- About, Contact ----------
page({ file: "about.html", template: pages.about, pageId: "about", base: "", title: `About — ${site.name}`, description: `The story of artist ${site.name}: self-taught in East Oakland, shown at the de Young Museum, drawing by hand in Virginia.`, canonical: "about.html", ogImage: "images/studio.jpg" });
page({ file: "contact.html", template: pages.contact, pageId: "contact", base: "", title: `Contact — ${site.name}`, description: `Ask ${site.name} about an original, a commission or a print.`, canonical: "contact.html", ogImage: "images/deyoung-sign.jpg" });

// ---------- Static files ----------
cpSync(join(ROOT, "public"), join(ROOT, "dist"), { recursive: true });
mkdirSync(join(ROOT, "dist/css"), { recursive: true });
mkdirSync(join(ROOT, "dist/js"), { recursive: true });
cpSync(join(ROOT, "src/css/site.css"), join(ROOT, "dist/css/site.css"));
writeFileSync(join(ROOT, "dist/js/shop.js"), read("src/js/shop.js").replace("__SHOPIFY_CONFIG__", JSON.stringify(site.shopify)));
writeFileSync(join(ROOT, "dist/_redirects"), "/index  /  301\n");
writeFileSync(join(ROOT, "dist/robots.txt"), site.noindex ? "User-agent: *\nDisallow: /\n" : `User-agent: *\nAllow: /\nSitemap: https://${site.domain}/sitemap.xml\n`);
const urls = ["", "shop.html", "about.html", "contact.html", ...P.map((p) => `prints/${p.slug}.html`)];
writeFileSync(join(ROOT, "dist/sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>https://${site.domain}/${u}</loc></url>`).join("\n")}\n</urlset>\n`);
console.log("done →", join(ROOT, "dist"));
