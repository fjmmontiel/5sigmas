/* Progressive enhancement only. All chapter and media links exist in built HTML. */
(() => {
  'use strict';
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const q = (root, selector) => root.querySelector(selector);
  const qa = (root, selector) => [...root.querySelectorAll(selector)];

  function enhanceHub(hub) {
    if (hub.dataset.sxReady) return;
    hub.dataset.sxReady = 'true';
    hub.classList.add('is-enhanced');
    const en = hub.dataset.locale === 'en';
    const cards = qa(hub, '[data-sx-card]');
    const panels = qa(hub, '[data-sx-detail]');
    const filters = qa(hub, '[data-sx-filter]');
    const search = q(hub, '[data-sx-search]');
    const stateKey = `s5:series-discovery:${en ? 'en' : 'es'}`;
    let facet = 'all', savedScroll = 0, originLink = null;
    try {
      const saved = JSON.parse(sessionStorage.getItem(stateKey) || '{}');
      if (filters.some(button => button.dataset.sxFilter === saved.facet)) facet = saved.facet;
      search.value = typeof saved.query === 'string' ? saved.query.slice(0, 200) : '';
    } catch { /* Browsing works without storage. */ }
    function filter() {
      const tokens = norm(search.value).split(/\s+/).filter(Boolean);
      let count = 0;
      cards.forEach(card => {
        const matches = (facet === 'all' || card.dataset.facet === facet) && tokens.every(token => norm(card.dataset.search).includes(token));
        card.hidden = !matches;
        count += Number(matches);
      });
      filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.sxFilter === facet)));
      q(hub, '[data-sx-count]').textContent = en ? `${count} of ${cards.length} series` : `${count} de ${cards.length} series`;
      q(hub, '[data-sx-empty]').hidden = count > 0;
      try { sessionStorage.setItem(stateKey, JSON.stringify({facet, query: search.value.slice(0,200)})); } catch { /* Optional. */ }
    }
    filters.forEach(button => button.addEventListener('click', () => { facet = button.dataset.sxFilter; filter(); }));
    search.addEventListener('input', filter);
    q(hub, '[data-sx-clear]').addEventListener('click', () => { facet = 'all'; search.value = ''; filter(); search.focus(); });
    function show(hash, move = false) {
      const active = panels.find(panel => `#${panel.id}` === hash);
      q(hub, '[data-sx-overview]').hidden = Boolean(active);
      panels.forEach(panel => { panel.hidden = panel !== active; panel.open = panel === active; });
      if (move && active) {
        window.scrollTo(0, 0);
        q(active, '.s5-series-hero h2').focus({preventScroll:true});
      } else if (move) {
        window.scrollTo(0, savedScroll);
        originLink?.focus({preventScroll:true});
      }
    }
    hub.addEventListener('click', event => {
      const link = event.target.closest('a[href^="#"]');
      if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const hash = link.getAttribute('href');
      if (hash !== '#catalogo' && !panels.some(panel => `#${panel.id}` === hash)) return;
      event.preventDefault();
      if (!q(hub, '[data-sx-overview]').hidden) { savedScroll = window.scrollY; originLink = link; }
      history.pushState(null, '', hash);
      show(hash, true);
    });
    window.addEventListener('popstate', () => { if (hub.isConnected) show(location.hash, true); });
    window.addEventListener('hashchange', () => { if (hub.isConnected) show(location.hash); });
    try {
      const saved = JSON.parse(localStorage.getItem('s5:last-reading:v2') || 'null');
      const entry = saved && qa(hub, '[data-sx-chapter-url]').find(card => card.dataset.sxChapterUrl === saved.url);
      if (entry) {
        q(hub, '[data-sx-resume-title]').textContent = q(entry, 'h3').textContent;
        q(hub, '[data-sx-resume-link]').href = entry.dataset.sxChapterUrl;
        q(hub, '[data-sx-resume]').hidden = false;
      }
    } catch { /* Last visited does not imply completed. */ }
    filter();
    show(location.hash);
  }

  function enhanceGuide(root) {
    if (root.dataset.sxReady) return;
    let data;
    try { data = JSON.parse(root.dataset.guide); } catch { return; }
    if (!Array.isArray(data.steps) || data.steps.length !== 4) return;
    root.dataset.sxReady = 'true';
    const kind = root.dataset.sxGuide, en = root.dataset.locale === 'en';
    const t = (es, english) => en ? english : es;
    const experiment = q(root, '[data-sx-experiment]');
    const scene = q(root, '[data-sx-scene]');
    let step = 0;
    function select(name, label, options) {
      return `<label>${label}<select data-input="${name}">${options.map(([value,text]) => `<option value="${value}">${text}</option>`).join('')}</select></label>`;
    }
    const controls = {
      security: () => select('permission', t('Permiso de envío','Send permission'), [['0',t('Denegado','Denied')],['1',t('Permitido','Allowed')]]),
      agent: () => select('outcome', t('Herramienta','Tool'), [['ok',t('Devuelve estado','Returns status')],['error',t('Falla la consulta','Lookup fails')]]),
      voice: () => select('architecture', t('Arquitectura','Architecture'), [['cascade','Full cascade'],['s2s','Speech-to-speech']]),
      coding: () => select('factor', t('Factor del patch','Patch factor'), [['1.20',t('1,20 · inicial','1.20 · initial')],['1.21',t('1,21 · corregido','1.21 · corrected')]]),
      context: () => `<label>${t('Presupuesto','Budget')}<input type="range" data-input="budget" min="20" max="64" step="4" value="40"><output data-budget-output>40</output> ${t('unidades','units')}</label>`,
      inference: () => select('input',t('Entrada','Input'), [['128','128 tokens'],['512','512 tokens'],['2048','2048 tokens']]) + select('output',t('Salida','Output'), [['16','16 tokens'],['64','64 tokens'],['128','128 tokens']]),
      evaluation: () => select('evidence', t('Qué observas','What you inspect'), [['result',t('Solo resultado','Result only')],['trace',t('Resultado y permisos','Result and permissions')]])
    };
    if (!controls[kind]) return;
    experiment.innerHTML = controls[kind]();
    const value = name => q(experiment, `[data-input="${name}"]`).value;
    function flow(nodes, result) {
      return `<div class="s5-guide-flow">${nodes.map(([title,detail],i) => `<div class="s5-guide-node ${i <= step ? 'is-seen' : ''} ${i === step ? 'is-active' : ''}"><strong>${esc(title)}</strong><small>${esc(detail)}</small></div>`).join('')}</div><div class="s5-guide-result">${esc(result)}</div>`;
    }
    function renderScene() {
      if (kind === 'security') {
        const allowed = value('permission') === '1';
        const result = step < 3 ? t('La propuesta todavía no demuestra un efecto.','A proposal does not yet demonstrate an effect.') : allowed ? t('La acción se ejecuta: el permiso era demasiado amplio para esta tarea.','The action executes: the permission was too broad for this task.') : t('Acción bloqueada por el runtime. No se envían los datos.','Action blocked by the runtime. Data is not sent.');
        return flow([[t('Documento','Document'),t('Contenido no confiable','Untrusted content')],[t('Propuesta','Proposal'),'send(data)'],[t('Runtime','Runtime'),allowed?t('Permiso concedido','Permission granted'):t('Permiso denegado','Permission denied')],[t('Efecto','Effect'),step < 3 ? '—' : allowed?t('Datos enviados','Data sent'):t('Sin envío','No data sent')]],result);
      }
      if (kind === 'agent') {
        const ok = value('outcome') === 'ok';
        return flow([[t('Objetivo','Goal'),t('Consultar P42','Look up P42')],[t('Herramienta','Tool'),'lookup("P42")'],[t('Observación','Observation'),step < 2 ? '—' : ok?t('Estado: enviado','Status: shipped'):'timeout'],[t('Respuesta','Answer'),step < 3 ? '—' : ok?t('P42 está enviado','P42 is shipped'):t('Estado sin confirmar','Status unconfirmed')]],step < 2 ? t('La llamada no es el resultado.','The call is not the result.') : ok?t('Hay evidencia para responder a la pregunta.','There is evidence to answer the question.'):t('Sin evidencia, el agente no puede afirmar que está enviado.','Without evidence, the agent cannot claim the order was shipped.'));
      }
      if (kind === 'voice') {
        const cascade = value('architecture') === 'cascade';
        return flow([[t('Entrada','Input'),t('Audio de la persona','User audio')],[cascade?'STT':t('Modelo audio-nativo','Audio-native model'),cascade?t('Audio → texto','Audio → text'):t('Audio como entrada','Audio input')],[cascade?'LLM + TTS':t('Generación de audio','Audio generation'),cascade?t('Texto → audio','Text → audio'):t('Sin TTS externo obligatorio','No mandatory external TTS')],[t('Reproducción','Playback'),t('Control del runtime','Runtime control')]],t('Escuchar y hablar a la vez es otro eje: no se deduce de esta elección.','Listening and speaking at once is a separate axis: it is not implied by this choice.'));
      }
      if (kind === 'coding') {
        const factor = Number(value('factor')), result = Math.round(100 * factor), passed = result === 121;
        return `<div class="s5-guide-code">${esc(`function total(x) { return Math.round(x * ${factor.toFixed(2)}); }\n\nassert(total(100) === 121);`)}</div>` + flow([[t('Contrato','Contract'),'100 → 121'],['Patch',`× ${factor.toFixed(2)}`],['Test',step < 2 ? t('Pendiente','Pending') : passed?'PASS':'FAIL'],[t('Observado','Observed'),step < 2 ? '—' : `${result}`]],step < 2 ? t('Avanza a verificación para ejecutar la comprobación.','Advance to verification to run the check.') : passed?t('Este caso pasa. No demuestra corrección global.','This case passes. It does not prove global correctness.'):t('120 ≠ 121. Corrige el patch y vuelve a comprobar.','120 ≠ 121. Correct the patch and check again.'));
      }
      if (kind === 'context') {
        const budget = Number(value('budget'));
        q(experiment,'[data-budget-output]').textContent = budget;
        let remaining = budget;
        const items = [[t('Instrucciones','Instructions'),8],[t('Herramientas','Tools'),12],[t('Evidencia','Evidence'),20],[t('Historial','History'),24]];
        const nodes = items.map(([name,size]) => {
          const included = size <= remaining;
          if (included) remaining -= size;
          return [name, `${size} · ${included ? t('incluido','included') : t('fuera','excluded')}`];
        });
        return flow(nodes, `${t('Contexto efectivo','Effective context')}: ${budget-remaining} / ${budget} ${t('unidades. La información excluida no llega al modelo.','units. Excluded information does not reach the model.')}`);
      }
      if (kind === 'inference') {
        const input = Number(value('input')), output = Number(value('output'));
        const queue = .1, prefill = input/512, decode = output/32, ttft = queue+prefill+1/32, total = queue+prefill+decode;
        root.dataset.ttft = ttft.toFixed(5); root.dataset.total = total.toFixed(5);
        return `<div class="s5-guide-stats"><div class="s5-guide-stat"><span>TTFT · ${t('primer token','first token')}</span><strong>${ttft.toFixed(2)} s</strong></div><div class="s5-guide-stat"><span>${t('Respuesta completa','Complete response')}</span><strong>${total.toFixed(2)} s</strong></div></div><div class="s5-guide-track" aria-label="${t('Distribución del tiempo','Time distribution')}"><span style="width:${queue/total*100}%"></span><span style="width:${prefill/total*100}%"></span><span style="width:${decode/total*100}%"></span></div><div class="s5-guide-legend"><span>${t('Cola','Queue')}: 0.10 s</span><span>Prefill: ${prefill.toFixed(2)} s</span><span>Decode: ${decode.toFixed(2)} s</span></div><div class="s5-guide-result">${input} → ${output} tokens · ${t('Tasas ilustrativas, no medidas.','Illustrative rates, not measured.')}</div>`;
      }
      const trace = value('evidence') === 'trace';
      function cases(system) {
        const cells = Array.from({length:10}, (_,i) => {
          const ok = i < (system === 'A' ? 8 : 9), policy = system === 'B' && i === 2;
          const state = trace && policy ? 'policy' : ok ? 'ok' : 'bad';
          const label = state === 'policy' ? t('permiso incumplido','permission violated') : ok?t('correcto','correct'):t('incorrecto','incorrect');
          return `<span class="s5-guide-case" data-state="${state}" title="${i+1}: ${label}" aria-label="${i+1}: ${label}">${state === 'policy' ? '!' : ok ? '✓' : '×'}</span>`;
        }).join('');
        return `<strong>${t('Sistema','System')} ${system}</strong><div class="s5-guide-cases">${cells}</div>`;
      }
      return cases('A') + cases('B') + `<div class="s5-guide-result">${trace ? t('A: 8/10 · B: 8/10 cumplen resultado y permisos. ! = permiso incumplido.','A: 8/10 · B: 8/10 satisfy correctness and permissions. ! = permission violated.') : t('A: 8/10 · B: 9/10 respuestas correctas. Los permisos aún no se han evaluado.','A: 8/10 · B: 9/10 correct answers. Permissions have not yet been assessed.')}</div>`;
    }
    function render() {
      qa(root,'[data-sx-step]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.sxStep) === step)));
      q(root,'[data-sx-step-label]').textContent = `${t('Paso','Step')} ${step+1} / ${data.steps.length}`;
      q(root,'[data-sx-title]').textContent = data.steps[step][0];
      q(root,'[data-sx-copy]').textContent = data.steps[step][1];
      q(root,'[data-sx-prev]').disabled = step === 0;
      q(root,'[data-sx-next]').disabled = step === data.steps.length-1;
      scene.innerHTML = renderScene();
      root.dataset.activeStep = String(step);
    }
    qa(root,'[data-sx-step]').forEach(button => button.addEventListener('click', () => { step = Number(button.dataset.sxStep); render(); }));
    q(root,'[data-sx-prev]').addEventListener('click', () => { step = Math.max(0,step-1); render(); });
    q(root,'[data-sx-next]').addEventListener('click', () => { step = Math.min(data.steps.length-1,step+1); render(); });
    q(root,'[data-sx-reset]').addEventListener('click', () => {
      step = 0;
      qa(experiment,'select').forEach(select => { select.selectedIndex = 0; });
      qa(experiment,'input').forEach(input => { input.value = input.defaultValue; });
      render();
    });
    experiment.addEventListener('input', render);
    experiment.addEventListener('change', render);
    render();
  }
  function init() {
    qa(document,'[data-sx-hub]').forEach(enhanceHub);
    qa(document,'[data-sx-guide]').forEach(enhanceGuide);
  }
  if (typeof document$ !== 'undefined') document$.subscribe(init);
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
