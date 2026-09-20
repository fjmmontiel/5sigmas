(() => {
  'use strict';

  const CONTRACTS = [
    {
      key: '01', selector: '.s5v-inference-phases', scroll: '.s5v-inference-phases__scroll', height: 356,
      title: {
        es: 'TTFT y TPOT nacen en fronteras distintas del mismo pipeline',
        en: 'TTFT and TPOT come from different boundaries in the same pipeline',
      },
      relation: {
        es: 'La petición atraviesa cola y prefill antes de la primera salida; decode reutiliza y extiende KV. La concurrencia actúa sobre scheduler/batching y puede subir goodput a costa de cola, TTFT o TPOT.',
        en: 'The request crosses queueing and prefill before first output; decode reuses and extends KV. Concurrency acts through scheduler/batching and can raise goodput while worsening queueing, TTFT, or TPOT.',
      },
      nodes: [
        ['request', 10, 12, 'Petición', 'Request', 'input'], ['queue', 34, 12, 'Cola', 'Queue', 'decision'],
        ['prefill', 61, 12, 'Prefill', 'Prefill', 'compute'], ['first', 87, 28, '1ª salida', '1st output', 'outcome'],
        ['decode', 72, 52, 'Decode', 'Decode', 'compute'], ['kv', 39, 52, 'Estado KV', 'KV state', 'state'],
        ['concurrency', 11, 82, 'Concurrencia', 'Concurrency', 'input'], ['scheduler', 43, 82, 'Scheduler / batching', 'Scheduler / batching', 'decision'],
        ['goodput', 80, 82, 'Throughput / goodput', 'Throughput / goodput', 'outcome'],
      ],
      edges: [
        ['e1', 'request', 'queue', [], 22, 7, '', ''], ['e2', 'queue', 'prefill', [], 48, 7, '', ''],
        ['e3', 'prefill', 'first', [], 76, 15, 'TTFT', 'TTFT'], ['e4', 'first', 'decode', [], 87, 43, 'ritmo', 'cadence'],
        ['e5', 'prefill', 'kv', [[58, 35]], 49, 39, 'crea', 'builds'], ['e6', 'kv', 'decode', [], 55, 57, 'reutiliza', 'reuses'],
        ['e7', 'concurrency', 'scheduler', [], 27, 77, '', ''], ['e8', 'scheduler', 'goodput', [], 61, 77, 'capacidad', 'capacity'],
        ['e9', 'scheduler', 'queue', [[43, 68], [34, 68], [34, 30]], 25, 61, 'presión', 'pressure'],
      ],
    },
    {
      key: '02', selector: '.s5v-kv-paging', scroll: '.s5v-kv-paging__scroll', height: 370,
      title: { es: 'KV lógico, bloques físicos y batching continuo forman un circuito de asignación', en: 'Logical KV, physical blocks, and continuous batching form an allocation loop' },
      relation: {
        es: 'La tabla desacopla el KV lógico de los bloques físicos. Cuando una petición libera páginas, el scheduler puede admitir otra; host↔GPU añade capacidad pero también movimiento de estado.',
        en: 'The block table decouples logical KV from physical blocks. When a request releases pages, the scheduler can admit another; host↔GPU adds capacity but also state-movement cost.',
      },
      nodes: [
        ['a', 11, 12, 'Req A', 'Req A', 'input'], ['b', 11, 32, 'Req B', 'Req B', 'input'], ['table', 42, 22, 'Block table', 'Block table', 'state'],
        ['gpu', 76, 22, 'Pool GPU', 'GPU pool', 'state'], ['finish', 76, 49, 'Fin / release', 'Finish / release', 'event'], ['free', 48, 49, 'Bloques libres', 'Free blocks', 'state'],
        ['waiting', 12, 78, 'Req C espera', 'Req C waits', 'input'], ['scheduler', 47, 78, 'Scheduler', 'Scheduler', 'decision'], ['admit', 80, 78, 'Admitir C', 'Admit C', 'outcome'],
        ['host', 86, 54, 'Host tier', 'Host tier', 'state'],
      ],
      edges: [
        ['e1', 'a', 'table', [], 25, 10, '', ''], ['e2', 'b', 'table', [], 25, 33, '', ''], ['e3', 'table', 'gpu', [], 59, 16, 'mapa', 'maps'],
        ['e4', 'gpu', 'finish', [], 82, 37, '', ''], ['e5', 'finish', 'free', [], 62, 52, 'libera', 'releases'],
        ['e6', 'free', 'scheduler', [], 47, 64, 'capacidad', 'capacity'], ['e7', 'waiting', 'scheduler', [], 29, 73, '', ''],
        ['e8', 'scheduler', 'admit', [], 64, 73, 'admite', 'admits'], ['e9', 'admit', 'table', [[86, 66], [64, 66], [64, 36]], 74, 61, 'asigna', 'allocates'],
        ['e10', 'gpu', 'host', [], 84, 38, 'offload ⇄', 'offload ⇄'],
      ],
    },
    {
      key: '03', selector: '.s5v-quant-parallel', scroll: '.s5v-quant-parallel__scroll', height: 360,
      title: { es: 'Cuantización y paralelismo atacan cuellos distintos y convergen en el mismo resultado', en: 'Quantization and parallelism attack different bottlenecks and converge on one outcome' },
      relation: {
        es: 'La lane superior reduce representación y trabajo local; la inferior reparte el modelo y añade comunicación. Ambas convergen en latencia/memoria/calidad: optimizar una puede convertir la otra en el nuevo cuello.',
        en: 'The upper lane reduces representation and local work; the lower lane splits the model and adds communication. Both converge on latency/memory/quality, so optimizing one can make the other the new bottleneck.',
      },
      nodes: [
        ['bytes', 11, 15, 'Weights / act / KV', 'Weights / act / KV', 'input'], ['quant', 39, 15, 'Precisión', 'Precision', 'decision'], ['kernel', 67, 15, 'Kernel + HW', 'Kernel + HW', 'compute'], ['local', 88, 31, 'Bytes / trabajo local', 'Bytes / local work', 'state'],
        ['model', 11, 60, 'Modelo', 'Model', 'input'], ['placement', 39, 60, 'DP / TP / PP / EP / CP', 'DP / TP / PP / EP / CP', 'decision'], ['comms', 67, 60, 'Collectives / tráfico', 'Collectives / traffic', 'compute'],
        ['outcome', 61, 88, 'Latencia · memoria · calidad', 'Latency · memory · quality', 'outcome'], ['topology', 88, 60, 'Interconnect + runtime', 'Interconnect + runtime', 'state'],
      ],
      edges: [
        ['e1', 'bytes', 'quant', [], 25, 10, '', ''], ['e2', 'quant', 'kernel', [], 53, 10, '', ''], ['e3', 'kernel', 'local', [], 80, 18, 'ejecuta', 'executes'],
        ['e4', 'model', 'placement', [], 25, 55, '', ''], ['e5', 'placement', 'comms', [], 53, 55, 'reparte', 'splits'], ['e6', 'comms', 'topology', [], 79, 55, 'depende', 'depends'],
        ['e7', 'local', 'outcome', [[82, 68]], 77, 70, 'trade-off', 'trade-off'], ['e8', 'topology', 'outcome', [[82, 82]], 77, 84, 'trade-off', 'trade-off'],
      ],
    },
    {
      key: '04', selector: '.s5v-reuse-spec', scroll: '.s5v-reuse-spec__scroll', height: 390,
      title: { es: 'Reutilizar estado validado y especular tokens son dos ramas diferentes', en: 'Reusing validated state and speculating tokens are two different branches' },
      relation: {
        es: 'Prefix caching bifurca en hit/miss y sólo evita recomputar prefill compatible. Speculative decoding bifurca en accept/reject y sólo compromete lo verificado por target; reject vuelve al camino de corrección.',
        en: 'Prefix caching branches on hit/miss and only avoids recomputing compatible prefill. Speculative decoding branches on accept/reject and only commits target-verified tokens; rejection loops back through correction.',
      },
      nodes: [
        ['prefix', 11, 13, 'Prefix', 'Prefix', 'input'], ['lookup', 38, 13, 'Lookup', 'Lookup', 'decision'], ['hit', 66, 8, 'HIT', 'HIT', 'outcome'], ['reuse', 88, 8, 'Reusar KV', 'Reuse KV', 'state'],
        ['miss', 66, 29, 'MISS', 'MISS', 'event'], ['prefill', 88, 29, 'Prefill completo', 'Full prefill', 'compute'],
        ['draft', 11, 59, 'Draft', 'Draft', 'compute'], ['verify', 38, 59, 'Target verify', 'Target verify', 'decision'], ['accept', 65, 51, 'ACCEPT', 'ACCEPT', 'outcome'], ['commit', 88, 51, 'Commit', 'Commit', 'state'],
        ['reject', 65, 72, 'REJECT', 'REJECT', 'event'], ['correct', 88, 72, 'Rewind / corregir', 'Rewind / correct', 'compute'], ['pressure', 49, 91, 'KV + scheduler pressure', 'KV + scheduler pressure', 'state'],
      ],
      edges: [
        ['e1', 'prefix', 'lookup', [], 24, 8, '', ''], ['e2', 'lookup', 'hit', [], 52, 5, 'hit', 'hit'], ['e3', 'hit', 'reuse', [], 77, 3, '', ''],
        ['e4', 'lookup', 'miss', [], 52, 24, 'miss', 'miss'], ['e5', 'miss', 'prefill', [], 77, 24, '', ''],
        ['e6', 'draft', 'verify', [], 24, 54, '', ''], ['e7', 'verify', 'accept', [], 52, 49, 'acepta', 'accepts'], ['e8', 'accept', 'commit', [], 77, 46, '', ''],
        ['e9', 'verify', 'reject', [], 52, 69, 'rechaza', 'rejects'], ['e10', 'reject', 'correct', [], 77, 67, '', ''], ['e11', 'correct', 'verify', [[88, 84], [38, 84]], 61, 84, 'reverifica ↺', 'reverify ↺'],
        ['e12', 'reuse', 'pressure', [[88, 42], [70, 91]], 75, 91, '', ''], ['e13', 'commit', 'pressure', [[88, 82], [66, 91]], 80, 88, '', ''],
      ],
    },
    {
      key: '05', selector: '.s5v-routing-policy', scroll: '.s5v-routing-policy__scroll', height: 405,
      title: { es: 'Cache, routing, placement y fallback forman un árbol de decisión con feedback', en: 'Caching, routing, placement, and fallback form a decision tree with feedback' },
      relation: {
        es: 'Primero se filtran restricciones; un cache hit termina sin inferencia. Un miss pasa por routing y placement. El fallo abre fallback sólo si sigue siendo compatible, y telemetry cierra el loop hacia la política.',
        en: 'Constraints are filtered first; a cache hit ends without inference. A miss goes through routing and placement. Failure opens fallback only when still compatible, and telemetry closes the loop back to policy.',
      },
      nodes: [
        ['request', 10, 10, 'Petición', 'Request', 'input'], ['eligible', 34, 10, 'Elegibilidad', 'Eligibility', 'decision'], ['cache', 59, 10, 'Response cache', 'Response cache', 'decision'], ['hit', 86, 8, 'HIT → respuesta', 'HIT → response', 'outcome'],
        ['router', 59, 38, 'Router', 'Router', 'decision'], ['placement', 84, 38, 'Worker placement', 'Worker placement', 'decision'], ['primary', 84, 60, 'Primary attempt', 'Primary attempt', 'compute'],
        ['success', 59, 76, 'SUCCESS', 'SUCCESS', 'outcome'], ['fallback', 84, 82, 'Fallback gate', 'Fallback gate', 'decision'], ['alt', 59, 92, 'Fallback model', 'Fallback model', 'compute'],
        ['telemetry', 29, 76, 'Telemetry', 'Telemetry', 'state'], ['policy', 28, 43, 'Policy update', 'Policy update', 'state'],
      ],
      edges: [
        ['e1', 'request', 'eligible', [], 22, 5, '', ''], ['e2', 'eligible', 'cache', [], 46, 5, 'válida', 'valid'], ['e3', 'cache', 'hit', [], 73, 4, 'hit', 'hit'],
        ['e4', 'cache', 'router', [], 59, 24, 'miss ↓', 'miss ↓'], ['e5', 'router', 'placement', [], 72, 33, 'elige clase', 'selects class'], ['e6', 'placement', 'primary', [], 86, 50, '', ''],
        ['e7', 'primary', 'success', [], 72, 67, 'ok', 'ok'], ['e8', 'primary', 'fallback', [], 86, 72, 'fail ↓', 'fail ↓'], ['e9', 'fallback', 'alt', [], 72, 87, 'compatible', 'compatible'],
        ['e10', 'success', 'telemetry', [], 44, 71, '', ''], ['e11', 'alt', 'telemetry', [[45, 92], [29, 84]], 42, 90, '', ''], ['e12', 'telemetry', 'policy', [], 28, 60, 'aprende', 'learns'], ['e13', 'policy', 'router', [], 43, 38, 'feedback', 'feedback'],
      ],
    },
    {
      key: '06', selector: '.s5v-benchmark-boundary', scroll: '.s5v-benchmark-boundary__scroll', height: 390,
      title: { es: 'Performance, latencia y economía deben medir la misma frontera', en: 'Performance, latency, and economics must measure the same boundary' },
      relation: {
        es: 'Workload/SUT, reloj cliente y contabilidad energética son lanes simultáneas. Sólo al converger sobre la misma ventana, éxito/SLO y denominadores se puede reportar goodput, coste/tarea y energía/tarea comparables.',
        en: 'Workload/SUT, client clock, and energy accounting are simultaneous lanes. Only when they converge on the same window, success/SLO, and denominators can goodput, cost/task, and energy/task be compared.',
      },
      nodes: [
        ['workload', 10, 12, 'Workload + arrivals', 'Workload + arrivals', 'input'], ['sut', 40, 12, 'SUT / queue / service', 'SUT / queue / service', 'compute'], ['response', 72, 12, 'Completions', 'Completions', 'state'],
        ['clock', 10, 46, 'Client clock', 'Client clock', 'input'], ['latency', 40, 46, 'TTFT / TPOT / E2E', 'TTFT / TPOT / E2E', 'state'], ['goodput', 72, 46, 'Success + SLO → goodput', 'Success + SLO → goodput', 'outcome'],
        ['power', 10, 78, 'Power meter + cost', 'Power meter + cost', 'input'], ['account', 40, 78, '∫P(t)dt + ledger', '∫P(t)dt + ledger', 'state'], ['denom', 72, 78, 'Cost / energy per task', 'Cost / energy per task', 'outcome'],
        ['sweep', 20, 95, 'Saturation sweep', 'Saturation sweep', 'decision'], ['report', 88, 95, 'Report + operating region', 'Report + operating region', 'outcome'],
      ],
      edges: [
        ['e1', 'workload', 'sut', [], 25, 7, 'carga', 'load'], ['e2', 'sut', 'response', [], 56, 7, '', ''], ['e3', 'response', 'goodput', [], 74, 29, 'filtra', 'filters'],
        ['e4', 'clock', 'latency', [], 25, 41, 'endpoints', 'endpoints'], ['e5', 'latency', 'goodput', [], 56, 41, 'SLO', 'SLO'],
        ['e6', 'power', 'account', [], 25, 73, 'misma ventana', 'same window'], ['e7', 'account', 'denom', [], 56, 73, 'denominador', 'denominator'],
        ['e8', 'goodput', 'report', [[88, 62]], 83, 63, '', ''], ['e9', 'denom', 'report', [[88, 86]], 83, 85, '', ''], ['e10', 'sweep', 'report', [], 55, 92, 'región útil', 'operating region'], ['e11', 'sweep', 'sut', [[20, 88], [20, 30], [40, 30]], 17, 58, 'varía carga ↺', 'vary load ↺'],
      ],
    },
  ];

  const STYLE_ID = 's5-inference-mobile-native-style';
  const SVG_NS = 'http://www.w3.org/2000/svg';

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
        .s5v-inference-mobile-native__graph svg{position:absolute;inset:0;width:100%;height:100%;z-index:0;overflow:visible;color:color-mix(in srgb,currentColor 70%,transparent)}
        .s5v-inference-mobile-native__edge-path{fill:none;stroke:currentColor;stroke-width:1.5;vector-effect:non-scaling-stroke;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:5 4;animation:s5InferenceMobileFlow 3.2s linear infinite}
        .s5v-inference-mobile-native__node{position:absolute;z-index:2;transform:translate(-50%,-50%);width:min(29%,104px);min-height:42px;display:grid;place-items:center;padding:7px 6px;border:1px solid color-mix(in srgb,currentColor 20%,transparent);border-radius:11px;background:var(--md-default-bg-color,#fff);box-shadow:0 4px 14px color-mix(in srgb,currentColor 7%,transparent);font-size:.77rem;line-height:1.18;font-weight:850;text-align:center;overflow-wrap:anywhere}
        .s5v-inference-mobile-native__node[data-tone="decision"]{border-style:dashed;border-width:1.5px}
        .s5v-inference-mobile-native__node[data-tone="state"]{background:color-mix(in srgb,var(--md-accent-fg-color,#007f8c) 7%,var(--md-default-bg-color,#fff))}
        .s5v-inference-mobile-native__node[data-tone="outcome"]{border-color:color-mix(in srgb,var(--md-accent-fg-color,#007f8c) 70%,currentColor 30%);box-shadow:0 5px 18px color-mix(in srgb,var(--md-accent-fg-color,#007f8c) 12%,transparent)}
        .s5v-inference-mobile-native__edge-label{position:absolute;z-index:3;transform:translate(-50%,-50%);max-width:98px;padding:2px 4px;border-radius:5px;background:color-mix(in srgb,var(--md-default-bg-color,#fff) 92%,transparent);font-size:.67rem;line-height:1.08;font-weight:850;text-align:center;opacity:.78;pointer-events:none}
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

  const buildPath = (from, to, via = []) => [[from[1], from[2]], ...via, [to[1], to[2]]].map((point) => point.join(',')).join(' ');

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

    const byId = new Map(contract.nodes.map((node) => [node[0], node]));
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
        labelNode.style.left = `${labelX}%`; labelNode.style.top = `${labelY}%`;
        labelNode.dataset.mobileGraphEdgeLabel = id;
      }
    }
    graph.prepend(svg);

    for (const [id, x, y, es, en, tone] of contract.nodes) {
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
