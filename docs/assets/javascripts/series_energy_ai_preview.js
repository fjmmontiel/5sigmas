(function () {
  var fullscreenState = {
    overlay: null,
    body: null,
    closeBtn: null,
    isOpen: false
  };

  function closeFullscreen(reason) {
    if (!fullscreenState.overlay) {
      return;
    }

    fullscreenState.overlay.classList.remove("is-open");
    fullscreenState.overlay.setAttribute("aria-hidden", "true");
    fullscreenState.isOpen = false;
    document.body.classList.remove("sp-fullscreen-open");

    if (reason) {
      console.info("[series-preview] fullscreen closed", reason);
    }
  }

  function resetFullscreenState(reason) {
    closeFullscreen(reason || "reset");
    if (fullscreenState.body) {
      fullscreenState.body.innerHTML = "";
    }
  }

  function ensureFullscreenOverlay() {
    if (fullscreenState.overlay) {
      return;
    }

    var overlay = document.createElement("div");
    overlay.className = "sp-fullscreen";
    overlay.setAttribute("aria-hidden", "true");

    var backdrop = document.createElement("div");
    backdrop.className = "sp-fullscreen-backdrop";
    backdrop.addEventListener("click", function () {
      closeFullscreen("backdrop");
    });

    var dialog = document.createElement("div");
    dialog.className = "sp-fullscreen-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");

    var closeBtn = document.createElement("button");
    closeBtn.className = "sp-fullscreen-close";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Cerrar pantalla completa");
    closeBtn.textContent = "Cerrar";
    closeBtn.addEventListener("click", function () {
      closeFullscreen("button");
    });

    var body = document.createElement("div");
    body.className = "sp-fullscreen-body";

    dialog.appendChild(closeBtn);
    dialog.appendChild(body);
    overlay.appendChild(backdrop);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeFullscreen("escape");
      }
    });

    fullscreenState.overlay = overlay;
    fullscreenState.body = body;
    fullscreenState.closeBtn = closeBtn;
  }

  function openFullscreen(options) {
    if (!options) {
      return;
    }

    ensureFullscreenOverlay();
    fullscreenState.body.innerHTML = "";

    if (options.type === "iframe") {
      var iframe = document.createElement("iframe");
      iframe.src = options.src;
      iframe.setAttribute("title", options.title || "Preview");
      iframe.allowFullscreen = true;
      fullscreenState.body.appendChild(iframe);
    } else if (options.type === "node" && options.node) {
      var clone = options.node.cloneNode(true);
      var btns = clone.querySelectorAll(".sp-fullscreen-btn");
      btns.forEach(function (btn) {
        btn.remove();
      });
      fullscreenState.body.appendChild(clone);
    } else {
      return;
    }

    fullscreenState.overlay.classList.add("is-open");
    fullscreenState.overlay.setAttribute("aria-hidden", "false");
    fullscreenState.isOpen = true;
    document.body.classList.add("sp-fullscreen-open");

    console.info("[series-preview] fullscreen opened", options.type);
  }

  function addFullscreenButton(embedWrap, options) {
    if (!embedWrap || embedWrap.dataset.spFullscreenReady === "1") {
      return;
    }

    var button = document.createElement("button");
    button.type = "button";
    button.className = "sp-fullscreen-btn";
    button.setAttribute("aria-label", "Ver pantalla completa");
    button.textContent = "Pantalla completa";
    button.addEventListener("click", function () {
      openFullscreen(options);
    });

    embedWrap.appendChild(button);
    embedWrap.dataset.spFullscreenReady = "1";
  }

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
      var head = ensureCardHead(card, h3);
      addFullscreenButton(head, {
        type: "iframe",
        src: embed,
        title: title || "OWID preview"
      });
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
    // Prevent stale fullscreen overlay from blocking interactions across instant navigation.
    resetFullscreenState("reinit");

    var scope = root || document;
    var cards = scope.querySelectorAll("article.sp-card[data-sp-embed]");
    var localCards = scope.querySelectorAll(".sp-card--local");

    if (!cards.length) {
      if (!localCards.length) {
        return;
      }
    }

    cards.forEach(buildEmbed);
    localCards.forEach(function (card) {
      var titleNode = card.querySelector("h3");
      var head = ensureCardHead(card, titleNode);
      addFullscreenButton(head, {
        type: "node",
        node: card.querySelector(".embed")
      });
    });
    console.info("[series-preview] initialized", cards.length, "embed(s)");
  }

  if (typeof document$ !== "undefined" && document$.subscribe) {
    document$.subscribe(function () {
      resetFullscreenState("nav");
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
