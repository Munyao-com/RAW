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

const SHARE_TITLE = "Roosevelt Washington. Every piece by his own hand.";
const SHARE_DESC = "Fine art by hand — limited prints and originals by the artist. rooseveltwashington.art";

function page({ file, template, title, description, canonical, ogImage, pageId, base, extra = {}, jsonld = "", shareTitle, shareDescription, ogSize }) {
  const ctx = {
    ...site,
    ...extra,
    base,
    page: pageId,
    title,
    description: esc(description),
    share_title: esc(shareTitle || SHARE_TITLE),
    share_description: esc(shareDescription || SHARE_DESC),
    canonical,
    og_image: ogImage,
    og_w: (ogSize || [1200, 630])[0],
    og_h: (ogSize || [1200, 630])[1],
    share_text: esc(`${SHARE_TITLE} https://${site.domain}/${canonical}`),
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

// ---------- One compact card, used on Home and Shop ----------
function card(p, base = "") {
  return `
<article class="card" data-tags="${p.tags.join(" ")}" data-title="${esc(p.title)}" data-price="${p.price_fmt}" data-href="${printUrl(p, base)}">
  <a class="card-image" href="${printUrl(p, base)}"><div class="mat-sm"><img src="${base}${p.image}" alt="${esc(p.alt)}" loading="lazy"></div></a>
  <div class="card-caption">
    <span class="num">${p.number}</span>
    <a class="work-title" href="${printUrl(p, base)}">${p.title}</a>
    <span class="price">${p.price_fmt}</span>
    <span class="card-meta">${p.medium}${p.year_dot}</span>
    <a class="link-u" href="${printUrl(p, base)}">Buy print</a>
  </div>
</article>`;
}

// ---------- Home: the current release with an editorial rhythm (kept for reference) ----------
function releaseMarkupEditorial(list) {
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
  title: `${site.name} — Fine Art by Hand | Black Family Portraits in Pastel, Oil and Charcoal`, description: "Roosevelt Washington is a self-taught American fine artist from East Oakland, shown at the de Young Museum, now working in Virginia. Original pastel, oil and charcoal works of Black family life, and limited signed prints.", canonical: "", ogImage: "images/share.jpg",
  extra: { hero, release: release.map((p) => card(p)).join("\n"), release_count_words: words[release.length] || release.length },
  jsonld: JSON.stringify({ "@context": "https://schema.org", "@graph": [
    { "@type": "Person", "@id": `https://${site.domain}/#artist`, name: site.name, jobTitle: "Fine artist", description: "Self-taught American fine artist from East Oakland, California, shown at the de Young Open (de Young Museum, San Francisco). Works in pastel pencil, oil and charcoal. Known for portraits of Black family life: fathers with newborns, mothers, sisters and brothers.", url: `https://${site.domain}/`, image: `https://${site.domain}/images/studio.jpg`, sameAs: [site.instagram].filter(Boolean), homeLocation: { "@type": "Place", name: "Virginia, United States" }, birthPlace: { "@type": "Place", name: "East Oakland, California" }, knowsAbout: ["Pastel pencil drawing", "Oil painting", "Charcoal drawing", "Portraiture", "Black family life in art"] },
    { "@type": "WebSite", "@id": `https://${site.domain}/#website`, url: `https://${site.domain}/`, name: site.name, description: site.description, publisher: { "@id": `https://${site.domain}/#artist` }, inLanguage: "en" },
    { "@type": "ItemList", name: "Current release — limited prints", itemListElement: release.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `https://${site.domain}/prints/${p.slug}.html`, name: p.title })) }
  ] }),
});

// ---------- Shop ----------
const shopCards = P.map((p) => card(p)).join("\n");
page({
  file: "shop.html", template: pages.shop, pageId: "shop", base: "",
  title: `Limited Edition Art Prints — ${site.name}`, description: `Buy limited edition 16 × 20 inch fine art prints by Roosevelt Washington: Innocence, Father's Love, Provider, Sister's Love, Cool Breeze and more. Signed by hand. $500 each.`, canonical: "shop.html", ogImage: "images/share.jpg",
  extra: { products: shopCards, count: P.length },
});

// ---------- One page per print ----------
for (const p of P) {
  const details = (p.details || []).map((d) => `
<figure class="thumb">
  <div class="detail-frame"><img src="../${p.image}" alt="${esc(p.title)}, ${esc(d.caption.toLowerCase())}" style="object-position: ${d.position}; transform: scale(${d.zoom}); transform-origin: ${d.position}"></div>
  <figcaption class="label label-stone">${d.caption}</figcaption>
</figure>`);
  const ctx = (p.context || []);
  const first = ctx[0] ? `
<figure class="thumb">
  <button type="button" class="zoom" data-zoom="../${ctx[0].image}" aria-label="View larger"><img src="../${ctx[0].image}" alt="${esc(ctx[0].alt)}"></button>
  <figcaption class="label label-stone">${ctx[0].caption}</figcaption>
</figure>` : "";
  const rest = ctx.slice(1);
  const contextRow = rest.length ? `
<section class="wrap section-sm rule-b stack" style="gap: 28px">
  <h2 class="label label-gold">The work in the world</h2>
  <div class="grid3">${rest.map((c) => `
<figure class="thumb">
  <button type="button" class="zoom" data-zoom="../${c.image}" aria-label="View larger"><img src="../${c.image}" alt="${esc(c.alt)}" loading="lazy"></button>
  <figcaption class="label label-stone">${c.caption}</figcaption>
</figure>`).join("")}</div>
</section>` : "";
  const more = P.filter((q) => q.slug !== p.slug).slice(0, 4).map((q) => `
<a class="stack" href="${q.slug}.html" style="gap: 14px">
  <div class="mat-sm"><img src="../${q.image}" alt="${esc(q.title)}" loading="lazy"></div>
  <span style="display: flex; justify-content: space-between; gap: 12px; font-size: 15px"><span>${q.number} · ${q.title}</span><span style="color: var(--stone)">${q.price_fmt}</span></span>
</a>`).join("\n");
  page({
    file: `prints/${p.slug}.html`, template: pages.print, pageId: "shop", base: "../",
    title: `${p.title} — Limited Edition Print by Roosevelt Washington`, description: `${p.title} by Roosevelt Washington. ${p.medium}${p.year ? ", " + p.year : ""}. Limited edition signed print, ${p.size}, $${p.price}. ${p.story}`, canonical: `prints/${p.slug}.html`, ogImage: p.image, ogSize: [800, 800], shareTitle: `${p.title} — Roosevelt Washington. Every piece by his own hand.`, shareDescription: `Limited print, $${p.price}. ${p.story}`,
    extra: { p, perspectives: details.join("") + first, context: contextRow, more },
    jsonld: JSON.stringify({ "@context": "https://schema.org", "@graph": [
      { "@type": "VisualArtwork", "@id": `https://${site.domain}/prints/${p.slug}.html#artwork`, name: p.title, artist: { "@id": `https://${site.domain}/#artist`, "@type": "Person", name: site.name }, artMedium: p.medium, artform: "Drawing", dateCreated: p.year || undefined, image: `https://${site.domain}/${p.image}`, description: p.story, url: `https://${site.domain}/prints/${p.slug}.html` },
      { "@type": "Product", name: `${p.title} — limited edition print`, image: `https://${site.domain}/${p.image}`, description: p.story, sku: `RW-${p.number}`, brand: { "@type": "Brand", name: site.name }, category: "Fine art prints", isRelatedTo: { "@id": `https://${site.domain}/prints/${p.slug}.html#artwork` }, offers: { "@type": "Offer", priceCurrency: "USD", price: p.price, availability: "https://schema.org/InStock", itemCondition: "https://schema.org/NewCondition", url: `https://${site.domain}/prints/${p.slug}.html`, seller: { "@id": `https://${site.domain}/#artist` } } },
      { "@type": "BreadcrumbList", itemListElement: [ { "@type": "ListItem", position: 1, name: "Home", item: `https://${site.domain}/` }, { "@type": "ListItem", position: 2, name: "Prints", item: `https://${site.domain}/shop.html` }, { "@type": "ListItem", position: 3, name: p.title, item: `https://${site.domain}/prints/${p.slug}.html` } ] }
    ] }),
  });
}

// ---------- About, Contact ----------
page({ file: "about.html", template: pages.about, pageId: "about", base: "", title: `About the Artist — Roosevelt Washington | Self-Taught Fine Artist, de Young Open`, description: `The story of Roosevelt Washington: self-taught in East Oakland, discovered pastel pencil by accident, selected for the de Young Open at the de Young Museum in San Francisco, now drawing and painting by hand in Virginia.`, canonical: "about.html", ogImage: "images/share.jpg" });
page({ file: "contact.html", template: pages.contact, pageId: "contact", base: "", title: `Contact — ${site.name}`, description: `Ask ${site.name} about an original, a commission or a print.`, canonical: "contact.html", ogImage: "images/share.jpg" });

// ---------- Static files ----------
cpSync(join(ROOT, "public"), join(ROOT, "dist"), { recursive: true });
mkdirSync(join(ROOT, "dist/css"), { recursive: true });
mkdirSync(join(ROOT, "dist/js"), { recursive: true });
cpSync(join(ROOT, "src/css/site.css"), join(ROOT, "dist/css/site.css"));
writeFileSync(join(ROOT, "dist/js/shop.js"), read("src/js/shop.js").replace("__SHOPIFY_CONFIG__", JSON.stringify(site.shopify)));
writeFileSync(join(ROOT, "dist/_redirects"), "/index  /  301\n");
const aiBots = ["GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-User", "anthropic-ai", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot", "Applebot-Extended", "Bingbot", "Amazonbot", "cohere-ai", "DuckAssistBot", "YouBot"];
writeFileSync(join(ROOT, "dist/robots.txt"), site.noindex
  ? "User-agent: *\nDisallow: /\n"
  : `User-agent: *\nAllow: /\n\n${aiBots.map((b) => `User-agent: ${b}\nAllow: /`).join("\n\n")}\n\nSitemap: https://${site.domain}/sitemap.xml\n`);
writeFileSync(join(ROOT, "dist/llms.txt"), `# Roosevelt Washington — rooseveltwashington.art

> Roosevelt Washington is a self-taught American fine artist. He grew up in East Oakland, California, discovered pastel pencil by accident, was selected for the de Young Open at the de Young Museum in San Francisco (2023), and now draws and paints by hand in his studio in Virginia. He works in pastel pencil, oil and charcoal. His best-known subject is Black family life: fathers with newborns, mothers, sisters and brothers. Every work is made entirely by his own hand; nothing is generated.

## What is for sale
- Limited edition signed prints, ${P[0].size}, $${P[0].price} each, released as limited sets. Current works: ${P.map((p) => p.title).join(", ")}.
- Original works are sold by private inquiry through the contact page.
- New works are released at the start of each month.

## Pages
- Home: https://${site.domain}/
- Prints (shop): https://${site.domain}/shop.html
- About the artist: https://${site.domain}/about.html
- Contact: https://${site.domain}/contact.html
${P.map((p) => `- ${p.title} (${p.medium}${p.year ? ", " + p.year : ""}): https://${site.domain}/prints/${p.slug}.html`).join("\n")}

## Facts for answering questions
- Artist: Roosevelt Washington. Medium: pastel pencil, oil, charcoal. Based in Virginia, USA. From East Oakland, California.
- Exhibited: the de Young Open, de Young Museum, San Francisco.
- Website: https://${site.domain} (rooseveltwashington.com forwards here). Instagram: ${site.instagram}
- Prints: limited sets, signed by hand, ${P[0].size}, $${P[0].price}. Originals: by inquiry.
`);
const urls = ["", "shop.html", "about.html", "contact.html", ...P.map((p) => `prints/${p.slug}.html`)];
writeFileSync(join(ROOT, "dist/sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>https://${site.domain}/${u}</loc></url>`).join("\n")}\n</urlset>\n`);
console.log("done →", join(ROOT, "dist"));
