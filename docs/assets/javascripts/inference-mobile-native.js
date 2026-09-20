(() => {
  'use strict';

  const CONTRACTS = [
    {
      key: '01', selector: '.s5v-inference-phases', scroll: '.s5v-inference-phases__scroll', height: 440,
      title: { es: 'TTFT y TPOT nacen en fronteras distintas del mismo pipeline', en: 'TTFT and TPOT come from different boundaries in the same pipeline' },
      relation: {
        es: 'La petición atraviesa cola y prefill antes de la primera salida; decode reutiliza y extiende KV. La concurrencia actúa sobre scheduler/batching y puede subir goodput a costa de cola, TTFT o TPOT.',
        en: 'The request crosses queueing and prefill before first output; decode reuses and extends KV. Concurrency acts through scheduler/batching and can raise goodput while worsening queueing, TTFT, or TPOT.',
      },
      nodes: [
        ['request', 14, 11, 'Petición', 'Request', 'input'], ['queue', 50, 11, 'Cola', 'Queue', 'decision'], ['prefill', 86, 11, 'Prefill', 'Prefill', 'compute'],
        ['first', 86, 38, '1ª salida', '1st output', 'outcome'], ['decode', 50, 38, 'Decode', 'Decode', 'compute'], ['kv', 14, 38, 'Estado KV', 'KV state', 'state'],
        ['concurrency', 14, 75, 'Concurrencia', 'Concurrency', 'input'], ['scheduler', 50, 75, 'Scheduler', 'Scheduler', 'decision'], ['goodput', 86, 75, 'Goodput', 'Goodput', 'outcome'],
      ],
      edges: [
        ['e1','request','queue',[],32,6,'',''], ['e2','queue','prefill',[],68,6,'',''], ['e3','prefill','first',[],91,24,'TTFT','TTFT'],
        ['e4','first','decode',[],68,33,'',''], ['e5','prefill','kv',[[86,25],[14,25]],50,21,'crea KV','builds KV'], ['e6','kv','decode',[],32,33,'reutiliza','reuses'],
        ['e7','concurrency','scheduler',[],32,70,'',''], ['e8','scheduler','goodput',[],68,70,'capacidad','capacity'], ['e9','scheduler','queue',[[50,58]],56,55,'presión de cola','queue pressure'],
      ],
    },
    {
      key: '02', selector: '.s5v-kv-paging', scroll: '.s5v-kv-paging__scroll', height: 470,
      title: { es: 'KV lógico, bloques físicos y batching continuo forman un circuito de asignación', en: 'Logical KV, physical blocks, and continuous batching form an allocation loop' },
      relation: {
        es: 'La tabla desacopla el KV lógico de los bloques físicos. Cuando una petición libera páginas, el scheduler puede admitir otra; host↔GPU añade capacidad pero también movimiento de estado.',
        en: 'The block table decouples logical KV from physical blocks. When a request releases pages, the scheduler can admit another; host↔GPU adds capacity but also state-movement cost.',
      },
      nodes: [
        ['a',14,10,'Req A','Req A','input'], ['b',14,30,'Req B','Req B','input'], ['table',50,20,'Block table','Block table','state'], ['gpu',86,20,'Pool GPU','GPU pool','state'],
        ['finish',86,47,'Fin / release','Finish / release','event'], ['free',50,47,'Páginas libres','Free pages','state'], ['waiting',14,76,'Req C espera','Req C waits','input'], ['scheduler',50,76,'Scheduler','Scheduler','decision'], ['admit',86,76,'Admitir C','Admit C','outcome'], ['host',86,90,'Host tier','Host tier','state'],
      ],
      edges: [
        ['e1','a','table',[],31,10,'',''], ['e2','b','table',[],31,30,'',''], ['e3','table','gpu',[],68,15,'mapa','maps'], ['e4','gpu','finish',[],91,34,'',''],
        ['e5','finish','free',[],68,43,'libera','releases'], ['e6','free','scheduler',[],56,61,'capacidad','capacity'], ['e7','waiting','scheduler',[],32,71,'',''], ['e8','scheduler','admit',[],68,71,'admite','admits'],
        ['e9','admit','table',[[72,62],[72,33]],74,57,'asigna','allocates'], ['e10','gpu','host',[],91,58,'offload ⇄','offload ⇄'],
      ],
    },
    {
      key: '03', selector: '.s5v-quant-parallel', scroll: '.s5v-quant-parallel__scroll', height: 480,
      title: { es: 'Cuantización y paralelismo atacan cuellos distintos y convergen en el mismo resultado', en: 'Quantization and parallelism attack different bottlenecks and converge on one outcome' },
      relation: {
        es: 'La lane superior reduce representación y trabajo local; la inferior reparte el modelo y añade comunicación. Ambas convergen en latencia/memoria/calidad: optimizar una puede convertir la otra en el nuevo cuello.',
        en: 'The upper lane reduces representation and local work; the lower lane splits the model and adds communication. Both converge on latency/memory/quality, so optimizing one can make the other the new bottleneck.',
      },
      nodes: [
        ['bytes',14,10,'Weights + KV','Weights + KV','input'], ['quant',50,10,'Precisión','Precision','decision'], ['kernel',86,10,'Kernel / HW','Kernel / HW','compute'],
        ['local',86,34,'Bytes locales','Local bytes','state'], ['model',14,58,'Modelo','Model','input'], ['placement',50,58,'Paralelismo','Parallelism','decision'], ['comms',86,58,'Collectives','Collectives','compute'],
        ['topology',86,82,'Interconnect','Interconnect','state'], ['outcome',50,88,'Latencia · memoria · calidad','Latency · memory · quality','outcome'],
      ],
      edges: [
        ['e1','bytes','quant',[],32,5,'',''], ['e2','quant','kernel',[],68,5,'',''], ['e3','kernel','local',[],91,22,'ejecuta','executes'],
        ['e4','model','placement',[],32,53,'',''], ['e5','placement','comms',[],68,53,'reparte','splits'], ['e6','comms','topology',[],91,70,'depende','depends'],
        ['e7','local','outcome',[[72,44],[72,82]],66,42,'trade-off','trade-off'], ['e8','topology','outcome',[],68,86,'trade-off','trade-off'],
      ],
    },
    {
      key: '04', selector: '.s5v-reuse-spec', scroll: '.s5v-reuse-spec__scroll', height: 540,
      title: { es: 'Reutilizar estado validado y especular tokens son dos ramas diferentes', en: 'Reusing validated state and speculating tokens are two different branches' },
      relation: {
        es: 'Prefix caching bifurca en hit/miss y sólo evita recomputar prefill compatible. Speculative decoding bifurca en accept/reject y sólo compromete lo verificado por target; reject vuelve al camino de corrección.',
        en: 'Prefix caching branches on hit/miss and only avoids recomputing compatible prefill. Speculative decoding branches on accept/reject and only commits target-verified tokens; rejection loops back through correction.',
      },
      nodes: [
        ['prefix',12,9,'Prefix','Prefix','input'], ['lookup',38,9,'Lookup','Lookup','decision'], ['hit',64,9,'HIT','HIT','outcome'], ['reuse',88,9,'Reusar KV','Reuse KV','state'],
        ['miss',64,28,'MISS','MISS','event'], ['prefill',88,28,'Prefill completo','Full prefill','compute'],
        ['draft',12,54,'Draft','Draft','compute'], ['verify',38,54,'Target verify','Target verify','decision'], ['accept',64,48,'ACCEPT','ACCEPT','outcome'], ['commit',88,48,'Commit','Commit','state'],
        ['reject',64,69,'REJECT','REJECT','event'], ['correct',88,69,'Rewind / corregir','Rewind / correct','compute'], ['pressure',50,90,'KV + scheduler','KV + scheduler','state'],
      ],
      edges: [
        ['e1','prefix','lookup',[],28,4,'',''], ['e2','lookup','hit',[],56,4,'hit','hit'], ['e3','hit','reuse',[],80,4,'',''], ['e4','lookup','miss',[[42,22]],54,20,'miss','miss'], ['e5','miss','prefill',[],80,23,'',''],
        ['e6','draft','verify',[],28,49,'',''], ['e7','verify','accept',[],56,45,'acepta','accepts'], ['e8','accept','commit',[],80,43,'',''], ['e9','verify','reject',[],56,64,'rechaza','rejects'], ['e10','reject','correct',[],80,64,'',''],
        ['e11','correct','verify',[[88,80],[42,80]],64,80,'reverifica ↺','reverify ↺'], ['e12','reuse','pressure',[[88,37],[62,37],[62,82]],68,34,'',''], ['e13','commit','pressure',[[78,82]],78,78,'',''],
      ],
    },
    {
      key: '05', selector: '.s5v-routing-policy', scroll: '.s5v-routing-policy__scroll', height: 540,
      title: { es: 'Cache, routing, placement y fallback forman un árbol de decisión con feedback', en: 'Caching, routing, placement, and fallback form a decision tree with feedback' },
      relation: {
        es: 'Primero se filtran restricciones; un cache hit termina sin inferencia. Un miss pasa por routing y placement. El fallo abre fallback sólo si sigue siendo compatible, y telemetry cierra el loop hacia la política.',
        en: 'Constraints are filtered first; a cache hit ends without inference. A miss goes through routing and placement. Failure opens fallback only when still compatible, and telemetry closes the loop back to policy.',
      },
      nodes: [
        ['request',12,9,'Petición','Request','input'], ['eligible',38,9,'Elegibilidad','Eligibility','decision'], ['cache',64,9,'Response cache','Response cache','decision'], ['hit',88,9,'HIT → respuesta','HIT → response','outcome'],
        ['router',38,34,'Router','Router','decision'], ['placement',64,34,'Placement','Placement','decision'], ['primary',88,34,'Primary','Primary','compute'],
        ['success',64,58,'SUCCESS','SUCCESS','outcome'], ['fallback',88,58,'Fallback gate','Fallback gate','decision'], ['alt',88,80,'Fallback model','Fallback model','compute'],
        ['telemetry',38,80,'Telemetry','Telemetry','state'], ['policy',12,58,'Policy update','Policy update','state'],
      ],
      edges: [
        ['e1','request','eligible',[],28,4,'',''], ['e2','eligible','cache',[],56,4,'válida','valid'], ['e3','cache','hit',[],80,4,'hit','hit'], ['e4','cache','router',[[70,22],[42,22]],57,20,'miss','miss'],
        ['e5','router','placement',[],56,29,'elige','selects'], ['e6','placement','primary',[],80,29,'',''], ['e7','primary','success',[],80,48,'ok','ok'], ['e8','primary','fallback',[],91,46,'fail','fail'],
        ['e9','fallback','alt',[],91,70,'compatible','compatible'], ['e10','success','telemetry',[[62,70]],56,69,'',''], ['e11','alt','telemetry',[],65,84,'',''], ['e12','telemetry','policy',[[28,80],[28,58]],31,72,'aprende','learns'], ['e13','policy','router',[[14,34]],25,32,'feedback','feedback'],
      ],
    },
    {
      key: '06', selector: '.s5v-benchmark-boundary', scroll: '.s5v-benchmark-boundary__scroll', height: 520,
      title: { es: 'Performance, latencia y economía deben medir la misma frontera', en: 'Performance, latency, and economics must measure the same boundary' },
      relation: {
        es: 'Workload/SUT, reloj cliente y contabilidad energética son lanes simultáneas. Sólo al converger sobre la misma ventana, éxito/SLO y denominadores se puede reportar goodput, coste/tarea y energía/tarea comparables.',
        en: 'Workload/SUT, client clock, and energy accounting are simultaneous lanes. Only when they converge on the same window, success/SLO, and denominators can goodput, cost/task, and energy/task be compared.',
      },
      nodes: [
        ['workload',14,10,'Workload','Workload','input'], ['sut',50,10,'SUT / queue','SUT / queue','compute'], ['response',86,10,'Completions','Completions','state'],
        ['clock',14,38,'Client clock','Client clock','input'], ['latency',50,38,'TTFT / TPOT / E2E','TTFT / TPOT / E2E','state'], ['goodput',86,38,'Goodput + SLO','Goodput + SLO','outcome'],
        ['power',14,66,'Power + cost','Power + cost','input'], ['account',50,66,'∫P(t)dt + ledger','∫P(t)dt + ledger','state'], ['denom',86,66,'Cost / energy / task','Cost / energy / task','outcome'],
        ['sweep',24,90,'Saturation sweep','Saturation sweep','decision'], ['report',76,90,'Operating region','Operating region','outcome'],
      ],
      edges: [
        ['e1','workload','sut',[],32,5,'carga','load'], ['e2','sut','response',[],68,5,'',''], ['e3','response','goodput',[],91,24,'filtra','filters'],
        ['e4','clock','latency',[],32,33,'endpoints','endpoints'], ['e5','latency','goodput',[],68,33,'SLO','SLO'], ['e6','power','account',[],32,61,'misma ventana','same window'], ['e7','account','denom',[],68,61,'denominador','denominator'],
        ['e8','goodput','report',[[86,78]],83,75,'',''], ['e9','denom','report',[[86,82]],82,82,'',''], ['e10','sweep','report',[],50,85,'región útil','operating region'], ['e11','sweep','sut',[[24,78],[24,24],[50,24]],19,53,'varía carga ↺','vary load ↺'],
      ],
    },
  ];

  const STYLE_ID = 's5-inference-mobile-native-style';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SAFE_X_MIN = 12;
  const SAFE_X_MAX = 88;
  const SAFE_Y_MIN = 8;
  const SAFE_Y_MAX = 92;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const normalizeNode = ([id, x, y, es, en, tone]) => [id, clamp(x, SAFE_X_MIN, SAFE_X_MAX), clamp(y, SAFE_Y_MIN, SAFE_Y_MAX), es, en, tone];

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .s5v-inference-mobile-native{display:none;box-sizing:border-box}
      @media (max-width:720px){
        .s5v-inference-mobile-native{display:grid;gap:10px;margin:12px 0 16px;padding:13px;border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:18px;background:color-mix(in srgb,var(--md-default-bg-color,#fff) 96%,currentColor 4%);overflow:hidden;overflow-x:clip}
        .s5v-inference-mobile-native__kicker{font-size:.72rem;font-weight:900;letter-spacing:.11em;text-transform:uppercase;opacity:.72}
        .s5v-inference-mobile-native h4{margin:0;font-size:1.02rem;line-height:1.22;letter-spacing:-.02em}
        .s5v-inference-mobile-native__graph{position:relative;width:100%;min-width:0;border-radius:15px;background:linear-gradient(180deg,color-mix(in srgb,currentColor 4%,transparent),transparent 48%);overflow:hidden}
        .s5v-inference-mobile-native__graph svg{position:absolute;inset:0;width:100%;height:100%;z-index:0;overflow:hidden;color:color-mix(in srgb,currentColor 72%,transparent)}
        .s5v-inference-mobile-native__edge-path{fill:none;stroke:currentColor;stroke-width:1.45;vector-effect:non-scaling-stroke;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:5 4;animation:s5InferenceMobileFlow 3.2s linear infinite}
        .s5v-inference-mobile-native__node{position:absolute;z-index:2;box-sizing:border-box;transform:translate(-50%,-50%);width:min(20%,76px);min-height:44px;display:grid;place-items:center;padding:7px 5px;border:1px solid color-mix(in srgb,currentColor 20%,transparent);border-radius:11px;background:var(--md-default-bg-color,#fff);box-shadow:0 4px 14px color-mix(in srgb,currentColor 7%,transparent);font-size:.77rem;line-height:1.16;font-weight:850;text-align:center;overflow-wrap:normal;word-break:normal;hyphens:auto}
        .s5v-inference-mobile-native__node[data-tone="decision"]{border-style:dashed;border-width:1.5px}
        .s5v-inference-mobile-native__node[data-tone="state"]{background:color-mix(in srgb,var(--md-accent-fg-color,#007f8c) 7%,var(--md-default-bg-color,#fff))}
        .s5v-inference-mobile-native__node[data-tone="outcome"]{border-color:color-mix(in srgb,var(--md-accent-fg-color,#007f8c) 70%,currentColor 30%);box-shadow:0 5px 18px color-mix(in srgb,var(--md-accent-fg-color,#007f8c) 12%,transparent)}
        .s5v-inference-mobile-native__edge-label{position:absolute;z-index:1;transform:translate(-50%,-50%);max-width:86px;padding:2px 4px;border-radius:5px;background:color-mix(in srgb,var(--md-default-bg-color,#fff) 95%,transparent);font-size:.66rem;line-height:1.08;font-weight:850;text-align:center;opacity:.82;pointer-events:none}
        .s5v-inference-mobile-native__relation{margin:0;padding:10px 11px;border-left:3px solid var(--md-accent-fg-color,#007f8c);border-radius:10px;background:color-mix(in srgb,var(--md-accent-fg-color,#007f8c) 8%,transparent);font-size:.79rem;line-height:1.45;font-weight:720;overflow-wrap:anywhere}
        .s5v-inference-phases .s5v-inference-phases__scroll,
        .s5v-kv-paging .s5v-kv-paging__scroll,
        .s5v-quant-parallel .s5v-quant-parallel__scroll,
        .s5v-reuse-spec .s5v-reuse-spec__scroll,
        .s5v-routing-policy .s5v-routing-policy__scroll,
        .s5v-benchmark-boundary .s5v-benchmark-boundary__scroll{display:none!important}
      }
      @keyframes s5InferenceMobileFlow{to{stroke-dashoffset:-18}}
      @media (prefers-reduced-motion:reduce){.s5v-inference-mobile-native__edge-path{animation:none!important;stroke-dasharray:none!important}.s5v-inference-mobile-native *{scroll-behavior:auto!important;transition:none!important}}
    `;
    document.head.appendChild(style);
  };

  const textNode = (parent, tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    parent.appendChild(node);
    return node;
  };

  const boundaryPoint = (center, toward) => {
    const dx = toward[0] - center[0];
    const dy = toward[1] - center[1];
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return center;
    const tx = Math.abs(dx) < 0.001 ? Number.POSITIVE_INFINITY : 10.5 / Math.abs(dx);
    const ty = Math.abs(dy) < 0.001 ? Number.POSITIVE_INFINITY : 5.5 / Math.abs(dy);
    const t = Math.min(1, tx, ty);
    return [center[0] + dx * t, center[1] + dy * t];
  };

  const buildPath = (from, to, via = []) => {
    const raw = [[from[1], from[2]], ...via, [to[1], to[2]]];
    if (raw.length < 2) return raw.map((p) => p.join(',')).join(' ');
    const points = raw.map((p) => [...p]);
    points[0] = boundaryPoint(points[0], points[1]);
    points[points.length - 1] = boundaryPoint(points[points.length - 1], points[points.length - 2]);
    return points.map((point) => point.join(',')).join(' ');
  };

  const buildGraph = (summary, contract, lang) => {
    const graph = document.createElement('div');
    graph.className = 's5v-inference-mobile-native__graph';
    graph.dataset.inferenceMobileGraph = contract.key;
    graph.style.height = `${contract.height}px`;

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    const defs = document.createElementNS(SVG_NS, 'defs');
    const marker = document.createElementNS(SVG_NS, 'marker');
    marker.setAttribute('id', `s5-inference-arrow-${contract.key}`);
    marker.setAttribute('markerWidth', '6'); marker.setAttribute('markerHeight', '6');
    marker.setAttribute('refX', '5'); marker.setAttribute('refY', '3'); marker.setAttribute('orient', 'auto');
    const arrow = document.createElementNS(SVG_NS, 'path');
    arrow.setAttribute('d', 'M0,0 L6,3 L0,6 Z'); arrow.setAttribute('fill', 'currentColor');
    marker.appendChild(arrow); defs.appendChild(marker); svg.appendChild(defs);

    const normalizedNodes = contract.nodes.map(normalizeNode);
    const byId = new Map(normalizedNodes.map((node) => [node[0], node]));
    for (const edge of contract.edges) {
      const [id, fromId, toId, via, labelX, labelY, esLabel, enLabel] = edge;
      const from = byId.get(fromId); const to = byId.get(toId);
      if (!from || !to) continue;
      const polyline = document.createElementNS(SVG_NS, 'polyline');
      polyline.setAttribute('points', buildPath(from, to, via));
      polyline.setAttribute('marker-end', `url(#s5-inference-arrow-${contract.key})`);
      polyline.classList.add('s5v-inference-mobile-native__edge-path');
      polyline.dataset.mobileGraphEdge = id;
      svg.appendChild(polyline);
      const label = lang === 'en' ? enLabel : esLabel;
      if (label) {
        const labelNode = textNode(graph, 'span', 's5v-inference-mobile-native__edge-label', label);
        labelNode.style.left = `${clamp(labelX, 7, 93)}%`; labelNode.style.top = `${clamp(labelY, 4, 96)}%`;
        labelNode.dataset.mobileGraphEdgeLabel = id;
      }
    }
    graph.prepend(svg);

    for (const [id, x, y, es, en, tone] of normalizedNodes) {
      const node = textNode(graph, 'div', 's5v-inference-mobile-native__node', lang === 'en' ? en : es);
      node.style.left = `${x}%`; node.style.top = `${y}%`;
      node.dataset.mobileGraphNode = id;
      node.dataset.tone = tone;
    }
    summary.appendChild(graph);
  };

  const buildSummary = (section, contract, lang) => {
    if (section.querySelector(`[data-inference-mobile-native="${contract.key}"]`)) return;
    const scroll = section.querySelector(contract.scroll);
    if (!scroll) return;
    const summary = document.createElement('div');
    summary.className = 's5v-inference-mobile-native';
    summary.dataset.inferenceMobileNative = contract.key;
    summary.setAttribute('role', 'group');
    summary.setAttribute('aria-label', contract.title[lang]);
    textNode(summary, 'div', 's5v-inference-mobile-native__kicker', lang === 'en' ? 'Mobile relationship map' : 'Mapa de relaciones móvil');
    textNode(summary, 'h4', '', contract.title[lang]);
    buildGraph(summary, contract, lang);
    const relation = textNode(summary, 'p', 's5v-inference-mobile-native__relation', contract.relation[lang]);
    relation.dataset.inferenceMobileRelation = 'true';
    scroll.parentNode.insertBefore(summary, scroll);
  };

  const init = () => {
    ensureStyle();
    const lang = (document.documentElement.lang || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
    for (const contract of CONTRACTS) {
      for (const section of document.querySelectorAll(contract.selector)) buildSummary(section, contract, lang);
    }
  };

  if (typeof document$ !== 'undefined' && document$.subscribe) document$.subscribe(init);
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
