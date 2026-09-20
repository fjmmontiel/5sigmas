(() => {
  'use strict';

  const CONTRACTS = [
    {
      selector: '.s5v-inference-phases',
      scroll: '.s5v-inference-phases__scroll',
      key: '01',
      es: {
        kicker: 'Ruta móvil · latencia por fases',
        title: 'La primera salida y el ritmo posterior nacen en fronteras distintas',
        steps: [
          ['Petición + cola', 'Red, gateway, admisión y espera ya consumen parte de TTFT antes de que el modelo ejecute prefill.'],
          ['Prefill', 'Procesa L_in, construye el estado KV reutilizable y prepara la primera salida; prefill no equivale por sí solo a TTFT.'],
          ['Primera salida', 'La frontera que termina TTFT depende del harness: primer token/chunk observado o primera salida visible no razonadora.'],
          ['Decode', 'Reutiliza y extiende KV token a token. TPOT/ITL describen esta cadencia; no son throughput agregado.'],
        ],
        relation: 'Concurrencia → scheduler/batching → throughput o goodput, pero también puede mover cola, TTFT y TPOT.',
      },
      en: {
        kicker: 'Mobile path · latency by phase',
        title: 'First output and the later token cadence come from different boundaries',
        steps: [
          ['Request + queue', 'Network, gateway, admission, and waiting already consume TTFT before model prefill starts.'],
          ['Prefill', 'Processes L_in, builds reusable KV state, and prepares first output; prefill alone is not TTFT.'],
          ['First output', 'The boundary that ends TTFT depends on the harness: first observed token/chunk or first visible non-reasoning output.'],
          ['Decode', 'Reuses and extends KV token by token. TPOT/ITL describe this cadence; they are not aggregate throughput.'],
        ],
        relation: 'Concurrency → scheduler/batching → throughput or goodput, while queueing, TTFT, and TPOT can move too.',
      },
    },
    {
      selector: '.s5v-kv-paging',
      scroll: '.s5v-kv-paging__scroll',
      key: '02',
      es: {
        kicker: 'Ruta móvil · estado y memoria',
        title: 'KV lógico, bloques físicos y batching continuo son capas diferentes',
        steps: [
          ['Estado KV por secuencia', 'Cada petición activa acumula claves y valores que crecen con los tokens procesados; el tamaño lógico no dicta una dirección física contigua.'],
          ['Bloques / páginas', 'PagedAttention desacopla el KV lógico de su colocación física para reducir fragmentación y permitir asignación no contigua.'],
          ['Scheduler continuo', 'Cuando una petición termina o libera capacidad, otra puede entrar sin esperar a que finalice un batch estático completo.'],
          ['Jerarquía de memoria', 'GPU, host y cualquier mecanismo de offload añaden capacidad y coste de movimiento; la política decide qué estado permanece cerca del cómputo.'],
        ],
        relation: 'Más memoria utilizable → mayor batch posible, pero paging, scheduling y movimiento de estado determinan si esa capacidad se convierte en throughput sin romper latencia.',
      },
      en: {
        kicker: 'Mobile path · state and memory',
        title: 'Logical KV, physical blocks, and continuous batching are different layers',
        steps: [
          ['Per-sequence KV state', 'Each active request accumulates keys and values as tokens are processed; logical size does not require contiguous physical placement.'],
          ['Blocks / pages', 'PagedAttention decouples logical KV from physical placement to reduce fragmentation and permit non-contiguous allocation.'],
          ['Continuous scheduler', 'When a request finishes or frees capacity, another can enter without waiting for an entire static batch to complete.'],
          ['Memory hierarchy', 'GPU, host, and offload mechanisms trade capacity for movement cost; policy decides which state stays close to compute.'],
        ],
        relation: 'More usable memory → larger possible batches, but paging, scheduling, and state movement decide whether that capacity becomes throughput without breaking latency.',
      },
    },
    {
      selector: '.s5v-quant-parallel',
      scroll: '.s5v-quant-parallel__scroll',
      key: '03',
      es: {
        kicker: 'Ruta móvil · representación y placement',
        title: 'Cuantizar bytes y repartir el modelo resuelven cuellos distintos',
        steps: [
          ['Representación', 'Weights, activaciones y KV cache pueden usar precisiones diferentes; cuantizar una de ellas no implica cuantizar las demás.'],
          ['Kernel + hardware', 'Menos bits ayudan sólo si el kernel y el acelerador ejecutan ese formato de forma eficiente y la pérdida de calidad es aceptable.'],
          ['Placement', 'Data parallel replica modelos para peticiones distintas; tensor/pipeline parallel reparten trabajo del mismo modelo entre dispositivos.'],
          ['Comunicación', 'Más ranks pueden reducir memoria por GPU, pero añaden collectives, sincronización y tráfico de interconexión.'],
        ],
        relation: 'La optimización correcta minimiza bytes y trabajo local sin convertir comunicación, sincronización o calidad en el nuevo cuello de botella.',
      },
      en: {
        kicker: 'Mobile path · representation and placement',
        title: 'Reducing bytes and splitting the model solve different bottlenecks',
        steps: [
          ['Representation', 'Weights, activations, and KV cache can use different precisions; quantizing one does not imply quantizing the others.'],
          ['Kernel + hardware', 'Fewer bits help only when kernels and accelerators execute that format efficiently and the quality loss is acceptable.'],
          ['Placement', 'Data parallel replicates models for different requests; tensor/pipeline parallel split one model’s work across devices.'],
          ['Communication', 'More ranks can reduce memory per GPU, but add collectives, synchronization, and interconnect traffic.'],
        ],
        relation: 'The useful optimum cuts bytes and local work without turning communication, synchronization, or quality into the new bottleneck.',
      },
    },
    {
      selector: '.s5v-reuse-spec',
      scroll: '.s5v-reuse-spec__scroll',
      key: '04',
      es: {
        kicker: 'Ruta móvil · reutilizar ≠ especular',
        title: 'Prefix caching salta trabajo ya validado; speculative decoding crea trabajo provisional',
        steps: [
          ['Prefix compatible', 'Un hit sólo reutiliza estado KV si identidad, tokens y contexto relevante son compatibles con la entrada actual.'],
          ['Reutilización', 'El estado ya verificado evita recomputar parte del prefill; no crea tokens nuevos ni elimina el coste de decode restante.'],
          ['Draft provisional', 'Speculative decoding propone varios candidatos con un draft model o mecanismo más barato.'],
          ['Target verifica', 'Sólo el prefijo aceptado por el modelo target entra en el estado comprometido; lo rechazado se descarta y debe recalcularse.'],
        ],
        relation: 'Ambos mecanismos consumen KV/scheduler capacity. Su ganancia end-to-end depende del workload, hit/acceptance rate y de no desplazar trabajo más valioso.',
      },
      en: {
        kicker: 'Mobile path · reuse ≠ speculation',
        title: 'Prefix caching skips already validated work; speculative decoding creates provisional work',
        steps: [
          ['Compatible prefix', 'A hit reuses KV state only when identity, tokens, and relevant context are compatible with the current input.'],
          ['Reuse', 'Previously verified state avoids recomputing part of prefill; it does not create new tokens or remove the remaining decode cost.'],
          ['Provisional draft', 'Speculative decoding proposes several candidates with a cheaper draft model or mechanism.'],
          ['Target verifies', 'Only the prefix accepted by the target model enters committed state; rejected candidates are discarded and recomputed.'],
        ],
        relation: 'Both mechanisms consume KV/scheduler capacity. End-to-end gain depends on workload, hit/acceptance rate, and not displacing more valuable work.',
      },
    },
    {
      selector: '.s5v-routing-policy',
      scroll: '.s5v-routing-policy__scroll',
      key: '05',
      es: {
        kicker: 'Ruta móvil · cuatro decisiones',
        title: 'Cache, routing, placement y fallback no son la misma capa',
        steps: [
          ['Filtrar restricciones', 'Capacidades, política, región, contexto y SLO eliminan opciones inválidas antes de optimizar coste o latencia.'],
          ['Cache de respuesta', 'Un hit compatible puede cerrar la petición sin inferencia; un miss activa la política de selección de modelo.'],
          ['Routing → placement', 'El router elige una clase/modelo; después el scheduler coloca la petición en un worker según carga, KV locality y capacidad.'],
          ['Fallo → fallback', 'Un fallo no autoriza cualquier alternativa: deben seguir cumpliéndose presupuesto, compatibilidad y semántica de la petición.'],
        ],
        relation: 'La telemetría debe conservar decisión, cache, intento y outcome para aprender de alternativas reales, no sólo del modelo finalmente elegido.',
      },
      en: {
        kicker: 'Mobile path · four decisions',
        title: 'Caching, routing, placement, and fallback are not the same layer',
        steps: [
          ['Filter constraints', 'Capabilities, policy, region, context, and SLO remove invalid options before optimizing cost or latency.'],
          ['Response cache', 'A compatible hit can close the request without inference; a miss activates model-selection policy.'],
          ['Routing → placement', 'The router chooses a class/model; then the scheduler places the request on a worker using load, KV locality, and capacity.'],
          ['Failure → fallback', 'A failure does not authorize any alternative: budget, compatibility, and request semantics must still hold.'],
        ],
        relation: 'Telemetry must preserve decision, cache, attempt, and outcome so policy learns from real alternatives, not only the model ultimately selected.',
      },
    },
    {
      selector: '.s5v-benchmark-boundary',
      scroll: '.s5v-benchmark-boundary__scroll',
      key: '06',
      es: {
        kicker: 'Ruta móvil · el número nace de una frontera',
        title: 'Workload, reloj, SLO, energía y hardware deben compartir una frontera declarada',
        steps: [
          ['Workload + carga', 'Publica distribución de inputs/outputs, prefijos compartidos, request rate, concurrencia y proceso de llegadas; cambian el régimen del sistema.'],
          ['Reloj cliente', 'TTFT/TPOT sólo son comparables si se fijan los endpoints temporales y qué salida termina cada intervalo.'],
          ['Goodput', 'Filtra completions por éxito y por SLO; throughput bruto puede crecer aunque la experiencia incumpla la frontera requerida.'],
          ['Coste + energía', 'Integra potencia sobre la misma ventana y publica denominadores de coste/energía junto con modelo, hardware, software y topology scope.'],
        ],
        relation: 'Un mismo runtime produce cifras distintas al cambiar workload o boundary. Sin denominador y frontera publicados, el benchmark no es reproducible ni comparable.',
      },
      en: {
        kicker: 'Mobile path · every number comes from a boundary',
        title: 'Workload, clock, SLO, energy, and hardware must share a declared measurement boundary',
        steps: [
          ['Workload + load process', 'Publish input/output distributions, shared prefixes, request rate, concurrency, and arrival process; they change the system regime.'],
          ['Client clock', 'TTFT/TPOT are comparable only when temporal endpoints and the output that ends each interval are fixed.'],
          ['Goodput', 'Filter completions by success and SLO; raw throughput can rise while the required user-facing boundary is violated.'],
          ['Cost + energy', 'Integrate power over the same window and publish cost/energy denominators with model, hardware, software, and topology scope.'],
        ],
        relation: 'The same runtime yields different numbers when workload or boundary changes. Without a published denominator and boundary, the benchmark is not reproducible or comparable.',
      },
    },
  ];

  const STYLE_ID = 's5-inference-mobile-native-style';

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .s5v-inference-mobile-native{display:none;box-sizing:border-box}
      @media (max-width:720px){
        .s5v-inference-mobile-native{display:grid;gap:9px;margin:12px 0 16px;padding:13px;border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:18px;background:color-mix(in srgb,var(--md-default-bg-color,#fff) 96%,currentColor 4%);overflow-x:clip}
        .s5v-inference-mobile-native__kicker{font-size:.72rem;font-weight:900;letter-spacing:.11em;text-transform:uppercase;opacity:.72}
        .s5v-inference-mobile-native h4{margin:0 0 2px;font-size:1.02rem;line-height:1.2;letter-spacing:-.02em}
        .s5v-inference-mobile-native__steps{display:grid;gap:7px;margin:0;padding:0;list-style:none}
        .s5v-inference-mobile-native__step{min-width:0;padding:11px 12px;border:1px solid color-mix(in srgb,currentColor 16%,transparent);border-radius:13px;background:var(--md-default-bg-color,#fff);overflow-wrap:anywhere}
        .s5v-inference-mobile-native__step strong{display:block;margin:0 0 4px;font-size:.84rem;line-height:1.25}
        .s5v-inference-mobile-native__step p{margin:0;font-size:.78rem;line-height:1.43;font-weight:650;opacity:.82}
        .s5v-inference-mobile-native__arrow{justify-self:center;font-size:1rem;font-weight:900;line-height:.7;opacity:.62}
        .s5v-inference-mobile-native__relation{margin:2px 0 0;padding:10px 11px;border-left:3px solid var(--md-accent-fg-color,#007f8c);border-radius:10px;background:color-mix(in srgb,var(--md-accent-fg-color,#007f8c) 8%,transparent);font-size:.78rem;line-height:1.43;font-weight:750;overflow-wrap:anywhere}
        .s5v-inference-phases .s5v-inference-phases__scroll,
        .s5v-kv-paging .s5v-kv-paging__scroll,
        .s5v-quant-parallel .s5v-quant-parallel__scroll,
        .s5v-reuse-spec .s5v-reuse-spec__scroll,
        .s5v-routing-policy .s5v-routing-policy__scroll,
        .s5v-benchmark-boundary .s5v-benchmark-boundary__scroll{display:none!important}
      }
      @media (prefers-reduced-motion:reduce){.s5v-inference-mobile-native *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
    `;
    document.head.appendChild(style);
  };

  const appendTextElement = (parent, tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    parent.appendChild(node);
    return node;
  };

  const buildSummary = (section, contract, copy) => {
    if (section.querySelector('[data-inference-mobile-native]')) return;
    const scroll = section.querySelector(contract.scroll);
    if (!scroll) return;

    const summary = document.createElement('div');
    summary.className = 's5v-inference-mobile-native';
    summary.dataset.inferenceMobileNative = contract.key;
    summary.setAttribute('role', 'group');
    summary.setAttribute('aria-label', copy.title);

    appendTextElement(summary, 'div', 's5v-inference-mobile-native__kicker', copy.kicker);
    appendTextElement(summary, 'h4', '', copy.title);

    const list = document.createElement('ol');
    list.className = 's5v-inference-mobile-native__steps';
    copy.steps.forEach(([label, detail], index) => {
      const item = document.createElement('li');
      item.className = 's5v-inference-mobile-native__step';
      item.dataset.inferenceMobileStep = String(index + 1);
      appendTextElement(item, 'strong', '', label);
      appendTextElement(item, 'p', '', detail);
      list.appendChild(item);
      if (index < copy.steps.length - 1) {
        const arrow = document.createElement('li');
        arrow.className = 's5v-inference-mobile-native__arrow';
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = '↓';
        list.appendChild(arrow);
      }
    });
    summary.appendChild(list);
    const relation = appendTextElement(summary, 'p', 's5v-inference-mobile-native__relation', copy.relation);
    relation.dataset.inferenceMobileRelation = 'true';
    scroll.parentNode.insertBefore(summary, scroll);
  };

  const init = () => {
    ensureStyle();
    const lang = (document.documentElement.lang || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
    for (const contract of CONTRACTS) {
      for (const section of document.querySelectorAll(contract.selector)) {
        buildSummary(section, contract, contract[lang]);
      }
    }
  };

  if (typeof document$ !== 'undefined' && document$.subscribe) {
    document$.subscribe(init);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
