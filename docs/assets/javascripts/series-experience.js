/* Review-only explorer: original media, explicit scenarios, no model calls or analytics collector. */
(() => {
  'use strict';
  const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = (x) => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const $ = (root, selector) => root.querySelector(selector);
  const $$ = (root, selector) => [...root.querySelectorAll(selector)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  function initializePlayer(player) {
    if (!player || player.dataset.ready) return;
    player.dataset.ready = 'true';
    const video = $(player, 'video');
    const play = $(player, '[data-sx-play]');
    if (!video || !play) return;
    play.addEventListener('click', () => {
      if (!video.getAttribute('src')) video.src = video.dataset.src;
      play.hidden = true;
      video.play().catch(() => { play.hidden = false; });
    });
    video.addEventListener('play', () => { play.hidden = true; });
    video.addEventListener('error', () => { play.hidden = false; });
  }

  function initializeHub(hub) {
    if (hub.dataset.ready) return;
    hub.dataset.ready = 'true';
    hub.classList.add('is-enhanced');
    const en = hub.dataset.locale === 'en';
    const overview = $(hub, '[data-sx-overview]');
    const details = $$(hub, '[data-sx-detail]');
    const cards = $$(hub, '[data-sx-card]');
    const search = $(hub, '[data-sx-search]');
    const filters = $$(hub, '[data-sx-filter]');
    let facet = 'all';
    let previousY = 0;
    const map = $(hub, '#mapa');
    // Keep discovery visible first; the complete learning map opens explicitly.
    map.open = location.hash === '#mapa' || window.matchMedia('(min-width: 900px)').matches;
    const applyFilter = () => {
      const words = normalize(search.value).split(/\s+/).filter(Boolean);
      let count = 0;
      for (const card of cards) {
        const visible = (facet === 'all' || card.dataset.facets.split(' ').includes(facet)) && words.every(w => normalize(card.dataset.search).includes(w));
        card.hidden = !visible;
        count += Number(visible);
      }
      $(hub, '[data-sx-count]').textContent = String(count);
      $(hub, '[data-sx-empty]').hidden = count !== 0;
    };
    filters.forEach(button => button.addEventListener('click', () => {
      facet = button.dataset.sxFilter;
      filters.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      applyFilter();
    }));
    const mobileFilter = document.createElement('select');
    mobileFilter.className = 'sx-mobile-filter';
    mobileFilter.dataset.sxMobileFilter = 'true';
    mobileFilter.setAttribute('aria-label', en ? 'Filter by learning goal' : 'Filtrar por objetivo');
    filters.forEach(button => {
      const option = document.createElement('option');
      option.value = button.dataset.sxFilter;
      option.textContent = button.textContent;
      mobileFilter.appendChild(option);
      button.addEventListener('click', () => { mobileFilter.value = button.dataset.sxFilter; });
    });
    mobileFilter.addEventListener('change', () => filters.find(b => b.dataset.sxFilter === mobileFilter.value)?.click());
    $(hub, '.sx-catalog-tools').appendChild(mobileFilter);
    search.addEventListener('input', applyFilter);
    $(hub, '[data-sx-clear]').addEventListener('click', () => {
      search.value = ''; filters[0].click(); search.focus();
    });
    const showHash = () => {
      let hash;
      try { hash = decodeURIComponent(location.hash.slice(1)); }
      catch { hash = ''; } // A malformed shared fragment must not break the library.
      const selected = details.find(d => d.id === hash);
      if (selected && !overview.hidden) previousY = window.scrollY;
      overview.hidden = !!selected;
      for (const detail of details) {
        const active = detail === selected;
        detail.open = active; detail.hidden = !active;
        if (!active) $$(detail, 'video').forEach(v => v.pause());
      }
      if (selected) {
        $(selected, 'h2').focus({preventScroll:true});
        selected.scrollIntoView({block:'start', behavior:'instant'});
      } else if (hash === 'mapa') {
        map.open = true; map.scrollIntoView({block:'start', behavior:'instant'});
      } else if (hash === 'catalogo') {
        window.scrollTo({top: previousY || $(hub,'#catalogo').getBoundingClientRect().top + window.scrollY - 115, behavior:'instant'});
      }
    };
    window.addEventListener('hashchange', showHash);
    showHash();
    $$(hub, '[data-sx-player]').forEach(initializePlayer);
    $$(hub, '[data-sx-preview]').forEach(button => button.addEventListener('click', () => {
      const entry = JSON.parse(button.dataset.sxPreview);
      const detail = button.closest('[data-sx-detail]');
      const video = $(detail, 'video');
      if (!video || !entry.video) return;
      video.pause(); video.removeAttribute('src'); video.load();
      video.poster = entry.poster; video.dataset.src = entry.video;
      $$(video,'track').forEach(t => t.remove());
      if (entry.track) {
        const track = document.createElement('track');
        Object.assign(track, {kind:'captions', src:entry.track, srclang:en?'en':'es', label:en?'English':'Español', default:true});
        video.appendChild(track);
      }
      $(detail,'[data-sx-current-video]').textContent = entry.title;
      $(detail,'.sx-player-fallback').href = entry.watch;
      $$(detail,'.sx-chapter').forEach(c => c.classList.toggle('is-current', c.contains(button)));
      const play = $(detail,'[data-sx-play]'); play.hidden = false; play.click();
      $(detail,'.sx-player').scrollIntoView({block:'center',behavior:reduced.matches?'instant':'smooth'});
    }));
    try {
      const last = JSON.parse(localStorage.getItem('s5:last-reading:v2') || 'null');
      const prefix = en ? '/en/' : '/';
      const url = last && String(last.url || '');
      const chapter = url && $$(hub,'[data-sx-chapter-url]').find(c => c.dataset.sxChapterUrl === url);
      if (chapter && url.startsWith(prefix)) {
        $(hub,'[data-sx-resume]').hidden=false;
        $(hub,'[data-sx-resume-title]').textContent=$(chapter,'h3').textContent;
        $(hub,'[data-sx-resume-link]').href=url;
      }
    } catch { /* Restricted storage does not affect navigation. */ }
    applyFilter();
  }

  function initialize(){
    $$(document,'[data-sx-hub]').forEach(initializeHub);
  }
  if(typeof document$!=='undefined')document$.subscribe(initialize);
  else if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
