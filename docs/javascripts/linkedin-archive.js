(() => {
  const tabs = Array.from(document.querySelectorAll("[data-li-tab]"));
  const panels = Array.from(document.querySelectorAll("[data-li-panel]"));

  const activateTab = (series) => {
    if (!series || panels.length === 0) return;

    tabs.forEach((tab) => {
      const isActive = tab.dataset.liTab === series;
      tab.setAttribute("aria-selected", String(isActive));
      tab.toggleAttribute("data-active", isActive);
    });

    panels.forEach((panel) => {
      const isActive = panel.dataset.liPanel === series;
      panel.hidden = !isActive;
      panel.toggleAttribute("data-active", isActive);
    });
  };

  if (tabs.length > 0 && panels.length > 0) {
    const initial = window.location.hash.replace("#", "") || tabs[0].dataset.liTab;
    activateTab(panels.some((panel) => panel.dataset.liPanel === initial) ? initial : tabs[0].dataset.liTab);

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const series = tab.dataset.liTab;
        activateTab(series);
        history.replaceState(null, "", `#${series}`);
      });
    });
  }

  const decks = document.querySelectorAll("[data-li-deck]");

  decks.forEach((deck) => {
    const track = deck.querySelector("[data-li-track]");
    const slides = Array.from(deck.querySelectorAll(".li-slide"));
    const prev = deck.querySelector("[data-li-prev]");
    const next = deck.querySelector("[data-li-next]");
    const current = deck.querySelector("[data-li-current]");

    if (!track || slides.length === 0 || !prev || !next || !current) return;

    let active = 0;

    const update = (nextIndex, shouldScroll = true) => {
      active = Math.max(0, Math.min(slides.length - 1, nextIndex));
      current.textContent = String(active + 1);
      prev.disabled = active === 0;
      next.disabled = active === slides.length - 1;
      deck.querySelectorAll(".li-slide-dot").forEach((dot, index) => {
        dot.toggleAttribute("aria-current", index === active);
      });
      if (shouldScroll) {
        slides[active].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    };

    prev.addEventListener("click", () => update(active - 1));
    next.addEventListener("click", () => update(active + 1));

    deck.querySelectorAll(".li-slide-dot").forEach((dot, index) => {
      dot.addEventListener("click", (event) => {
        event.preventDefault();
        update(index);
      });
    });

    track.addEventListener(
      "scroll",
      () => {
        const center = track.scrollLeft + track.clientWidth / 2;
        let nearest = 0;
        let distance = Infinity;

        slides.forEach((slide, index) => {
          const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
          const delta = Math.abs(slideCenter - center);
          if (delta < distance) {
            nearest = index;
            distance = delta;
          }
        });

        if (nearest !== active) update(nearest, false);
      },
      { passive: true }
    );

    update(0, false);
  });
})();
