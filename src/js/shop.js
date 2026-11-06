/* Shopify checkout for rooseveltwashington.art
 *
 * The site is static. Shopify handles the cart, payment, inventory and order emails.
 * Until data/site.json has shopify.enabled = true with a store domain and a
 * Storefront access token, "Add to cart" buttons stay inert and a note is logged.
 *
 * Wiring plan (Shopify Buy Button JS SDK, loaded only when enabled):
 *   1. Each print page carries data-product="<slug>" and data-shopify-id="<product id>".
 *   2. On load we create one ShopifyBuy client and a shared cart (toggle in the header).
 *   3. "Add to cart" adds the product's single 16x20 variant with the chosen quantity.
 */
(function () {
  var config = __SHOPIFY_CONFIG__;
  var cartCount = document.querySelector("[data-cart-count]");
  var product = document.querySelector("[data-product]");
  var addBtn = document.querySelector("[data-add-to-cart]");

  // Lightbox: any .zoom button or card image opens the full-size work.
  var box = document.createElement("div");
  box.className = "lightbox";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", "Full-size view");
  box.innerHTML =
    '<button type="button" class="lightbox-close" aria-label="Close">Close</button>' +
    '<figure class="lightbox-figure"><img alt=""><figcaption class="lightbox-caption"><span class="lightbox-title"></span><span class="lightbox-price"></span><a class="btn lightbox-buy" href="#">Buy this print</a></figcaption></figure>';
  document.body.appendChild(box);
  var boxImg = box.querySelector("img");
  var boxTitle = box.querySelector(".lightbox-title");
  var boxPrice = box.querySelector(".lightbox-price");
  var boxBuy = box.querySelector(".lightbox-buy");
  function openBox(src, alt, meta) {
    boxImg.src = src; boxImg.alt = alt || "";
    meta = meta || {};
    boxTitle.textContent = meta.title || "";
    boxPrice.textContent = meta.price || "";
    if (meta.href) { boxBuy.href = meta.href; boxBuy.style.display = ""; } else { boxBuy.style.display = "none"; }
    box.classList.add("is-open"); document.body.style.overflow = "hidden";
  }
  function closeBox() { box.classList.remove("is-open"); boxImg.src = ""; document.body.style.overflow = ""; }
  box.addEventListener("click", function (e) { if (!e.target.closest(".lightbox-buy")) closeBox(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && box.classList.contains("is-open")) closeBox(); });
  document.querySelectorAll("[data-zoom]").forEach(function (el) {
    el.addEventListener("click", function () { openBox(el.getAttribute("data-zoom"), (el.querySelector("img") || {}).alt); });
  });
  document.querySelectorAll(".card-image").forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      var img = a.querySelector("img");
      var card = a.closest(".card");
      openBox(img.src, img.alt, { title: card.getAttribute("data-title"), price: card.getAttribute("data-price"), href: card.getAttribute("data-href") });
    });
  });

  // Contact form. Posts to data/site.json form_action (Formspree or any endpoint
  // that accepts a form POST and answers JSON). Without one, falls back to the
  // visitor's email app if the site has an address, otherwise points to Instagram.
  var form = document.querySelector("[data-contact-form]");
  if (form) {
    var action = form.getAttribute("action") || "";
    var endpoint = /^https?:\/\//.test(action) ? action : "";
    var fallbackEmail = form.getAttribute("data-fallback-email") || "";
    var hasEmail = fallbackEmail.indexOf("@") !== -1;
    var instagram = form.getAttribute("data-instagram") || "";
    var sendBtn = form.querySelector('button[type="submit"]');
    var status = form.querySelector("[data-form-status]");
    var fields = function () {
      var get = function (n) { var el = form.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ""; };
      return { name: (get("first_name") + " " + get("last_name")).trim(), email: get("email"), topic: get("topic"), message: get("message"), newsletter: form.querySelector('[name="newsletter"]').checked };
    };
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var gotcha = form.querySelector('[name="_gotcha"]');
      if (gotcha && gotcha.value) return;
      var f = fields();
      if (!endpoint) {
        if (hasEmail) {
          var body = f.message + "\n\n" + f.name + "\n" + f.email + (f.newsletter ? "\nPlease email me about new prints." : "");
          location.href = "mailto:" + fallbackEmail + "?subject=" + encodeURIComponent(f.topic + " — from rooseveltwashington.art") + "&body=" + encodeURIComponent(body);
          status.textContent = "Your email app should open with the message ready to send.";
        } else {
          status.innerHTML = 'The message form is not connected yet. For now, reach Roosevelt on <a href="' + instagram + '" rel="noopener" target="_blank">Instagram</a>.';
        }
        return;
      }
      sendBtn.disabled = true;
      sendBtn.textContent = "Sending";
      status.textContent = "";
      fetch(endpoint, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
        .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json().catch(function () { return {}; }); })
        .then(function () {
          form.reset();
          sendBtn.textContent = "Sent";
          status.textContent = "Sent. Roosevelt reads every message himself and will reply by email.";
        })
        .catch(function () {
          sendBtn.disabled = false;
          sendBtn.textContent = "Send message";
          status.innerHTML = "Something went wrong and the message was not sent. Please try again" + (hasEmail ? ' or email <a href="mailto:' + fallbackEmail + '">' + fallbackEmail + "</a>." : ".");
        });
    });
  }

  // Privacy notice: shown until closed once. Nothing is sent anywhere; the choice stays in this browser.
  var notice = document.querySelector("[data-notice]");
  if (notice) {
    var seen = false;
    try { seen = localStorage.getItem("rw_notice_v1") === "1"; } catch (e) {}
    if (!seen) notice.classList.add("is-open");
    notice.querySelector("[data-notice-close]").addEventListener("click", function () {
      notice.classList.remove("is-open");
      try { localStorage.setItem("rw_notice_v1", "1"); } catch (e) {}
    });
  }

  // Share: phone share sheet when available, otherwise a small menu.
  var shareMenu = document.createElement("div");
  shareMenu.className = "share-menu";
  shareMenu.setAttribute("role", "dialog");
  shareMenu.setAttribute("aria-label", "Share");
  shareMenu.innerHTML =
    '<div class="share-card">' +
    '<p class="share-heading">Share</p>' +
    '<a class="share-opt" data-net="whatsapp" href="#" target="_blank" rel="noopener">WhatsApp</a>' +
    '<a class="share-opt" data-net="sms" href="#">Text message</a>' +
    '<a class="share-opt" data-net="email" href="#">Email</a>' +
    '<button type="button" class="share-opt" data-net="copy">Copy link</button>' +
    '<button type="button" class="share-close">Close</button>' +
    "</div>";
  document.body.appendChild(shareMenu);
  function closeShare() { shareMenu.classList.remove("is-open"); }
  shareMenu.addEventListener("click", function (e) { if (e.target === shareMenu || e.target.closest(".share-close")) closeShare(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeShare(); });
  function openShareMenu(text, url) {
    var enc = encodeURIComponent;
    shareMenu.querySelector('[data-net="whatsapp"]').href = "https://wa.me/?text=" + enc(text);
    shareMenu.querySelector('[data-net="sms"]').href = "sms:?&body=" + enc(text);
    shareMenu.querySelector('[data-net="email"]').href = "mailto:?subject=" + enc("Roosevelt Washington — fine art by hand") + "&body=" + enc(text);
    var copy = shareMenu.querySelector('[data-net="copy"]');
    copy.textContent = "Copy link";
    copy.onclick = function () {
      var done = function () { copy.textContent = "Copied"; setTimeout(closeShare, 900); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, done);
      else { window.prompt("Copy this link", url); done(); }
    };
    shareMenu.classList.add("is-open");
  }
  document.querySelectorAll("[data-share]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-share-text") || document.title;
      var url = btn.getAttribute("data-share-url") || location.href;
      if (navigator.share) {
        navigator.share({ title: "Roosevelt Washington", text: text.replace(url, "").trim(), url: url }).catch(function () {});
      } else {
        openShareMenu(text, url);
      }
    });
  });

  // Shop page filters (pure client-side, no Shopify needed).
  var filter = document.querySelector("[data-filter]");
  var grid = document.querySelector("[data-shop-grid]");
  if (filter && grid) {
    filter.addEventListener("click", function (e) {
      var a = e.target.closest("a[data-tag]");
      if (!a) return;
      e.preventDefault();
      var tag = a.getAttribute("data-tag");
      filter.querySelectorAll("a").forEach(function (x) {
        var on = x === a;
        x.style.color = on ? "" : "var(--stone)";
        x.style.borderBottom = on ? "1px solid #fff" : "";
        x.style.paddingBottom = on ? "6px" : "";
      });
      grid.querySelectorAll("[data-tags]").forEach(function (card) {
        var tags = card.getAttribute("data-tags").split(" ");
        card.style.display = tag === "all" || tags.indexOf(tag) !== -1 ? "" : "none";
      });
    });
  }

  if (!config || !config.enabled) {
    if (addBtn) {
      addBtn.addEventListener("click", function () {
        addBtn.textContent = "Checkout opens soon";
        setTimeout(function () { addBtn.textContent = "Add to cart"; }, 1800);
      });
    }
    return;
  }

  var s = document.createElement("script");
  s.src = "https://sdks.shopifycdn.com/buy-button/latest/buy-button-storefront.min.js";
  s.onload = init;
  document.head.appendChild(s);

  function init() {
    var client = window.ShopifyBuy.buildClient({
      domain: config.domain,
      storefrontAccessToken: config.storefront_access_token,
    });
    window.ShopifyBuy.UI.onReady(client).then(function (ui) {
      var options = {
        cart: { startOpen: false, popup: false, text: { title: "Your prints", total: "Subtotal", button: "Checkout" },
          styles: { cart: { "background-color": "#0A0A0A", color: "#fff" }, button: { "background-color": "#fff", color: "#0A0A0A", "border-radius": "0", "font-family": "Helvetica Neue, Helvetica, Arial, sans-serif", ":hover": { "background-color": "#C9A34E" } } } },
        toggle: { sticky: false, styles: { toggle: { display: "none" } } },
      };
      var cartNode = document.createElement("div");
      document.body.appendChild(cartNode);
      ui.createComponent("cart", { node: cartNode, options: options }).then(function (cart) {
        function sync() { if (cartCount && cart.model) cartCount.textContent = cart.model.lineItems.reduce(function (n, li) { return n + li.quantity; }, 0); }
        sync();
        var cartLink = document.querySelector("[data-cart]");
        if (cartLink) cartLink.addEventListener("click", function (e) { e.preventDefault(); cart.open(); });

        if (product && addBtn && product.getAttribute("data-shopify-id")) {
          var id = product.getAttribute("data-shopify-id");
          client.product.fetch(id).then(function (p) {
            var variant = p.variants[0];
            addBtn.addEventListener("click", function () {
              var qty = parseInt((document.querySelector("[data-qty]") || {}).value || "1", 10) || 1;
              cart.addVariantToCart(variant, qty).then(function () { sync(); cart.open(); });
            });
          });
        }
      });
    });
  }
})();
