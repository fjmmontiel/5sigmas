(() => {
  'use strict';

  const CONTRACTS = [
    {
      key: '01', selector: '.s5v-inference-phases', scroll: '.s5v-inference-phases__scroll', height: 480,
      title: { es: 'TTFT y TPOT nacen en fronteras distintas del mismo pipeline', en: 'TTFT and TPOT come from different boundaries in the same pipeline' },
      relation: {
        es: 'La petición atraviesa cola y prefill antes de la primera salida; decode reutiliza y extiende KV. La concurrencia actúa sobre scheduler/batching y puede subir goodput a costa de cola, TTFT o TPOT.',
        en: 'The request crosses queueing and prefill before first output; decode reuses and extends KV. Concurrency acts through scheduler/batching and can raise goodput while worsening queueing, TTFT, or TPOT.',
      },
      nodes: [
        ['request', 17, 11, 'Petición', 'Request', 'input'], ['queue', 50, 11, 'Cola', 'Queue', 'decision'], ['prefill', 83, 11, 'Prefill', 'Prefill', 'compute'],
        ['first', 83, 38, '1ª salida', '1st output', 'outcome'], ['decode', 50, 38, 'Decode', 'Decode', 'compute'], ['kv', 17, 38, 'Estado KV', 'KV state', 'state'],
        ['concurrency', 18, 75, 'Concurrencia', 'Concurrency', 'input'], ['scheduler', 51, 75, 'Scheduler', 'Scheduler', 'decision'], ['goodput', 83, 75, 'Goodput', 'Goodput', 'outcome'],
      ],
      edges: [
        ['e1','request','queue',[],32,6,'',''], ['e2','queue','prefill',[],68,6,'',''], ['e3','prefill','first',[],91,24,'',''],
        ['e4','first','decode',[],68,33,'',''], ['e5','prefill','kv',[[83,25],[17,25]],50,21,'',''], ['e6','kv','decode',[],32,33,'',''],
        ['e7','concurrency','scheduler',[],32,70,'',''], ['e8','scheduler','goodput',[],68,64,'',''], ['e9','scheduler','queue',[[50,58]],58,55,'',''],
      ],
    },
    {
      key: '02', selector: '.s5v-kv-paging', scroll: '.s5v-kv-paging__scroll', height: 510,
      title: { es: 'KV lógico, bloques físicos y batching continuo forman un circuito de asignación', en: 'Logical KV, physical blocks, and continuous batching form an allocation loop' },
      relation: {
        es: 'La tabla desacopla el KV lógico de los bloques físicos. Cuando una petición libera páginas, el scheduler puede admitir otra; host↔GPU añade capacidad pero también movimiento de estado.',
        en: 'The block table decouples logical KV from physical blocks. When a request releases pages, the scheduler can admit another; host↔GPU adds capacity but also state-movement cost.',
      },
      nodes: [
        ['a',17,10,'Req A','Req A','input'], ['b',17,30,'Req B','Req B','input'], ['table',50,20,'Block table','Block table','state'], ['gpu',83,20,'Pool GPU','GPU pool','state'],
        ['finish',83,47,'Fin / release','Finish / release','event'], ['free',50,47,'Páginas libres','Free pages','state'], ['waiting',17,76,'Req C espera','Req C waits','input'], ['scheduler',50,76,'Scheduler','Scheduler','decision'], ['admit',83,76,'Admitir C','Admit C','outcome'], ['host',83,90,'Host tier','Host tier','state'],
      ],
      edges: [
        ['e1','a','table',[],31,10,'',''], ['e2','b','table',[],31,30,'',''], ['e3','table','gpu',[],68,15,'',''], ['e4','gpu','finish',[],91,34,'',''],
        ['e5','finish','free',[],68,43,'',''], ['e6','free','scheduler',[],56,61,'',''], ['e7','waiting','scheduler',[],32,71,'',''], ['e8','scheduler','admit',[],68,65,'',''],
        ['e9','admit','table',[[72,62],[72,33]],74,57,'',''], ['e10','gpu','host',[],91,58,'',''],
      ],
    },
    {
      key: '03', selector: '.s5v-quant-parallel', scroll: '.s5v-quant-parallel__scroll', height: 540,
      title: { es: 'Cuantización y paralelismo atacan cuellos distintos y convergen en el mismo resultado', en: 'Quantization and parallelism attack different bottlenecks and converge on one outcome' },
      relation: {
        es: 'La lane superior reduce representación y trabajo local; la inferior reparte el modelo y añade comunicación. Ambas convergen en latencia/memoria/calidad: optimizar una puede convertir la otra en el nuevo cuello.',
        en: 'The upper lane reduces representation and local work; the lower lane splits the model and adds communication. Both converge on latency/memory/quality, so optimizing one can make the other the new bottleneck.',
      },
      nodes: [
        ['bytes',17,10,'Weights + KV','Weights + KV','input'], ['quant',50,10,'Precisión','Precision','decision'], ['kernel',83,10,'Kernel / HW','Kernel / HW','compute'],
        ['local',83,34,'Bytes locales','Local bytes','state'], ['model',17,58,'Modelo','Model','input'], ['placement',50,58,'Modo paralelo','Parallel mode','decision'], ['comms',83,58,'Ops colectivas','Collective ops','compute'],
        ['topology',83,82,'Enlace GPU','GPU link','state'], ['outcome',50,88,'Latencia / memoria / calidad','Latency / memory / quality','outcome'],
      ],
      edges: [
        ['e1','bytes','quant',[],32,5,'',''], ['e2','quant','kernel',[],68,5,'',''], ['e3','kernel','local',[],91,22,'',''],
        ['e4','model','placement',[],32,53,'',''], ['e5','placement','comms',[],68,48,'',''], ['e6','comms','topology',[],91,70,'',''],
        ['e7','local','outcome',[[72,44],[72,82]],66,42,'',''], ['e8','topology','outcome',[],68,86,'',''],
      ],
    },
    {
      key: '04', selector: '.s5v-reuse-spec', scroll: '.s5v-reuse-spec__scroll', height: 640,
      title: { es: 'Reutilizar estado validado y especular tokens son dos ramas diferentes', en: 'Reusing validated state and speculating tokens are two different branches' },
      relation: {
        es: 'Prefix caching bifurca en hit/miss y sólo evita recomputar prefill compatible. Speculative decoding bifurca en accept/reject y sólo compromete lo verificado por target; reject vuelve al camino de corrección.',
        en: 'Prefix caching branches on hit/miss and only avoids recomputing compatible prefill. Speculative decoding branches on accept/reject and only commits target-verified tokens; rejection loops back through correction.',
      },
      nodes: [
        ['prefix',17,8,'Prefix','Prefix','input'], ['lookup',50,8,'Lookup','Lookup','decision'], ['hit',83,8,'HIT','HIT','outcome'], ['reuse',83,22,'Reusar KV','Reuse KV','state'],
        ['miss',50,28,'MISS','MISS','event'], ['prefill',83,36,'Prefill completo','Full prefill','compute'],
        ['draft',17,56,'Draft','Draft','compute'], ['verify',50,56,'Target verify','Target verify','decision'], ['accept',83,49,'ACCEPT','ACCEPT','outcome'], ['commit',83,64,'Commit','Commit','state'],
        ['reject',50,74,'REJECT','REJECT','event'], ['correct',83,79,'Rewind / corregir','Rewind / correct','compute'], ['pressure',50,90,'KV + scheduler','KV + scheduler','state'],
      ],
      edges: [
        ['e1','prefix','lookup',[],32,4,'',''], ['e2','lookup','hit',[],68,4,'',''], ['e3','hit','reuse',[],90,16,'',''], ['e4','lookup','miss',[],53,18,'',''], ['e5','miss','prefill',[],68,30,'',''],
        ['e6','draft','verify',[],32,51,'',''], ['e7','verify','accept',[],68,47,'',''], ['e8','accept','commit',[],90,57,'',''], ['e9','verify','reject',[],53,66,'',''], ['e10','reject','correct',[],68,74,'',''],
        ['e11','correct','verify',[[83,86],[38,86],[38,64]],61,86,'',''], ['e12','reuse','pressure',[[72,22],[72,86],[50,86]],74,45,'',''], ['e13','commit','pressure',[[72,64],[72,86]],72,82,'',''],
      ],
    },
    {
      key: '05', selector: '.s5v-routing-policy', scroll: '.s5v-routing-policy__scroll', height: 640,
      title: { es: 'Cache, routing, placement y fallback forman un árbol de decisión con feedback', en: 'Caching, routing, placement, and fallback form a decision tree with feedback' },
      relation: {
        es: 'Primero se filtran restricciones; un cache hit termina sin inferencia. Un miss pasa por routing y placement. El fallo abre fallback sólo si sigue siendo compatible, y telemetry cierra el loop hacia la política.',
        en: 'Constraints are filtered first; a cache hit ends without inference. A miss goes through routing and placement. Failure opens fallback only when still compatible, and telemetry closes the loop back to policy.',
      },
      nodes: [
        ['request',17,8,'Petición','Request','input'], ['eligible',50,8,'¿Elegible?','Eligible?','decision'], ['cache',83,8,'Response cache','Response cache','decision'], ['hit',83,23,'HIT → salida','HIT → output','outcome'],
        ['router',50,32,'Router','Router','decision'], ['placement',83,38,'Placement','Placement','decision'], ['primary',83,52,'Primary','Primary','compute'],
        ['success',50,56,'SUCCESS','SUCCESS','outcome'], ['fallback',83,67,'Fallback gate','Fallback gate','decision'], ['alt',83,82,'Fallback model','Fallback model','compute'],
        ['telemetry',50,84,'Telemetry','Telemetry','state'], ['policy',17,67,'Policy update','Policy update','state'],
      ],
      edges: [
        ['e1','request','eligible',[],32,4,'',''], ['e2','eligible','cache',[],68,4,'',''], ['e3','cache','hit',[],90,16,'',''], ['e4','cache','router',[[70,20],[50,20]],60,19,'',''],
        ['e5','router','placement',[],68,30,'',''], ['e6','placement','primary',[],90,45,'',''], ['e7','primary','success',[],68,52,'',''], ['e8','primary','fallback',[],90,60,'',''],
        ['e9','fallback','alt',[],90,75,'',''], ['e10','success','telemetry',[],54,70,'',''], ['e11','alt','telemetry',[],68,82,'',''], ['e12','telemetry','policy',[[32,84],[17,84]],33,78,'',''], ['e13','policy','router',[[17,48],[38,48],[38,32]],27,45,'',''],
      ],
    },
    {
      key: '06', selector: '.s5v-benchmark-boundary', scroll: '.s5v-benchmark-boundary__scroll', height: 580,
      title: { es: 'Performance, latencia y economía deben medir la misma frontera', en: 'Performance, latency, and economics must measure the same boundary' },
      relation: {
        es: 'Workload/SUT, reloj cliente y contabilidad energética son lanes simultáneas. Sólo al converger sobre la misma ventana, éxito/SLO y denominadores se puede reportar goodput, coste/tarea y energía/tarea comparables.',
        en: 'Workload/SUT, client clock, and energy accounting are simultaneous lanes. Only when they converge on the same window, success/SLO, and denominators can goodput, cost/task, and energy/task be compared.',
      },
      nodes: [
        ['workload',17,10,'Workload','Workload','input'], ['sut',50,10,'SUT / queue','SUT / queue','compute'], ['response',83,10,'Salidas','Outputs','state'],
        ['clock',17,38,'Client clock','Client clock','input'], ['latency',50,38,'TTFT / TPOT / E2E','TTFT / TPOT / E2E','state'], ['goodput',83,38,'Goodput + SLO','Goodput + SLO','outcome'],
        ['power',17,66,'Power + cost','Power + cost','input'], ['account',50,66,'∫P(t)dt + ledger','∫P(t)dt + ledger','state'], ['denom',83,66,'Cost / energy / task','Cost / energy / task','outcome'],
        ['sweep',25,89,'Barrido de carga','Load sweep','decision'], ['report',75,89,'Región operativa','Operating region','outcome'],
      ],
      edges: [
        ['e1','workload','sut',[],32,5,'',''], ['e2','sut','response',[],68,5,'',''], ['e3','response','goodput',[],91,24,'',''],
        ['e4','clock','latency',[],32,33,'',''], ['e5','latency','goodput',[],68,33,'',''], ['e6','power','account',[],32,61,'',''], ['e7','account','denom',[],68,61,'',''],
        ['e8','goodput','report',[[83,78]],83,75,'',''], ['e9','denom','report',[[83,82]],82,82,'',''], ['e10','sweep','report',[],50,82,'',''], ['e11','sweep','sut',[[25,78],[25,24],[50,24]],19,53,'',''],
      ],
    },
  ];

  const STYLE_ID = 's5-inference-mobile-native-style';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SAFE_X_MIN = 17;
  const SAFE_X_MAX = 83;
  const SAFE_Y_MIN = 8;
  const SAFE_Y_MAX = 90;
  const SHORT_EDGE_SOLID_THRESHOLD = 8;
  const SHORT_EDGE_DOGLEG_OFFSET = 3.25;
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
        .s5v-inference-mobile-native__edge-path--short{stroke-dasharray:none!important;animation:none!important}
        .s5v-inference-mobile-native__node{position:absolute;z-index:2;box-sizing:border-box;transform:translate(-50%,-50%);width:min(30%,96px);min-height:46px;display:flex;align-items:center;justify-content:center;min-width:0;padding:7px 5px;border:1px solid color-mix(in srgb,currentColor 20%,transparent);border-radius:11px;background:var(--md-default-bg-color,#fff);box-shadow:0 4px 14px color-mix(in srgb,currentColor 7%,transparent);font-size:.75rem;line-height:1.16;font-weight:850;text-align:center;white-space:normal;overflow-wrap:normal;word-break:normal;hyphens:none}
        [data-inference-mobile-graph="01"] [data-mobile-graph-node="concurrency"]{width:min(35%,108px)}
        [data-inference-mobile-graph="01"] [data-mobile-graph-node="scheduler"]{width:min(25%,80px);padding-inline:3px}
        html[lang^="es"] [data-inference-mobile-graph="01"] [data-mobile-graph-node="scheduler"]{width:min(27%,86px);padding-inline:3px}
        html[lang^="es"] [data-inference-mobile-graph="01"] [data-mobile-graph-node="concurrency"]{padding-inline:3px}
        [data-inference-mobile-graph="02"] [data-mobile-graph-node="finish"],
        [data-inference-mobile-graph="02"] [data-mobile-graph-node="waiting"],
        [data-inference-mobile-graph="03"] [data-mobile-graph-node="outcome"],
        [data-inference-mobile-graph="04"] [data-mobile-graph-node="prefill"],
        [data-inference-mobile-graph="04"] [data-mobile-graph-node="correct"],
        [data-inference-mobile-graph="05"] [data-mobile-graph-node="cache"],
        [data-inference-mobile-graph="05"] [data-mobile-graph-node="placement"],
        [data-inference-mobile-graph="05"] [data-mobile-graph-node="fallback"],
        [data-inference-mobile-graph="05"] [data-mobile-graph-node="alt"],
        [data-inference-mobile-graph="06"] [data-mobile-graph-node="latency"],
        [data-inference-mobile-graph="06"] [data-mobile-graph-node="account"],
        [data-inference-mobile-graph="06"] [data-mobile-graph-node="denom"]{width:min(30%,96px)}
        [data-inference-mobile-graph="06"] [data-mobile-graph-node="report"]{width:min(32%,102px)}
        [data-inference-mobile-graph="06"] [data-mobile-graph-node="account"]{width:min(29%,92px)}
        .s5v-inference-mobile-native__node[data-tone="decision"]{border-style:dashed;border-width:1.5px}
        .s5v-inference-mobile-native__node[data-tone="state"]{background:color-mix(in srgb,var(--md-accent-fg-color,#007f8c) 7%,var(--md-default-bg-color,#fff))}
        .s5v-inference-mobile-native__node[data-tone="outcome"]{border-color:color-mix(in srgb,var(--md-accent-fg-color,#007f8c) 70%,currentColor 30%);box-shadow:0 5px 18px color-mix(in srgb,var(--md-accent-fg-color,#007f8c) 12%,transparent)}
        .s5v-inference-mobile-native__edge-label{position:absolute;z-index:1;transform:translate(-50%,-50%);max-width:68px;padding:2px 4px;border-radius:5px;background:color-mix(in srgb,var(--md-default-bg-color,#fff) 95%,transparent);font-size:.66rem;line-height:1.08;font-weight:850;text-align:center;white-space:normal;overflow-wrap:normal;pointer-events:none;opacity:.82}
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

  const boundaryPoint = (center, toward, halfExtent) => {
    const dx = toward[0] - center[0];
    const dy = toward[1] - center[1];
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return center;
    const halfX = Math.max(0.25, halfExtent?.[0] ?? 15);
    const halfY = Math.max(0.25, halfExtent?.[1] ?? 5);
    const tx = Math.abs(dx) < 0.001 ? Number.POSITIVE_INFINITY : halfX / Math.abs(dx);
    const ty = Math.abs(dy) < 0.001 ? Number.POSITIVE_INFINITY : halfY / Math.abs(dy);
    const t = Math.min(1, tx, ty);
    return [center[0] + dx * t, center[1] + dy * t];
  };

  const buildPath = (from, to, via = [], fromExtent, toExtent) => {
    const raw = [[from[1], from[2]], ...via, [to[1], to[2]]];
    if (raw.length < 2) return raw.map((p) => p.join(',')).join(' ');
    const points = raw.map((p) => [...p]);
    points[0] = boundaryPoint(points[0], points[1], fromExtent);
    points[points.length - 1] = boundaryPoint(points[points.length - 1], points[points.length - 2], toExtent);
    return points.map((point) => point.join(',')).join(' ');
  };

  const buildShortDogleg = (pointsText) => {
    const points = String(pointsText).trim().split(/\s+/).map((point) => point.split(',').map(Number));
    if (points.length !== 2 || points.some((point) => point.some((value) => !Number.isFinite(value)))) return pointsText;
    const [start, end] = points;
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const norm = Math.hypot(dx, dy);
    if (norm < 0.001) return pointsText;
    const midpoint = [
      (start[0] + end[0]) / 2 - (dy / norm) * SHORT_EDGE_DOGLEG_OFFSET,
      (start[1] + end[1]) / 2 + (dx / norm) * SHORT_EDGE_DOGLEG_OFFSET,
    ];
    return [start, midpoint, end].map((point) => point.join(',')).join(' ');
  };

  const buildGraph = (summary, contract, lang) => {
    const graph = document.createElement('div');
    graph.className = 's5v-inference-mobile-native__graph';
    graph.dataset.inferenceMobileGraph = contract.key;
    graph.style.height = `${contract.height}px`;
    summary.appendChild(graph);

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    const defs = document.createElementNS(SVG_NS, 'defs');
    const marker = document.createElementNS(SVG_NS, 'marker');
    marker.setAttribute('id', `s5-inference-arrow-${contract.key}`);
    marker.setAttribute('markerWidth', '4'); marker.setAttribute('markerHeight', '4');
    marker.setAttribute('refX', '3.5'); marker.setAttribute('refY', '2'); marker.setAttribute('orient', 'auto');
    const arrow = document.createElementNS(SVG_NS, 'path');
    arrow.setAttribute('d', 'M0,0 L4,2 L0,4 Z'); arrow.setAttribute('fill', 'currentColor');
    marker.appendChild(arrow); defs.appendChild(marker); svg.appendChild(defs);
    graph.prepend(svg);

    const normalizedNodes = contract.nodes.map(normalizeNode);
    const byId = new Map(normalizedNodes.map((node) => [node[0], node]));
    const nodeElements = new Map();
    for (const [id, x, y, es, en, tone] of normalizedNodes) {
      const node = textNode(graph, 'div', 's5v-inference-mobile-native__node', lang === 'en' ? en : es);
      node.style.left = `${x}%`; node.style.top = `${y}%`;
      node.dataset.mobileGraphNode = id;
      node.dataset.tone = tone;
      nodeElements.set(id, node);
    }

    for (const [id, , , , labelX, labelY, esLabel, enLabel] of contract.edges) {
      const label = lang === 'en' ? enLabel : esLabel;
      if (!label) continue;
      const labelNode = textNode(graph, 'span', 's5v-inference-mobile-native__edge-label', label);
      labelNode.style.left = `${clamp(labelX, 14, 86)}%`; labelNode.style.top = `${clamp(labelY, 5, 95)}%`;
      labelNode.dataset.mobileGraphEdgeLabel = id;
    }

    let renderQueued = false;
    const renderEdges = () => {
      renderQueued = false;
      const graphRect = graph.getBoundingClientRect();
      if (graphRect.width <= 0 || graphRect.height <= 0) return;
      const extents = new Map();
      for (const [id, node] of nodeElements) {
        const rect = node.getBoundingClientRect();
        extents.set(id, [
          (rect.width / graphRect.width) * 50,
          (rect.height / graphRect.height) * 50,
        ]);
      }
      for (const existing of svg.querySelectorAll('[data-mobile-graph-edge]')) existing.remove();
      for (const edge of contract.edges) {
        const [id, fromId, toId, via] = edge;
        const from = byId.get(fromId); const to = byId.get(toId);
        if (!from || !to) continue;
        const polyline = document.createElementNS(SVG_NS, 'polyline');
        const pointsText = buildPath(from, to, via, extents.get(fromId), extents.get(toId));
        polyline.setAttribute('points', pointsText);
        polyline.setAttribute('marker-end', `url(#s5-inference-arrow-${contract.key})`);
        polyline.classList.add('s5v-inference-mobile-native__edge-path');
        polyline.dataset.mobileGraphEdge = id;
        polyline.dataset.mobileGraphFrom = fromId;
        polyline.dataset.mobileGraphTo = toId;
        svg.appendChild(polyline);
        let visibleLength = Number.POSITIVE_INFINITY;
        try { visibleLength = polyline.getTotalLength(); } catch {}
        const baseVisibleLength = visibleLength;
        if (baseVisibleLength < SHORT_EDGE_SOLID_THRESHOLD && via.length === 0) {
          polyline.setAttribute('points', buildShortDogleg(pointsText));
          polyline.dataset.mobileGraphRoutedShortEdge = 'true';
          try { visibleLength = polyline.getTotalLength(); } catch {}
        }
        if (baseVisibleLength < SHORT_EDGE_SOLID_THRESHOLD) {
          polyline.classList.add('s5v-inference-mobile-native__edge-path--short');
          polyline.dataset.mobileGraphShortEdge = 'true';
        }
      }
    };
    const queueRender = () => {
      if (renderQueued) return;
      renderQueued = true;
      requestAnimationFrame(renderEdges);
    };
    queueRender();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(queueRender);
      observer.observe(graph);
      graph._s5InferenceResizeObserver = observer;
    }
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
    scroll.parentNode.insertBefore(summary, scroll);
    buildGraph(summary, contract, lang);
    const relation = textNode(summary, 'p', 's5v-inference-mobile-native__relation', contract.relation[lang]);
    relation.dataset.inferenceMobileRelation = 'true';
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