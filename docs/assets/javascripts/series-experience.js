/* Human series navigation. Original media and article contents are not rewritten. */
(() => {
  'use strict';
  const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = (x) => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const $ = (root, selector) => root.querySelector(selector);
  const $$ = (root, selector) => [...root.querySelectorAll(selector)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let disposeHub = null;

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  function progressKey(en){ return 's5:series-progress:v1:'+(en?'en':'es'); }

  function readProgress(en){
    try {
      const value=JSON.parse(localStorage.getItem(progressKey(en))||'{}');
      return value&&typeof value==='object'?value:{};
    } catch { return {}; }
  }

  function recordReaderProgress(){
    const match=location.pathname.match(/^\/(en\/)?series\/([^/]+)\/([^/]+)\/?$/);
    if(!match || match[3].startsWith('00')) return;
    const en=Boolean(match[1]), slug=match[2], path=location.pathname;
    const store=readProgress(en);
    const visited=new Set(Array.isArray(store[slug])?store[slug]:[]);
    visited.add(path);
    store[slug]=[...visited].slice(-32);
    try { localStorage.setItem(progressKey(en),JSON.stringify(store)); } catch {}
  }

  function applySeriesProgress(hub,cards,en){
    const store=readProgress(en);
    cards.forEach(card=>{
      const slug=card.dataset.seriesSlug||'';
      const progress=$(card,'[data-sx-progress]');
      if(!slug||!progress)return;
      const total=Number(progress.dataset.sxTotal||0);
      const visited=new Set(Array.isArray(store[slug])?store[slug]:[]);
      const count=Math.min(total,visited.size);
      progress.hidden=count===0;
      const label=$(progress,'[data-sx-progress-label]');
      const bar=$(progress,'[data-sx-progress-bar]');
      if(label)label.textContent=`${count}/${total}`;
      if(bar)bar.style.width=(total?Math.round((count/total)*100):0)+'%';
      const detail=$(hub,`#serie-${CSS.escape(slug)}`);
      $$(detail||hub,'[data-sx-chapter-url]').forEach(chapter=>{
        chapter.classList.toggle('is-visited',visited.has(chapter.dataset.sxChapterUrl));
      });
    });
  }

  function initializeCardPreview(card){
    if(!card || card.dataset.previewReady) return;
    card.dataset.previewReady='true';
    const video=$(card,'[data-sx-card-video]');
    const art=$(card,'.sx-card-art');
    if(!video||!art||!finePointer.matches)return;
    let loaded=false;
    const start=()=>{
      if(reduced.matches)return;
      if(!loaded){
        video.src=video.dataset.src||'';
        video.load();
        loaded=true;
      }
      video.muted=true;
      const promise=video.play();
      if(promise&&typeof promise.then==='function'){
        promise.then(()=>card.classList.add('is-previewing')).catch(()=>card.classList.remove('is-previewing'));
      }
    };
    const stop=()=>{
      video.pause();
      card.classList.remove('is-previewing');
      if(video.readyState>=1){ try{video.currentTime=0}catch{} }
    };
    art.addEventListener('pointerenter',event=>{ if(event.pointerType!=='touch')start(); });
    art.addEventListener('pointerleave',stop);
    art.addEventListener('blur',stop,true);
  }

  function initializeFollowPlayer(player,video,en){
    if(!player||!video||player.dataset.followReady)return;
    player.dataset.followReady='true';
    let placeholder=null,tools=null,back=null,close=null;
    let interacted=false,suppressed=false,floating=false,raf=0,normalHeight=0;

    const ensureScaffold=()=>{
      if(placeholder)return;
      placeholder=document.createElement('div');
      placeholder.className='sx-player-follow-placeholder';
      placeholder.setAttribute('aria-hidden','true');
      player.before(placeholder);
      tools=document.createElement('div');tools.className='sx-follow-tools';tools.hidden=true;
      back=document.createElement('button');back.type='button';back.className='sx-follow-back';
      back.textContent=en?'Back to video':'Volver al vídeo';
      close=document.createElement('button');close.type='button';close.className='sx-follow-close';
      close.setAttribute('aria-label',en?'Close mini player':'Cerrar mini reproductor');close.textContent='×';
      tools.append(back,close);player.appendChild(tools);
      back.addEventListener('click',()=>{
        placeholder.scrollIntoView({block:'center',behavior:reduced.matches?'auto':'smooth'});
        requestAnimationFrame(schedule);
      });
      close.addEventListener('click',()=>{
        video.pause();suppressed=true;setFloating(false);
      });
    };
    const captureHeight=()=>{
      if(floating)return;
      normalHeight=Math.max(normalHeight,player.getBoundingClientRect().height);
    };
    const setFloating=value=>{
      if(floating===value)return;
      if(value){
        ensureScaffold();captureHeight();
        placeholder.style.height=Math.max(1,normalHeight)+'px';
      }else if(placeholder){
        placeholder.style.height='0px';
      }
      floating=value;
      player.classList.toggle('is-following',value);
      if(tools)tools.hidden=!value;
    };
    const evaluate=()=>{
      raf=0;
      if(!interacted||!placeholder)return;
      captureHeight();
      const anchor=floating?placeholder:player;
      const rect=anchor.getBoundingClientRect();
      const height=Math.max(1,rect.height||normalHeight||1);
      const visible=Math.max(0,Math.min(rect.bottom,innerHeight)-Math.max(rect.top,0));
      const ratio=visible/Math.max(1,Math.min(height,innerHeight));
      const passedTop=rect.top<72;
      if(!suppressed&&!video.ended&&passedTop&&ratio<0.18)setFloating(true);
      else if(floating&&ratio>0.52)setFloating(false);
    };
    function schedule(){if(!raf)raf=requestAnimationFrame(evaluate)}
    video.addEventListener('play',()=>{
      ensureScaffold();interacted=true;
      if(!floating)suppressed=false;
      captureHeight();schedule();
    });
    video.addEventListener('ended',()=>{interacted=false;suppressed=false;setFloating(false);});
    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule,{passive:true});
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&floating){video.pause();suppressed=true;setFloating(false);}
    });
  }

  function initializePlayer(player, en) {
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
    initializeFollowPlayer(player,video,en);
  }

  function initializeHub(hub) {
    if (hub.dataset.ready) return;
    disposeHub?.(); disposeHub = null;
    hub.dataset.ready = 'true';
    hub.classList.add('is-enhanced');
    const en = hub.dataset.locale === 'en';
    const overview = $(hub, '[data-sx-overview]');
    const details = $$(hub, '[data-sx-detail]');
    const cards = $$(hub, '[data-sx-card]');
    const search = $(hub, '[data-sx-search]');
    const filters = $$(hub, '[data-sx-filter]');
    cards.forEach(initializeCardPreview);
    applySeriesProgress(hub,cards,en);

    const storageKey='s5:catalog:v3:'+(en?'en':'es');
    let stored={};
    try { const value=JSON.parse(sessionStorage.getItem(storageKey)||'{}'); stored=value&&typeof value==='object'?value:{}; } catch {}
    const params=new URLSearchParams(location.search);
    const restoredFacet=params.get('path')||stored.facet||'all';
    let facet=filters.some(b=>b.dataset.sxFilter===restoredFacet)?restoredFacet:'all';
    search.value=params.get('q') ?? stored.query ?? '';
    const chapters=[];
    for(const detail of details){
      const card=cards.find(c=>c.dataset.seriesNumber===detail.dataset.number);
      const title=$(detail,'.sx-detail-heading h2')?.textContent||'';
      for(const chapter of $$(detail,'[data-sx-chapter-url]')){
        const link=$(chapter,'h3 a');
        const label=link?.textContent||'';
        chapters.push({url:chapter.dataset.sxChapterUrl,label,series:title,
          facets:card?.dataset.facets||'',search:normalize(title+' '+chapter.textContent)});
      }
      if(card)card.dataset.search+=' '+$$(detail,'.sx-chapter').map(c=>c.textContent).join(' ');
      // First action is visible before the media, not only below all chapters.
      if(!$(detail,'.sx-detail-actions')){
        const actions=document.createElement('div');actions.className='sx-detail-actions';
        const start=$(detail,'.sx-series-bottom .sx-primary');
        if(start)actions.appendChild(start.cloneNode(true));
        const jump=document.createElement('button');jump.type='button';
        jump.textContent=en?'See chapters':'Ver capítulos';jump.dataset.sxJumpChapters='true';
        jump.addEventListener('click',()=>{
          const roadmap=$(detail,'.sx-roadmap');roadmap?.scrollIntoView({block:'start',behavior:reduced.matches?'instant':'smooth'});
          const first=$(roadmap,'a');first?.focus({preventScroll:true});
        });
        actions.appendChild(jump);$(detail,'.sx-detail-heading').after(actions);
      }
    }
    const matches=document.createElement('section');matches.className='sx-search-results';
    matches.dataset.sxSearchResults='true';matches.hidden=true;
    matches.setAttribute('aria-label',en?'Matching chapters':'Capítulos coincidentes');
    $(hub,'.sx-catalog-grid').before(matches);
    function renderChapterMatches(words){
      matches.replaceChildren();matches.hidden=!words.length;
      if(!words.length)return;
      const hits=chapters.filter(c=>(facet==='all'||c.facets.split(' ').includes(facet))&&words.every(w=>c.search.includes(w)));
      if(!hits.length){matches.hidden=true;return}
      const heading=document.createElement('h3');heading.textContent=en?'Go straight to a chapter':'Entra directamente al capítulo';
      const count=document.createElement('span');count.textContent=String(hits.length);heading.appendChild(count);matches.appendChild(heading);
      const list=document.createElement('ol');
      hits.slice(0,8).forEach(hit=>{
        const li=document.createElement('li'),link=document.createElement('a'),small=document.createElement('small'),label=document.createElement('strong');
        link.href=hit.url;link.dataset.sxResultUrl=hit.url;small.textContent=hit.series;label.textContent=hit.label;
        link.append(small,label);li.appendChild(link);list.appendChild(li);
      });matches.appendChild(list);
      if(hits.length>8){const note=document.createElement('p');note.textContent=en?'Showing 8 matches. Refine the search or explore the matching series below.':'Mostrando 8 coincidencias. Afina la búsqueda o explora las series de abajo.';matches.appendChild(note)}
    }
    function persistCatalog(){
      try{sessionStorage.setItem(storageKey,JSON.stringify({query:search.value,facet}))}catch{}
      if(/^https?:$/.test(location.protocol)){
        const url=new URL(location.href);url.searchParams.delete('q');url.searchParams.delete('path');
        if(search.value.trim())url.searchParams.set('q',search.value.trim());
        if(facet!=='all')url.searchParams.set('path',facet);
        history.replaceState(history.state,'',url.pathname+url.search+url.hash);
      }
    }

    let previousY = 0;
    const map = $(hub, '#mapa');
    // Keep discovery visible first; the complete learning map opens explicitly.
    map.open = location.hash === '#mapa';
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
      renderChapterMatches(words);persistCatalog();
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
    mobileFilter.value=facet;filters.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sxFilter===facet)));
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
    disposeHub = () => window.removeEventListener('hashchange', showHash);
    showHash();
    $$(hub, '[data-sx-player]').forEach(player=>initializePlayer(player,en));
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


  function initializeReaderIndex(){
    const context=document.querySelector('.sx-reader-context');
    if(!context||document.querySelector('[data-sx-reader-index]'))return;
    const current=location.pathname;
    const match=current.match(/^(\/(?:en\/)?)(?:videos\/)?series\/([^/]+)\//);
    if(!match)return;
    const en=match[1].startsWith('/en/');
    const prefix=match[1]+'series/'+match[2]+'/';
    const candidates=[...document.querySelectorAll('.md-nav--primary a.md-nav__link[href]')];
    const unique=new Map();
    for(const link of candidates){
      const path=new URL(link.getAttribute('href'),'https://5sigmas.com'+current).pathname;
      if(!path.startsWith(prefix)||!/^\d/.test(path.slice(prefix.length))||unique.has(path))continue;
      unique.set(path,{url:path,title:link.textContent.replace(/\s+/g,' ').trim()});
    }
    if(!unique.size)return;
    const nav=document.createElement('details');nav.className='sx-reader-index';nav.dataset.sxReaderIndex='true';
    const summary=document.createElement('summary');summary.textContent=en?'Chapters in this series':'Capítulos de esta serie';
    const list=document.createElement('ol');
    for(const chapter of unique.values()){
      const li=document.createElement('li'),a=document.createElement('a');a.href=chapter.url;a.textContent=chapter.title;
      if(chapter.url===current.replace('/videos/','/'))a.setAttribute('aria-current','page');
      li.appendChild(a);list.appendChild(li);
    }
    nav.append(summary,list);context.after(nav);
  }

  function initialize(){
    recordReaderProgress();
    const hubs=$$(document,'[data-sx-hub]');
    if(!hubs.length){disposeHub?.();disposeHub=null}
    hubs.forEach(initializeHub);
    initializeReaderIndex();
  }
  if(typeof document$!=='undefined')document$.subscribe(initialize);
  else if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
