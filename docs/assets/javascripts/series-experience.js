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

  function sceneFor(data, step, alternative) {
    const en=data.locale==='en'; const t=(es,eng)=>en?eng:es;
    const v=data.view; const s=step; const alt=!!alternative;
    const tag=(text,cl='')=>`<span class="sx-tag ${cl}">${esc(text)}</span>`;
    const box=(label,body,index,cl='')=>`<div class="sx-object ${index===s?'is-active':''} ${index<=s?'is-observed':''} ${cl}" data-object="${index}"><span class="sx-object-label">${esc(label)}</span>${body}</div>`;
    const arrow='<span class="sx-transfer" aria-hidden="true">→</span>';
    const result=(label,body,good=true)=>`<div class="sx-outcome ${good?'':'is-warning'}" data-sx-result><span>${esc(label)}</span><strong>${esc(body)}</strong></div>`;
    const dots=(count,filled)=>`<span class="sx-budget-dots">${Array.from({length:count},(_,i)=>`<i class="${i<filled?'is-used':''}">${i+1}</i>`).join('')}</span>`;
    const wave=(start=0)=>`<svg class="sx-wave" viewBox="0 0 440 58" aria-hidden="true">${Array.from({length:42},(_,i)=>{const h=7+((i*13+start*9)%24);return `<path d="M${i*10+8} ${29-h}v${h*2}"/>`;}).join('')}</svg>`;
    const flow=(items)=>`<div class="sx-causal-flow">${items.map((x,i)=>x+(i<items.length-1?`<span class="sx-transfer ${i===s-1?'is-crossing':''}" aria-hidden="true">→</span>`:'')).join('')}</div>`;

    // The order example is a conversation plus an observable tool result, not four generic cards.
    if (v === 'order') {
      const known=s>=2&&!alt;
      const answer=alt?t('No he podido confirmar el estado del pedido.','I could not confirm the order status.'):t('El pedido 1842 está enviado.','Order 1842 has shipped.');
      return `<div class="sx-order-scene"><div class="sx-order-conversation"><span class="sx-object-label">${t('CONVERSACIÓN','CONVERSATION')}</span><div class="sx-order-message"><small>${t('Persona','Person')}</small><blockquote>${t('¿Dónde está mi pedido 1842?','Where is my order 1842?')}</blockquote></div><div class="sx-order-answer ${s>=3?'is-delivered':''}"><small>${t('Respuesta del asistente','Assistant reply')}</small><p>${s>=3?answer:t('Primero necesita consultar el estado.','The status must be checked first.')}</p></div></div><div class="sx-order-bridge ${s===1?'is-requesting':''} ${s>=2?'is-returning':''}" aria-hidden="true"><span>→</span><i></i><span>←</span></div><div class="sx-order-system"><span class="sx-object-label">${t('SISTEMA DE PEDIDOS · EJEMPLO','ORDER SYSTEM · EXAMPLE')}</span><div class="sx-order-call"><span>${s>=1?t('Consulta enviada','Query sent'):t('Consulta pendiente','Query pending')}</span><code>lookup({ order_id: 1842 })</code></div><div class="sx-order-evidence ${s>=2&&alt?'is-failed':''}" data-sx-order-evidence><div class="sx-package" aria-hidden="true">${s>=2&&alt?'?':'1842'}</div><div><small>${s<2?t('Evidencia todavía no recibida','Evidence not received yet'):alt?t('Error de la herramienta','Tool error'):t('Respuesta de la herramienta','Tool response')}</small><strong>${s<2?'—':alt?'timeout':t('Enviado','Shipped')}</strong>${known?'<code>{ "status": "shipped" }</code>':''}</div></div><ol class="sx-delivery-track" aria-label="${t('Estado confirmado del pedido','Confirmed order state')}">${[t('Recibido','Received'),t('Preparado','Packed'),t('Enviado','Shipped')].map((label,i)=>`<li class="${known?'is-confirmed':''}"><b>${known?'✓':i+1}</b><span>${label}</span></li>`).join('')}</ol><p class="sx-mini-note">${s>=2&&alt?t('Sin dato confirmado: no se puede afirmar que esté enviado.','No confirmed data: shipment cannot be asserted.'):t('El estado procede de la consulta, no de una suposición.','The status comes from the query, not an assumption.')}</p></div></div>${result(t('Conclusión apoyada por la evidencia','Evidence-supported conclusion'),s>=3?answer:t('Avanza hasta recibir el resultado de la consulta.','Advance until the query result arrives.'),!alt)}`;
    }
    if (v === 'voice-turn') {
      const phrase=alt?t('¿Dónde está mi pedido?','Where is my order?'):t('Quiero cambiar… la fecha de entrega.','I want to change… the delivery date.');
      return `<div class="sx-turn-scene"><div class="sx-turn-axis"><span>0</span><span>400</span><span>700</span><span>1.000 ms</span></div><div class="sx-turn-lane"><div class="sx-timeline-label"><span>${t('Persona','Person')}</span><blockquote>${phrase}</blockquote></div><div class="sx-turn-track"><div class="sx-turn-segment is-person" style="left:0;width:40%">${wave(1)}</div><span class="sx-turn-silence" style="left:40%;width:30%">${t('Pausa','Pause')}</span>${s>=2&&!alt?`<div class="sx-turn-segment is-person is-returned" style="left:70%;width:30%">${wave(2)}</div>`:''}<i class="sx-turn-cursor" style="left:${[8,40,65,99][s]}%"></i></div></div><div class="sx-turn-lane"><div class="sx-timeline-label"><span>${t('Agente','Agent')}</span><strong>${s<2?t('Escucha','Listening'):alt?t('Puede responder en este caso','Can answer in this case'):t('Espera: la persona continúa','Wait: the person continues')}</strong></div><div class="sx-turn-track is-agent">${s>=3&&alt?`<div class="sx-turn-segment is-answer" style="left:70%;width:30%">${wave(4)}</div>`:`<span class="sx-turn-hold">${t('No hay audio reproducido','No audio played')}</span>`}<i class="sx-turn-cursor" style="left:${[8,40,65,99][s]}%"></i></div></div><div class="sx-turn-decision ${s>=2?(alt?'is-ready':'is-holding'):''}"><span>${t('Decisión del ejemplo','Example decision')}</span><strong>${s<2?t('Una pausa no basta para decidir.','A pause alone is insufficient.'):alt?t('Fin de turno confirmado en este caso.','End of turn confirmed in this case.'):t('La continuación cambia la decisión: seguir escuchando.','Continuation changes the decision: keep listening.')}</strong></div></div>${result(t('Efecto observable','Observable effect'),s<3?t('Avanza y observa quién habla después de la pausa.','Advance and observe who speaks after the pause.'):alt?t('La respuesta comienza después del turno de la persona.','The reply starts after the person’s turn.'):t('Responder durante esa pausa habría interrumpido la petición.','Answering during that pause would have interrupted the request.'))}<p class="sx-mini-note">${t('Tiempos y ondas ilustrativos. No se ejecuta un detector de turnos ni se reproduce audio.','Illustrative timing and waves. No turn detector runs and no audio is played.')}</p>`;
    }
    if (['order','identity','agent-eval','budget','agent-safety'].includes(v)) {
      if (v==='budget') {
        const budget=alt?4:2, attempts=Math.min(s,budget), closed=s>=budget;
        return `<div class="sx-task-label">${t('TAREA · consultar pedido 1842','TASK · look up order 1842')}</div><div class="sx-attempts">${Array.from({length:4},(_,i)=>`<div class="${i<attempts?'is-failed':''} ${i>=budget?'is-disabled':''}"><span>${t('Intento','Attempt')} ${i+1}</span><strong>${i<attempts?'timeout':i>=budget?t('Fuera del presupuesto','Outside budget'):t('Pendiente','Pending')}</strong></div>`).join('')}</div>${dots(budget,attempts)}${result(t('Estado del runtime','Runtime state'),closed?t('Presupuesto agotado. Detener y comunicar.','Budget exhausted. Stop and report.'):t('Aún queda presupuesto; no hay estado confirmado.','Budget remains; status is unconfirmed.'),!closed)}`;
      }
      if (v==='agent-eval') return `<div class="sx-task-label">${t('OBJETIVO · guardar un borrador','GOAL · save a draft')}</div><div class="sx-comparison"><div><h3>${t('Ejecución A','Run A')}</h3><blockquote>“${t('Borrador listo','Draft ready')}”</blockquote><div class="sx-storage">${s>=2?tag(t('Borrador guardado','Draft saved'),'is-good'):t('Estado no inspeccionado','State not inspected')}</div></div><div><h3>${t('Ejecución B','Run B')}</h3><blockquote>“${t('Borrador listo','Draft ready')}”</blockquote><div class="sx-storage">${s>=2?tag(t('Almacén vacío','Storage empty'),'is-bad'):t('Estado no inspeccionado','State not inspected')}</div></div></div>${result(t('Evaluación elegida','Chosen evaluation'),s<3?t('Avanza para emitir el veredicto.','Advance to issue a verdict.'):alt?t('A cumple el objetivo; B no guardó el borrador.','A meets the goal; B did not save the draft.'):t('El texto no distingue A de B.','The text does not distinguish A from B.'),alt)}`;
      const ambiguous=v==='identity' && alt;
      const unsafe=v==='agent-safety' && alt;
      const failed=v==='order' && alt;
      const request=v==='agent-safety'?t('Envía el borrador a Ana.','Send the draft to Ana.'):v==='identity'?t('¿Dónde está el pedido de Ana?','Where is Ana’s order?'):t('¿Dónde está mi pedido 1842?','Where is my order 1842?');
      const call=ambiguous?'resolve_name({ name: "Ana" })':v==='agent-safety'?`send({ recipient: "${alt?'external':'Ana'}" })`:'lookup({ order_id: 1842 })';
      const observation=failed?'timeout':ambiguous?t('2 coincidencias · falta ID','2 matches · ID missing'):v==='agent-safety'?alt?t('Destinatario externo propuesto','External recipient proposed'):t('Destinatario validado: Ana','Validated recipient: Ana'):t('Estado: enviado','Status: shipped');
      const answer=failed?t('No he podido confirmar el estado.','I could not confirm the status.'):ambiguous?t('¿Puedes confirmar el identificador?','Can you confirm the identifier?'):v==='agent-safety'?unsafe?t('Envío fuera de permiso.','Send outside permission.'):t('Solo se permite enviar a Ana.','Sending is permitted only to Ana.'):t('El pedido 1842 está enviado.','Order 1842 has shipped.');
      return flow([box(t('Petición','Request'),`<blockquote>${esc(request)}</blockquote>`,0,'sx-person'),box(t('Herramienta','Tool'),`<code>${esc(call)}</code><span class="sx-operation">${s>=1?t('Solicitud emitida','Request issued'):t('Todavía sin ejecutar','Not executed yet')}</span>`,1),box(t('Observación','Observation'),s>=2?tag(observation,failed||ambiguous||unsafe?'is-bad':'is-good'):`<span class="sx-pending">${t('Sin evidencia todavía','No evidence yet')}</span>`,2),box(t('Resultado','Result'),`<p>${s>=3?esc(answer):t('Esperando la observación','Waiting for observation')}</p>`,3)])+result(t('Lo que sabemos','What we know'),s>=3?answer:s>=2?observation:t('La tarea aún no está resuelta.','The task is not yet resolved.'),!(failed||ambiguous||unsafe));
    }
    if(v==='refusal') {
      return `<div class="sx-comparison"><div><h3>${t('Canal de respuesta','Response channel')}</h3><blockquote>${s>=1?t('«No puedo proporcionar ese contenido».','“I cannot provide that content.”'):t('Respuesta pendiente','Response pending')}</blockquote>${tag(t('La respuesta se rechaza en ambos casos','The response is refused in both cases'),'is-good')}</div><div><h3>${t('Canal de herramientas','Tool channel')}</h3><code>write_record(data)</code><div class="sx-scope-wall ${alt?'is-open':''}">${s>=2?(alt?t('Sin comprobación de permiso','No permission check'):t('Permiso denegado','Permission denied')):t('Propuesta pendiente','Proposal pending')}</div><strong>${s>=3?(alt?t('Registro modificado','Record changed'):t('Registro sin modificar','Record unchanged')):'—'}</strong></div></div>${result(t('Dos fronteras distintas','Two distinct boundaries'),s<3?t('Sigue ambos canales, no solo el texto.','Follow both channels, not only text.'):alt?t('Rechazar el texto no impidió el efecto de la herramienta.','Refusing the text did not prevent the tool effect.'):t('La respuesta y la acción tienen controles separados.','The response and action have separate controls.'),!alt)}`;
    }
    if (['trust','refusal','poison','permissions','agent-safety'].includes(v)) {
      const poison=v==='poison', refusal=v==='refusal';
      const accepted=alt;
      const effect=poison?t('Referencia contaminada disponible para recuperar','Contaminated reference available for retrieval'):t('Acción sensible ejecutada sin la comprobación','Sensitive action executed without the check');
      return `<div class="sx-trust-label"><span>${t('DATOS EXTERNOS','EXTERNAL DATA')}</span><strong>${t('No aportan permisos','Do not grant permission')}</strong></div><div class="sx-trust-flow">${box(t('Documento','Document'),`<div class="sx-paper"><i></i><i></i><mark>${poison?t('Cambiar dato de referencia','Change reference fact'):t('Enviar a otro destinatario','Send to another recipient')}</mark><i></i></div>`,0)}${arrow}${box(poison?t('Ingreso','Ingestion'):t('Propuesta del modelo','Model proposal'),`<code>${poison?'store(source)':refusal?'tool.write(data)':'send(data, recipient)'}</code>`,1)}<div class="sx-boundary ${s>=2?(accepted?'is-open':'is-closed'):''}"><span>${poison?t('VALIDACIÓN','VALIDATION'):t('PERMISO','PERMISSION')}</span><b>${s>=2?(accepted?'→':'⊣'):'?'}</b><small>${s>=2?(accepted?t('No comprobado','Unchecked'):t('Comprobado','Checked')):t('Pendiente','Pending')}</small></div>${box(t('Efecto','Effect'),`<div class="sx-storage">${s>=3?tag(accepted?t('Estado modificado','State changed'):t('Sin cambio permitido','No change permitted'),accepted?'is-bad':'is-good'):t('Sin efecto observado','No effect observed')}</div>`,3)}</div>${result(t('Resultado de este caso','Result of this case'),s<3?t('Sigue el recorrido hasta el efecto.','Follow the path to the effect.'):accepted?effect:poison?t('Fuente separada; no se recupera como referencia válida.','Source separated; not retrieved as a valid reference.'):t('La comprobación bloquea esta acción.','The check blocks this action.'),!accepted)}`;
    }
    if (data.kind==='coding') {
      if (['code-test','code-verifier'].includes(v)) {
        const edge=v==='code-verifier', corrected=!edge&&alt;
        const got=corrected?2+3:2-3;
        const pass=edge?!alt:corrected;
        return `<div class="sx-code-layout"><div class="sx-file"><div class="sx-file-title">${edge?'first_item.py':'calculator.py'} <span>${t('Cambio propuesto','Proposed change')}</span></div><pre><span class="sx-line-number">1</span> def ${edge?'first(items)':'add(a, b)'}:\n<del><span class="sx-line-number">2</span>     ${edge?'return None':'return a - b'}</del><ins><span class="sx-line-number">2</span>     ${edge?'return items[0]':`return a ${corrected?'+':'-'} b`}</ins></pre><span class="sx-meta">${t('Código ilustrativo; no ejecuta código arbitrario.','Illustrative code; no arbitrary code execution.')}</span></div><div class="sx-terminal"><span class="sx-meta">${t('Comprobación determinista','Deterministic check')}</span><code>${edge?(alt?'first([])':'first([7, 8])'):'add(2, 3)'}</code><div class="sx-test-row">${t('Esperado','Expected')}<strong>${edge?(alt?'None':'7'):'5'}</strong></div><div class="sx-test-row">${t('Observado','Observed')}<strong>${s<2?'—':edge?(alt?'IndexError':'7'):got}</strong></div><div class="sx-test-verdict ${s>=2?(pass?'is-pass':'is-fail'):''}">${s<2?t('Test pendiente','Test pending'):pass?'PASS':'FAIL'}</div></div></div>${result(t('Conclusión','Conclusion'),s<3?t('Inspecciona el diff y ejecuta la comprobación.','Inspect the diff and run the check.'):pass?t('Este caso pasa. Faltan los demás casos del contrato.','This case passes. Other contract cases remain.'):t('El caso falla: revisar antes de aceptar el cambio.','The case fails: review before accepting the change.'),pass)}`;
      }
      if (['code-workspace','code-permissions'].includes(v)) return `<div class="sx-workspace"><div class="sx-file-tree"><h3>${t('Ámbito de la tarea','Task scope')}</h3><div>workspace/</div><div class="is-in"> ├─ src/calculator.py</div><div class="is-in"> └─ tests/test_add.py</div><div class="is-out">../private/config</div></div><div class="sx-command"><span class="sx-meta">${t('Propuesta','Proposal')}</span><code>write('../private/config')</code><div class="sx-scope-wall ${alt?'is-open':''}">${s>=2?(alt?t('Fuera de ámbito · permitido','Out of scope · permitted'):t('Fuera de ámbito · bloqueado','Out of scope · blocked')):t('Pendiente de permiso','Permission pending')}</div><span>${t('Una propuesta no demuestra autorización.','A proposal does not establish authorization.')}</span></div></div>${result(t('Estado del archivo externo','External file state'),s>=3&&alt?t('Modificado fuera del ámbito de la tarea.','Changed outside the task scope.'):t('Sin modificar.','Unchanged.'),!alt)}`;
      const checkpoint=v==='code-checkpoint';
      return `<div class="sx-task-label">${checkpoint?t('Recuperación de una tarea','Task recovery'):t('Contrato de cierre','Completion contract')}</div><div class="sx-checkpoints">${[t('Preparar diff','Prepare diff'),t('Ejecutar tests','Run tests'),t('Guardar evidencia','Save evidence')].map((label,i)=>`<div class="${s>i&&!alt?'is-verified':''}"><b>${i+1}</b><strong>${label}</strong><span>${s>i?alt?t('Sin evidencia','No evidence'):t('Verificado','Verified'):t('Pendiente','Pending')}</span></div>`).join('')}</div><div class="sx-durable"><span>${t('ESTADO RECUPERABLE','RECOVERABLE STATE')}</span><code>${s>=2&&!alt?'revision: r2 | tests: PASS':t('No hay checkpoint verificado','No verified checkpoint')}</code></div>${result(t('Continuación segura en el ejemplo','Safe continuation in the example'),s>=3&&!alt?t('Retomar la revisión r2 y su evidencia.','Resume revision r2 with its evidence.'):t('Comprobar el estado antes de continuar.','Check state before continuing.'),!alt)}`;
    }
    if (data.kind==='context') {
      if(v==='context-mcp') return flow([box('Host',`<strong>${t('Aplicación','Application')}</strong><p>${t('Define la tarea y los permisos.','Defines task and permissions.')}</p>`,0),box(t('Cliente MCP','MCP client'),'<code>tools/call</code><p>write_record</p>',1),box(t('Servidor MCP','MCP server'),`<code>{ name, arguments }</code><p>${t('Capacidad descubierta','Discovered capability')}</p>`,2),box(t('Escritura','Write'),s>=3?tag(alt?t('Sin permiso · bloqueada','No permission · blocked'):t('Permiso explícito · autorizada','Explicit permission · authorized'),alt?'is-bad':'is-good'):t('Pendiente','Pending'),3)])+result(t('Conexión ≠ autorización','Connection ≠ authorization'),s<3?t('Avanza hasta la comprobación de permiso.','Advance to the permission check.'):alt?t('La conexión funciona; la escritura no está autorizada.','The connection works; the write is not authorized.'):t('Esta escritura tiene permiso explícito.','This write has explicit permission.'),!alt);
      const budget=v==='context-budget'; const memory=v==='context-memory'; const retrieval=v==='context-retrieval';const isolate=v==='context-isolation';
      const limit=budget?(alt?3:6):(alt?6:4);
      let docs=[{id:'task',name:t('Tarea actual','Current task'),size:1,info:t('Pregunta sobre devoluciones','Question about returns')},{id:'current',name:t('Política vigente','Current policy'),size:2,info:t('30 días · versión 2','30 days · version 2')},{id:'old',name:t('Política anterior','Old policy'),size:2,info:t('14 días · versión 1','14 days · version 1')},{id:'noise',name:t('Otra actividad','Other activity'),size:1,info:t('No necesaria aquí','Not needed here')}];
      if(memory) docs=[{id:'task',name:t('Turno 2','Turn 2'),size:1,info:t('Nueva petición','New request')},{id:'current',name:t('Preferencia guardada','Saved preference'),size:2,info:t('Del turno 1','From turn 1')},{id:'old',name:t('Mensaje del turno 1','Turn 1 message'),size:2,info:t('Solo temporal','Temporary only')},{id:'noise',name:t('Otro historial','Other history'),size:1,info:t('Fuera de esta tarea','Outside this task')}];
      let chosen=memory?(alt?['task']:['task','current']):retrieval?(alt?['task','old']:['task','current']):budget?(alt?['task','current']:['task','current','old','noise']):alt?docs.map(d=>d.id):['task','current'];
      if(s===0)chosen=[];
      const used=docs.filter(d=>chosen.includes(d.id)).reduce((a,d)=>a+d.size,0);
      const outcome=budget?(used>limit?t(`La selección ocupa ${used} de ${limit} bloques: no cabe; hay que reducirla.`,`The selection uses ${used} of ${limit} blocks: it does not fit; reduce it.`):t(`La selección usa ${used} de ${limit} bloques y cabe en el presupuesto.`,`The selection uses ${used} of ${limit} blocks and fits the budget.`)):memory?(alt?t('La preferencia no se conservó para este turno.','The preference was not retained for this turn.'):t('La preferencia se conserva y se recupera explícitamente.','The preference is explicitly stored and retrieved.')):retrieval?(alt?t('Se seleccionó la versión antigua: 14 días.','The old version was selected: 14 days.'):t('Se seleccionó la versión vigente: 30 días.','The current version was selected: 30 days.')):alt&&!budget?t('También entra información innecesaria o contradictoria.','Unnecessary or conflicting information is also included.'):t('La tarea y la evidencia relevante llegan a la entrada.','The task and relevant evidence reach the input.');
      return `<div class="sx-context-layout"><div class="sx-source-stack"><h3>${t('Información disponible','Available information')}</h3>${docs.map(d=>`<div class="sx-source ${chosen.includes(d.id)?'is-selected':''}"><span>${chosen.includes(d.id)?'✓':'—'}</span><div><strong>${esc(d.name)}</strong><small>${esc(d.info)}</small></div>${budget?`<b>${d.size}</b>`:''}</div>`).join('')}</div><div class="sx-context-gate">${isolate?t('DELEGAR','DELEGATE'):t('SELECCIONAR','SELECT')}<span aria-hidden="true">→</span></div><div class="sx-context-window"><h3>${isolate?t('Entrada del subagente','Subagent input'):budget?t('Selección propuesta','Proposed selection'):t('Entrada efectiva','Effective input')}</h3><div class="sx-context-slots">${s>=2?docs.filter(d=>chosen.includes(d.id)).map(d=>`<div class="sx-context-token ${d.id==='old'?'is-stale':''}"><strong>${esc(d.name)}</strong><span>${esc(d.info)}</span></div>`).join(''):`<span class="sx-pending">${t('Todavía sin ensamblar','Not assembled yet')}</span>`}</div>${budget?`<div class="sx-context-capacity"><progress value="${s>=2?used:0}" max="${limit}"></progress><span>${s>=2?used:0} / ${limit} ${t('bloques didácticos','educational blocks')}</span></div>`:''}</div></div>${result(t('Consecuencia','Consequence'),s>=3?outcome:t('Observa qué cruza la frontera de selección.','Observe what crosses the selection boundary.'),!(budget ? used>limit : alt&&(memory||retrieval||isolate)))}`;
    }
    if(data.kind==='voice') {
      if(v==='voice-eval') {
        const inspected=s>=2;
        const metrics=[{name:t('Primer audio','First audio'),a:'280 ms',b:'190 ms'}, {name:t('Interrupción respetada','Interruption respected'),a:t('Sí','Yes'),b:t('No','No')}, {name:t('Acción confirmada','Action confirmed'),a:t('Sí','Yes'),b:t('No','No')}];
        return `<div class="sx-task-label">${t('DOS LLAMADAS SINTÉTICAS · mismo objetivo','TWO SYNTHETIC CALLS · same goal')}</div><div class="sx-comparison"><div><h3>${t('Llamada A','Call A')}</h3>${metrics.map((m,i)=>`<div class="sx-test-row ${i>0&&!alt?'sx-unexamined':''}"><span>${esc(m.name)}</span><strong>${inspected&&(alt||i===0)?esc(m.a):'—'}</strong></div>`).join('')}</div><div><h3>${t('Llamada B','Call B')}</h3>${metrics.map((m,i)=>`<div class="sx-test-row ${i>0&&!alt?'sx-unexamined':''}"><span>${esc(m.name)}</span><strong>${inspected&&(alt||i===0)?esc(m.b):'—'}</strong></div>`).join('')}</div></div>${result(t('Criterio seleccionado','Selected criterion'),s<3?t('Avanza para comparar las evidencias.','Advance to compare evidence.'):alt?t('A cumple estos criterios; B es más rápida, pero falla en turno y acción.','A meets these criteria; B is faster but fails turn and action checks.'):t('B empieza antes. Esto no demuestra éxito de la llamada.','B starts sooner. This does not establish call success.'),alt)}`;
      }

      if(v==='voice-architecture') {
        const labels=alt?[t('Audio de entrada','Input audio'),t('Modelo de audio','Audio model'),t('Audio generado','Generated audio'),t('Reproducción','Playback')]:['ASR',t('Modelo de texto','Text model'),'TTS',t('Reproducción','Playback')];
        return `<div class="sx-task-label">${alt?t('RUTA · AUDIO NATIVO','PATH · NATIVE AUDIO'):t('RUTA · CASCADA','PATH · CASCADE')}</div><div class="sx-audio-source">${wave()}</div>${flow(labels.map((l,i)=>box(l,`<div class="sx-sound-chunks">${Array.from({length:i===3&&s<3?0:5},(_,j)=>`<i style="--h:${14+(i*9+j*11)%29}px"></i>`).join('')}</div><span>${i<=s?t('Etapa observada','Observed stage'):t('Pendiente','Pending')}</span>`,i)))}${result(t('Lo que oye la persona','What the person hears'),s<3?t('Aún no se ha reproducido la respuesta.','The response has not played yet.'):t('La salida llega después del transporte y la reproducción.','Output arrives after transport and playback.'))}`;
      }
      const interruption=v==='voice-interrupt';const turn=v==='voice-turn';const network=v==='voice-network';
      const first=260,model=alt&&v==='voice-latency'?430:220,audio=120;
      const total=first+model+audio;
      if(v==='voice-latency')return `<div class="sx-timing-header"><span>${t('FIN DE TURNO → PRIMER SONIDO','END OF TURN → FIRST SOUND')}</span><strong>${s>=3?total:'—'} <small>ms</small></strong></div><div class="sx-time-bars">${[[t('Decisión de turno','Turn decision'),first],[t('Modelo + transporte','Model + transport'),model],[t('Audio y reproducción','Audio and playback'),audio]].map(([name,ms],i)=>`<div><span>${esc(name)}</span><div class="sx-time-bar"><i style="width:${ms/7}%" class="${s>i?'is-seen':''}"></i></div><strong>${s>i?ms:'—'} ms</strong></div>`).join('')}</div><p class="sx-mini-note">${first} + ${model} + ${audio} = ${total} ms · ${t('valores sintéticos, sin solapamiento en este ejemplo','synthetic values, no overlap in this example')}</p>${result(t('Presupuesto ilustrativo','Illustrative budget'),s>=3?t(`La espera adicional añade ${alt?210:0} ms a este recorrido.`,`The additional wait adds ${alt?210:0} ms to this path.`):t('Avanza para sumar las fases observadas.','Advance to sum the observed phases.'))}`;
      const speaker=turn?(alt?t('¿Dónde está mi pedido?','Where is my order?'):t('Quiero cambiar… la fecha de entrega.','I want to change… the delivery date.')):t('Un momento, prefiero otra opción.','One moment, I prefer another option.');
      const queue=interruption?(s>=2?(alt?['A','B','C']:[]):['A','B','C']):network?(s>=2?(alt?['C','A','B']:['A','B','C']):[]):['A','B','C'];
      const outcome=interruption?(alt?t('Se cancela la generación, pero quedan 3 fragmentos por reproducir.','Generation stops, but 3 chunks remain queued.'):t('Se cancela y se vacía la cola: no quedan fragmentos pendientes.','Generation stops and the queue is cleared: no chunks remain.')):turn?(alt?t('El turno termina antes de iniciar la respuesta.','The turn ends before the reply starts.'):t('La persona continúa: responder en la pausa la interrumpiría.','The speaker continues: responding in the pause would interrupt.')):network?(alt?t('Llegada C, A, B: el buffer necesita reordenar y esperar.','Arrival C, A, B: the buffer needs to reorder and wait.'):t('Llegada regular A, B, C en este ejemplo.','Regular arrival A, B, C in this example.')):t('Primer audio: rápido. Revisa también interrupción y resultado de la acción.','First audio: fast. Also inspect interruption and action outcome.');
      return `<div class="sx-timeline"><div class="sx-timeline-label"><span>${t('Persona','Person')}</span><blockquote>${esc(speaker)}</blockquote></div><div class="sx-wave-track">${wave(1)}<span class="sx-pause-zone">${t('Pausa','Pause')}</span><i class="sx-playhead" style="left:${12+s*25}%"></i></div><div class="sx-timeline-label"><span>${t('Agente','Agent')}</span><strong>${s<2?t('Generando','Generating'):interruption?t('Generación cancelada','Generation cancelled'):t('Respuesta disponible','Response available')}</strong></div><div class="sx-wave-track sx-agent-wave ${interruption&&s>=2?'is-cancelled':''}">${wave(4)}<i class="sx-playhead" style="left:${12+s*25}%"></i></div><div class="sx-audio-buffer"><span>${network?t('Orden de llegada','Arrival order'):t('Cola de reproducción','Playback queue')}</span><div>${queue.map(c=>`<b>${c}</b>`).join('')||`<em>${t('Vacía','Empty')}</em>`}</div><strong>${queue.length} ${t('fragmentos','chunks')}</strong></div></div>${result(t('Efecto observable','Observable effect'),s>=3?outcome:t('Avanza por los eventos de la conversación.','Step through the conversation events.'),!(alt&&interruption))}`;
    }
    if(data.kind==='inference') {
      if(v==='infer-quant') {
        const levels=alt?4:8,value=.61,rounded=Math.round(value*(levels-1))/(levels-1),error=Math.abs(value-rounded);
        return `<div class="sx-number-scale"><div class="sx-quant-labels"><span>${t('Valor original','Original value')} <b>0.610</b></span><span>${levels} ${t('niveles','levels')}</span></div><div class="sx-scale-track">${Array.from({length:levels},(_,i)=>`<i style="left:${i/(levels-1)*100}%"><span>${(i/(levels-1)).toFixed(2)}</span></i>`).join('')}<b class="sx-original-point" style="left:61%">●</b>${s>=2?`<b class="sx-quant-point" style="left:${rounded*100}%">◆</b>`:''}</div><div class="sx-metric-pair"><div><span>${t('Representado','Represented')}</span><strong>${s>=2?rounded.toFixed(3):'—'}</strong></div><div><span>${t('Error absoluto','Absolute error')}</span><strong>${s>=3?error.toFixed(3):'—'}</strong></div></div></div>${result(t('Límite de esta demostración','Limit of this demonstration'),t('El error numérico no es una medida de calidad del modelo.','Numeric error is not a measure of model quality.'))}`;
      }
      if(['infer-cache','infer-prefix'].includes(v)) {
        const prefix=v==='infer-prefix';const reused=alt?2:5;
        return `<div class="sx-token-rack"><div><span>${prefix?t('Petición A','Request A'):t('Tokens procesados','Processed tokens')}</span><div>${['A','B','C','D','E'].map(x=>`<b>${x}</b>`).join('')}</div></div><div class="sx-kv-row"><span>${t('Estado disponible','Available state')}</span><div>${Array.from({length:5},(_,i)=>`<b class="${s>=1?'is-cached':''}">K${i+1}<small>V${i+1}</small></b>`).join('')}</div></div><div><span>${prefix?t('Petición B','Request B'):t('Nuevo paso','New step')}</span><div>${(prefix?alt?['A','B','X','D','E']:['A','B','C','D','E']:['A','B','C','D','E','F']).map((x,i)=>`<b class="${s>=2&&i<(prefix?reused:alt?0:5)?'is-reused':''}">${x}</b>`).join('')}</div></div></div>${result(t('Reutilización en el ejemplo','Reuse in this example'),s<3?t('Avanza para comparar el estado disponible.','Advance to compare available state.'):prefix?t(`${reused} posiciones de prefijo coinciden antes del primer cambio.`,`${reused} prefix positions match before the first change.`):alt?t('Sin reutilización: el ejemplo vuelve a procesar el contexto.','No reuse: the example reprocesses context.'):t('Se consulta KV existente y se añade el estado del token F.','Existing KV is consulted and state for token F is added.'))}`;
      }
      if(v==='infer-routing') return `<div class="sx-routing"><div class="sx-route-task">${tag(alt?t('Requiere comprobación','Requires verification'):t('Transformación simple','Simple transformation'))}</div><div class="sx-route-branches"><div class="${s>=2&&!alt?'is-chosen':''}"><span>${t('Ruta directa','Direct route')}</span><strong>1 ${t('unidad','unit')}</strong><small>${t('Sin verificador adicional','No extra verifier')}</small></div><div class="${s>=2&&alt?'is-chosen':''}"><span>${t('Ruta con verificador','Verified route')}</span><strong>3 ${t('unidades','units')}</strong><small>${t('Incluye una comprobación','Includes a check')}</small></div></div></div>${result(t('Regla didáctica','Educational rule'),s>=3?(alt?t('El requisito selecciona la ruta con comprobación.','The requirement selects the verified route.'):t('La tarea simple sigue la ruta directa.','The simple task follows the direct route.')):t('El coste aislado no decide si se cumple la tarea.','Cost alone does not decide whether the task is met.'))}`;
      if(v==='infer-benchmark') {
        const a=[130,160,180,220,270], b=alt?[55,70,80,100,130]:[145,170,190,210,250];
        const row=(label,values)=>`<div class="sx-distribution"><span>${esc(label)}</span><div>${values.map((x,i)=>`<i style="left:${x/3.2}%;top:${12+i%2*22}px">${s>=2?x:'·'}</i>`).join('')}</div></div>`;
        return `<div class="sx-task-label">${alt?t('CARGAS DIFERENTES · no comparar como si fueran iguales','DIFFERENT WORKLOADS · do not treat as equal'):t('MISMA CARGA · comparar bajo las mismas condiciones','SAME WORKLOAD · compare under matched conditions')}</div>${row('A',a)}${row('B',b)}<p class="sx-mini-note">ms · ${t('5 ejecuciones sintéticas por grupo','5 synthetic runs per group')}</p>${result(t('Comparabilidad','Comparability'),alt?t('La diferencia incluye un cambio de carga.','The difference includes a workload change.'):t('Las condiciones de carga están igualadas en el ejemplo.','Workload conditions are matched in the example.'),!alt)}`;
      }
      const input=alt?12:4,prefill=input*40, decode=4*90,total=120+prefill+decode;
      return `<div class="sx-infer-header"><span>${t('Petición ilustrativa','Illustrative request')}</span><strong>${input} ${t('bloques de entrada','input blocks')} → 4 ${t('de salida','output blocks')}</strong></div><div class="sx-token-line"><span>${t('Entrada','Input')}</span><div>${Array.from({length:input},(_,i)=>`<b class="${s>=1?'is-processed':''}">${i+1}</b>`).join('')}</div></div><div class="sx-infer-process"><div class="${s>=1?'is-active':''}">PREFILL<strong>${prefill} ms</strong></div><span class="sx-first-token ${s>=2?'is-active':''}">${t('PRIMER TOKEN','FIRST TOKEN')}<b>${s>=2?'01':'—'}</b></span><div class="${s>=3?'is-active':''}">DECODE<strong>${decode} ms</strong></div></div><div class="sx-token-line"><span>${t('Salida','Output')}</span><div>${Array.from({length:4},(_,i)=>`<b class="${s>=3||(s>=2&&i===0)?'is-generated':'is-empty'}">${s>=3||(s>=2&&i===0)?i+1:'·'}</b>`).join('')}</div></div>${result(t('Tiempo total sintético','Synthetic total time'),s>=3?`${total} ms = 120 + ${prefill} + ${decode}`:t('La salida aparece después de procesar la entrada.','Output appears after input processing.'))}<p class="sx-mini-note">${t('Regla del ejemplo: 120 ms de espera + 40 ms/bloque de entrada + 90 ms/bloque de salida.','Example rule: 120 ms waiting + 40 ms/input block + 90 ms/output block.')}</p>`;
    }
    // Evaluation has explicit observed labels and fixed synthetic datasets, not model scores.
    const setVariant=['eval-dataset','redteam'].includes(v);
    if(setVariant||v==='eval-judge') {
      const judge=v==='eval-judge';const count=judge?10:alt?10:6;
      const labels=Array.from({length:count},(_,i)=>i<6||i===8);
      const observed=labels.map((x,i)=>judge?(alt?x:(i===2||i===6||i===9)?!x:x):x);
      const good=observed.filter((x,i)=>judge?x===labels[i]:x).length;
      return `<div class="sx-eval-heading"><span>${judge?t('REFERENCIA ↔ JUEZ','REFERENCE ↔ JUDGE'):t('CONJUNTO SINTÉTICO','SYNTHETIC SET')}</span><strong>${s>=3?`${good}/${count}`:'—'}</strong></div><div class="sx-case-grid">${observed.map((value,i)=>`<div class="sx-case ${s>=2?((judge?value===labels[i]:value)?'is-pass':'is-fail'):''}"><span>${t('Caso','Case')} ${String(i+1).padStart(2,'0')}</span><b>${s>=2?(judge?(value===labels[i]?'=':'≠'):(value?'✓':'×')):'—'}</b><small>${judge?(s>=2?`${labels[i]?1:0} / ${value?1:0}`:t('Sin comparar','Not compared')):(i<6?t('Habitual','Common'):t('Difícil','Difficult'))}</small></div>`).join('')}</div>${result(judge?t('Acuerdo en este conjunto','Agreement on this set'):t('Cobertura observada','Observed coverage'),s>=3?judge?t(`${good} de ${count} etiquetas coinciden. No demuestra generalización.`,`${good} of ${count} labels agree. Generalization is not established.`):t(`${good} de ${count} casos pasan. Inspecciona cuáles fallan.`,`${good} of ${count} cases pass. Inspect the failures.`):t('Ejecuta la secuencia para observar los resultados.','Run the sequence to observe results.'),good===count)}`;
    }
    if(v==='eval-rollout') {
      const errors=alt?2:0,stopped=s>=3&&errors>1;
      return `<div class="sx-rollout"><div class="${s>=0?'is-active':''}"><span>SHADOW</span><strong>${t('Observar','Observe')}</strong></div><span aria-hidden="true">→</span><div class="${s>=1?'is-active':''}"><span>CANARY</span><strong>10 ${t('casos','cases')}</strong></div><span aria-hidden="true">→</span><div class="${s>=3?(stopped?'is-fail':'is-pass'):''}"><span>${t('AMPLIACIÓN','EXPANSION')}</span><strong>${s>=3?(stopped?t('Detenida','Stopped'):t('Permitida','Permitted')):t('Pendiente','Pending')}</strong></div></div><div class="sx-rule"><code>${t('Regla ilustrativa: detener si errores > 1','Illustrative rule: stop if errors > 1')}</code><strong>${s>=2?errors:'—'} ${t('errores observados','observed errors')}</strong></div>${result(t('Decisión de este ejemplo','Decision in this example'),s>=3?(stopped?t('No ampliar: se superó el umbral definido.','Do not expand: the defined threshold was crossed.'):t('El umbral no detiene la ampliación en este conjunto.','The threshold does not stop expansion on this set.')):t('La regla se define antes de observar los casos.','The rule is defined before observing cases.'),!stopped)}`;
    }
    if(v==='eval-feedback') return `<div class="sx-feedback-loop">${flow([box(t('Fallo observado','Observed failure'),tag('case-011','is-bad'),0),box(t('Caso reproducible','Reproducible case'),`<code>${s>=1&&!alt?'dataset: v2':'dataset: v1'}</code>`,1),box(t('Reparación','Repair'),tag(s>=2?t('Cambio aplicado','Change applied'):t('Pendiente','Pending')),2),box(t('Regresión','Regression'),`<strong>${s>=3?(alt?'10':'11'):'—'} ${t('casos','cases')}</strong>`,3)])}</div>${result(t('Evidencia conservada','Retained evidence'),alt?t('El caso nuevo no forma parte del conjunto.','The new case is not part of the set.'):t('El conjunto v2 conserva el fallo como prueba reproducible.','Set v2 retains the failure as a reproducible test.'),!alt)}`;
    if(v==='eval-boundary') {
      const checks=[t('Respuesta correcta','Correct answer'),t('Estado final alcanzado','Final state reached'),t('Permiso respetado','Permission respected')];
      return `<div class="sx-task-label">${t('MISMA EJECUCIÓN · cambia lo que inspeccionas, no los hechos','SAME RUN · change what you inspect, not the facts')}</div><div class="sx-trace"><div class="sx-trace-events">${['request','tool.call','tool.result','final'].map((label,i)=>`<div class="${i<=s?'is-observed':''}"><b>${i+1}</b><code>${label}</code><span>${i===1?t('Acción fuera de permiso','Action outside permission'):t('Ejecución de referencia','Reference run')}</span></div>`).join('')}</div><div class="sx-criteria">${checks.map((label,i)=>`<div><span>${esc(label)}</span><b class="${s>=3?(i<2?'is-pass':'is-fail'):''}">${s<3||(!alt&&i>0)?'—':i<2?'✓':'×'}</b></div>`).join('')}</div></div>${result(t('Conclusión permitida','Supported conclusion'),s<3?t('Avanza hasta observar los criterios seleccionados.','Advance to observe the selected criteria.'):alt?t('La respuesta es correcta, pero se incumple el permiso.','The answer is correct, but permission was violated.'):t('Solo se ha revisado el texto; no hay veredicto del sistema.','Only text was reviewed; there is no system-level verdict.'),false)}`;
    }
    const unauthorized=v==='eval-trace'&&alt;
    const checks=[{name:t('Respuesta correcta','Correct answer'),pass:true},{name:t('Estado final correcto','Correct final state'),pass:true},{name:t('Acción autorizada','Authorized action'),pass:!unauthorized && !(v==='eval-boundary'&&!alt)}];
    return `<div class="sx-trace"><div class="sx-task-label">${t('MISMO OBJETIVO · inspecciona la trayectoria','SAME GOAL · inspect the trajectory')}</div><div class="sx-trace-events">${['request','tool.call','tool.result','final'].map((label,i)=>`<div class="${i<=s?'is-observed':''}"><b>${i+1}</b><code>${label}</code><span>${i===1&&unauthorized?t('Fuera de permiso','Outside permission'):i<=s?t('Observado','Observed'):t('Pendiente','Pending')}</span></div>`).join('')}</div><div class="sx-criteria">${checks.map((c,i)=>`<div><span>${esc(c.name)}</span><b class="${s>=3?(c.pass?'is-pass':'is-fail'):''}">${s>=3?(c.pass?'✓':'×'):'—'}</b></div>`).join('')}</div></div>${result(t('No reducir todo a la respuesta','Do not reduce everything to the answer'),s>=3?(checks.every(c=>c.pass)?t('Los criterios declarados se cumplen en este caso.','Declared criteria are met in this case.'):t('Un criterio falla aunque la respuesta parezca correcta.','A criterion fails even though the answer looks correct.')):t('Avanza y compara la evidencia con cada criterio.','Advance and compare evidence with each criterion.'),checks.every(c=>c.pass))}`;
  }

  function initializeGuide(root) {
    if(root.dataset.ready) return; root.dataset.ready='true'; root.classList.add('is-ready');
    const data=JSON.parse(root.dataset.guide), en=data.locale==='en';
    const scene=$(root,'[data-sx-scene]'), steps=$$(root,'[data-sx-step]'), options=$$(root,'[data-sx-scenario]');
    let step=0,scenario=0,timer=null;
    const run=$(root,'[data-sx-run]');
    const stop=()=>{if(timer)clearInterval(timer);timer=null;run.textContent=en?'▶ Play sequence':'▶ Ver secuencia';run.setAttribute('aria-pressed','false');};
    const paint=()=>{
      root.dataset.step=String(step);root.dataset.scenario=String(scenario);
      scene.innerHTML=sceneFor(data,step,scenario);
      const status=$(root,'[data-sx-status]');
      if(status)status.textContent=data.steps[step][0]+'. '+($(scene,'[data-sx-result]')?.textContent||'');
      steps.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===step)));
      options.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===scenario)));
      $(root,'[data-sx-title]').textContent=data.steps[step][0];
      $(root,'[data-sx-copy]').textContent=data.steps[step][1];
      $(root,'[data-sx-prev]').disabled=step===0;$(root,'[data-sx-next]').disabled=step===3;
    };
    steps.forEach((button,i)=>button.addEventListener('click',()=>{stop();step=i;paint();}));
    options.forEach((button,i)=>button.addEventListener('click',()=>{stop();scenario=i;paint();}));
    $(root,'[data-sx-prev]').addEventListener('click',()=>{stop();step=Math.max(0,step-1);paint();});
    $(root,'[data-sx-next]').addEventListener('click',()=>{stop();step=Math.min(3,step+1);paint();});
    $(root,'[data-sx-reset]').addEventListener('click',()=>{stop();step=0;scenario=0;paint();});
    run.addEventListener('click',()=>{
      if(timer){stop();return;}
      if(step===3)step=0;
      paint();run.textContent=en?'Ⅱ Pause':'Ⅱ Pausar';run.setAttribute('aria-pressed','true');
      timer=setInterval(()=>{step=Math.min(3,step+1);paint();if(step===3)stop();},2000);
    });
    const tabs=$$(root,'[data-sx-tab]');
    const activate=(tab)=>{
      stop();const view=tab.dataset.sxTab;
      tabs.forEach(b=>{const active=b===tab;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
      $$(root,'[data-sx-panel]').forEach(p=>p.hidden=p.dataset.sxPanel!==view);
      if(view==='original')window.dispatchEvent(new Event('resize'));
    };
    tabs.forEach((tab,i)=>{
      tab.addEventListener('click',()=>activate(tab));
      tab.addEventListener('keydown',(e)=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const target=e.key==='Home'?tabs[0]:e.key==='End'?tabs[1]:tabs[1-i];activate(target);target.focus();}});
    });
    $(root,'[data-sx-fullscreen]').addEventListener('click',()=>{
      if(document.fullscreenElement===root)document.exitFullscreen().catch(()=>{});
      else root.requestFullscreen?.().catch(()=>{});
    });
    $(root,'[data-sx-share]').addEventListener('click',()=>{navigator.clipboard?.writeText(location.origin+location.pathname+'#mecanismo').catch(()=>{});});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
    const observer=new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)stop();},{threshold:0.05});observer.observe(root);
    activate(tabs[0]);paint();
  }
  function initializeDiscovery() {
    const prefix=document.documentElement.lang?.startsWith('en')?'/en':'';
    const en=!!prefix;
    // Preserve the existing card/media layout. Add an actual parent-series link.
    $$ (document,'.s5-watch-card, .s5-media-card').forEach(card=>{
      if(card.closest('[data-sx-hub]')||card.dataset.sxParent||card.matches('a'))return; // Never nest a link inside an anchor card.
      const link=$$(card,'a[href]').find(a=>/\/videos\/series\/[^/]+\//.test(a.pathname));
      if(!link)return;
      const slug=link.pathname.match(/\/videos\/series\/([^/]+)\//)[1];
      const parent=document.createElement('a');parent.className='sx-parent-series';parent.href=`${prefix}/series/#serie-${slug}`;parent.textContent=en?'Explore this series →':'Explorar esta serie →';
      card.appendChild(parent);card.dataset.sxParent='true';
    });
  }
  function initialize(){
    $$ (document,'[data-sx-hub]').forEach(initializeHub);
    $$ (document,'[data-sx-guide]').forEach(initializeGuide);
    initializeDiscovery();
  }
  if(typeof document$!=='undefined')document$.subscribe(initialize);
  else if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
