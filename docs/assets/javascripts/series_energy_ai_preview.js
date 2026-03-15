(function () {
  function ensureCardHead(card, titleNode) {
    if (!card) {
      return null;
    }

    var existing = card.querySelector(".sp-card-head");
    if (existing) {
      return existing;
    }

    var head = document.createElement("div");
    head.className = "sp-card-head";

    if (titleNode && titleNode.parentNode === card) {
      card.insertBefore(head, titleNode);
      head.appendChild(titleNode);
    } else {
      card.insertBefore(head, card.firstChild);
    }

    return head;
  }

  function buildEmbed(card) {
    if (!card || card.dataset.spReady === "1") {
      return;
    }

    if (card.classList.contains("sp-card--local")) {
      card.dataset.spReady = "1";
      return;
    }

    var embed = card.getAttribute("data-sp-embed");
    if (!embed) {
      console.warn("[series-preview] Missing data-sp-embed", card);
      return;
    }

    var title = card.getAttribute("data-sp-title") || "";
    var desc = card.getAttribute("data-sp-desc") || "";
    var href = card.getAttribute("data-sp-href") || embed;
    var caption = card.getAttribute("data-sp-caption") || "";

    card.innerHTML = "";

    if (title) {
      var h3 = document.createElement("h3");
      h3.textContent = title;
      ensureCardHead(card, h3);
    }

    if (desc) {
      var p = document.createElement("p");
      p.className = "muted";
      p.textContent = desc;
      card.appendChild(p);
    }

    var embedWrap = document.createElement("div");
    embedWrap.className = "embed";

    var iframe = document.createElement("iframe");
    iframe.src = embed;
    iframe.loading = "lazy";
    iframe.setAttribute("title", title || "OWID preview");
    iframe.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
    iframe.allowFullscreen = true;

    embedWrap.appendChild(iframe);
    card.appendChild(embedWrap);

    if (caption || href) {
      var cap = document.createElement("p");
      cap.className = "caption";

      if (href) {
        var link = document.createElement("a");
        link.href = href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = caption || "Abrir OWID";
        cap.appendChild(link);
      } else {
        cap.textContent = caption;
      }

      card.appendChild(cap);
    }

    card.dataset.spReady = "1";
  }

  function initSeriesPreviews(root) {
    var scope = root || document;
    var cards = scope.querySelectorAll("article.sp-card[data-sp-embed]");
    if (!cards.length) {
      return;
    }

    cards.forEach(buildEmbed);
    console.info("[series-preview] initialized", cards.length, "embed(s)");
  }

  if (typeof document$ !== "undefined" && document$.subscribe) {
    document$.subscribe(function () {
      initSeriesPreviews(document);
    });
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initSeriesPreviews(document);
    });
  } else {
    initSeriesPreviews(document);
  }
})();
