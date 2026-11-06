# rooseveltwashington.art

Static website for artist Roosevelt Washington. Four pages — Home, About, Shop, Contact — plus one page per print. Shopify handles checkout; the site itself is plain HTML, CSS and a little JavaScript, built from two JSON files.

Design rules live in the Claude Design canvas ("Roosevelt Washington — rooseveltwashington.art", Style guide and Site guide artboards). Short version: black ground, white type, Helvetica, every painting shown whole inside a white mat, no shadows, no rounded corners, Instagram is the only social link, no talk of equipment or shipping on the page.

## Layout

```
data/site.json        name, domain, email, Instagram, hero painting, Shopify settings
data/products.json    one entry per print — this is the file you edit most
src/pages/*.html      page templates (home, shop, print, about, contact)
src/partials/*.html   head, header, footer
src/css/site.css      the whole stylesheet
src/js/shop.js        shop filters + Shopify Buy Button wiring
public/images/        artwork and photos (copied to dist/images)
build.mjs             turns the above into dist/
dist/                 the built site (not committed)
```

## Build

Requires Node 18+. No dependencies to install.

```
npm run build     # writes dist/
npm run dev       # build + local preview at http://localhost:4173
```

## Adding a print (the monthly release)

1. Add the photo to `public/images/` as a JPG, at least 2400 px on the long side, named after the work (`provider.jpg`).
2. Add an entry to `data/products.json`. Copy an existing one. Fields:
   - `slug` — lowercase, hyphens; becomes the page URL `prints/<slug>.html`
   - `number` — two digits, in release order
   - `title`, `medium`, `year`, `subject`, `tags` (`family`, `landscape`, `black-and-white`)
   - `price` (number), `size`, `edition`, `paper`
   - `image`, `alt`, `story`, optional `short` (one line used on Home)
   - `details` — two detail crops: `position` (CSS object-position) and `zoom`
   - `context` — optional photos of the piece in the studio or on a wall
   - `shopify_product_id` — from Shopify, once the product exists there
3. `npm run build`. The print page, the Shop card and the Home release update together.
4. Commit and push to `main`. GitHub Pages rebuilds and deploys on its own (about a minute).

`home_release_count` in `data/site.json` controls how many works the Home page shows (default 5). The first entries in `products.json` are the current release; move older ones down the list.

## Shopify

The site stays static; Shopify runs the cart and payment.

1. Create the store (Starter plan is enough for Buy Button checkout; Basic has lower card fees).
2. Create one product per print. Price $500, one variant (16 × 20 in), inventory = edition size so it sells out on its own.
3. Enable the **Buy Button** sales channel and create a Storefront access token.
4. In `data/site.json` set `shopify.enabled: true`, `shopify.domain` (`your-store.myshopify.com`) and `shopify.storefront_access_token`.
5. Put each product's Storefront ID in `shopify_product_id` in `products.json`.
6. Rebuild and deploy. "Add to cart" and the Cart link in the header go live; the cart drawer is styled to match the site.

Until `shopify.enabled` is true, the buttons are inert and show "Checkout opens soon" when clicked.

## Contact form

`form_action` in `data/site.json` is the endpoint the form posts to. Leave it unset for the demo. For launch, point it at a form service (Formspree, Basin, etc.) that delivers to Roosevelt's inbox; GitHub Pages serves static files only, so the form needs an outside endpoint.

## Deploying

The site is hosted on GitHub Pages. `.github/workflows/pages.yml` builds `dist/` and publishes it on every push to `main`; there is no separate deploy command. Progress shows under the repo's Actions tab, and the previous build stays live until the new one finishes.

Settings that live in the repo's Pages settings, not in the code: custom domain `rooseveltwashington.art` and Enforce HTTPS (on). Both domains are registered at GoDaddy. `rooseveltwashington.art` points at GitHub Pages; `rooseveltwashington.com` still shows the GoDaddy parking page and should be set to forward to `https://rooseveltwashington.art` in the GoDaddy domain settings.

## Before launch

- Replace the 800 px artwork files with full-resolution scans or photos.
- Fill `[EDITION SIZE]`, `[PAPER STOCK]` and `[EMAIL ADDRESS]`.
- Confirm the work titles with Roosevelt (his file names were used).
