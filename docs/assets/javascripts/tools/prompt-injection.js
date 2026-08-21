(function () {
  'use strict';
  const root = document.querySelector('[data-s5-prompt-injection]');
  const core = window.S5PromptInjectionCore;
  if (!root || !core) return;
  const locale = root.dataset.locale === 'en' ? 'en' : 'es';
  const strings = locale === 'en'
    ? { reachable:'Reachable', blocked:'Blocked', contained:'Contained', steering:'Steering only', impact:'Impact path open', copied:'Link copied', exported:'JSON exported', reset:'Scenario reset' }
    : { reachable:'Alcanzable', blocked:'Bloqueado', contained:'Contenido', steering:'Solo desvío', impact:'Hay vía de impacto', copied:'Enlace copiado', exported:'JSON exportado', reset:'Escenario restablecido' };
  const fields = Array.from(root.querySelectorAll('[data-field]'));
  const feedback = root.querySelector('[data-s5-tool-feedback]');

  function read(){
    const raw={};
    for(const el of fields) raw[el.dataset.field]=el.type==='checkbox'?el.checked:el.value;
    return raw;
  }
  function setFields(state){
    for(const el of fields){
      const v=state[el.dataset.field];
      if(v===undefined) continue;
      if(el.type==='checkbox') el.checked=Boolean(v); else el.value=v;
    }
  }
  function encodeState(state){
    const p=new URLSearchParams();
    p.set('preset',state.preset);
    p.set('vector',state.vector);
    for(const key of Object.keys(core.DEFAULTS)){
      if(key==='preset'||key==='vector') continue;
      p.set(key,state[key]?'1':'0');
    }
    return p;
  }
  function restoreFromUrl(){
    const p=new URLSearchParams(location.search);
    if(!p.size) return;
    const raw={};
    for(const [k,v] of p.entries()) raw[k]=v;
    setFields(core.normalize(raw));
  }
  function postureLabel(p){ return p==='contained'?strings.contained:p==='steering-only'?strings.steering:strings.impact; }

  function whyText(item, input){
    if (locale === 'en') {
      if (item.id === 'instruction-steering') return item.reachable ? 'Untrusted content can influence the privileged model.' : 'No modeled path connects untrusted content to the privileged model.';
      if (item.id === 'sensitive-disclosure') {
        if (!input.sensitiveContext) return 'No sensitive context is modeled.';
        if (input.outputSecretFilter) return 'A deterministic filter for known secret classes blocks this modeled rendered-output path.';
        return 'Sensitive context can reach rendered output without the modeled known-secret filter.';
      }
      if (item.id === 'unauthorized-action') {
        if (!input.toolsEnabled || !input.writeTools) return 'No consequential write-capable tool is modeled.';
        if (input.actionIntentValidation || input.humanApproval) return 'An independent intent check or approval boundary blocks the modeled automatic-action path.';
        return 'The model can reach write-capable tools without an independent intent or approval boundary.';
      }
      if (item.id === 'data-exfiltration') {
        if (!input.sensitiveContext) return 'No sensitive context is modeled.';
        if (!input.externalEgress) return 'No external outbound channel is modeled.';
        if (input.egressRestriction) return 'Outbound policy blocks the modeled external destination.';
        return 'Sensitive context and an unrestricted external outbound path coexist.';
      }
      if (item.id === 'persistent-poisoning') {
        if (!input.persistentMemory) return 'No persistent memory write is modeled.';
        if (input.memoryWriteValidation) return 'Memory writes require validation before persistence.';
        return 'Untrusted influence can reach persistent memory without an independent write check.';
      }
      return item.why;
    }

    if (item.id === 'instruction-steering') return item.reachable ? 'El contenido no confiable puede influir en el modelo privilegiado.' : 'No hay una ruta modelada desde contenido no confiable hasta el modelo privilegiado.';
    if (item.id === 'sensitive-disclosure') {
      if (!input.sensitiveContext) return 'No se modela contexto sensible.';
      if (input.outputSecretFilter) return 'Un filtro determinista de clases conocidas de secretos bloquea esta ruta modelada hacia la salida mostrada.';
      return 'El contexto sensible puede llegar a la salida mostrada sin el filtro modelado de secretos conocidos.';
    }
    if (item.id === 'unauthorized-action') {
      if (!input.toolsEnabled || !input.writeTools) return 'No se modela ninguna herramienta con capacidad de modificar estado.';
      if (input.actionIntentValidation || input.humanApproval) return 'Una comprobación independiente de intención o aprobación bloquea la ruta modelada de acción automática.';
      return 'El modelo puede alcanzar herramientas que modifican estado sin una barrera independiente de intención o aprobación.';
    }
    if (item.id === 'data-exfiltration') {
      if (!input.sensitiveContext) return 'No se modela contexto sensible.';
      if (!input.externalEgress) return 'No se modela ningún canal de salida externo.';
      if (input.egressRestriction) return 'La política de salida bloquea el destino externo modelado.';
      return 'Coexisten contexto sensible y una ruta de salida externa sin restricciones.';
    }
    if (item.id === 'persistent-poisoning') {
      if (!input.persistentMemory) return 'No se modela escritura de memoria persistente.';
      if (input.memoryWriteValidation) return 'Las escrituras de memoria requieren validación antes de persistir.';
      return 'La influencia no confiable puede alcanzar memoria persistente sin una comprobación independiente de escritura.';
    }
    return item.why;
  }

  function render(){
    const result=core.evaluate(read());
    const set=(n,v)=>{const el=root.querySelector(`[data-output="${n}"]`); if(el) el.textContent=v;};
    set('posture',postureLabel(result.summary.posture));
    set('reachablePaths',String(result.summary.reachablePaths));
    set('blockedPaths',String(result.summary.blockedPaths));
    set('highImpactPaths',String(result.summary.highImpactPaths));
    set('influence',result.summary.privilegedInfluence?strings.reachable:strings.blocked);
    for(const item of result.paths){
      const row=root.querySelector(`[data-path="${item.id}"]`);
      if(!row) continue;
      row.dataset.state=item.reachable?'reachable':'blocked';
      const badge=row.querySelector('[data-path-state]');
      const why=row.querySelector('[data-path-why]');
      if(badge) badge.textContent=item.reachable?strings.reachable:strings.blocked;
      if(why) why.textContent=whyText(item,result.input);
    }
    for(const control of result.controls){
      const row=root.querySelector(`[data-control="${control.id}"]`);
      if(row) row.dataset.enabled=control.enabled?'true':'false';
    }
    root.dataset.posture=result.summary.posture;
    return result;
  }
  function flash(text){
    if(!feedback) return;
    feedback.hidden=false;
    feedback.textContent=text;
    clearTimeout(flash.timer);
    flash.timer=setTimeout(()=>{feedback.hidden=true;},1800);
  }

  root.addEventListener('change',(event)=>{
    const target=event.target;
    if(!(target instanceof HTMLElement)||!target.matches('[data-field]')) return;
    if(target.dataset.field==='preset') setFields(core.PRESETS[target.value]||core.DEFAULTS);
    render();
  });
  root.querySelector('[data-action="reset"]')?.addEventListener('click',()=>{
    setFields(core.DEFAULTS);
    history.replaceState(null,'',location.pathname);
    render();
    flash(strings.reset);
  });
  root.querySelector('[data-action="share"]')?.addEventListener('click',async()=>{
    const result=render();
    const params=encodeState(result.input).toString();
    history.replaceState(null,'',`${location.pathname}?${params}`);
    const url=location.href;
    try{await navigator.clipboard.writeText(url);flash(strings.copied);}catch(_){window.prompt('URL',url);}
  });
  root.querySelector('[data-action="export"]')?.addEventListener('click',()=>{
    const result=render();
    const blob=new Blob([JSON.stringify({generatedAt:new Date().toISOString(),...result},null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='5sigmas-prompt-injection-threat-model.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),0);
    flash(strings.exported);
  });
  restoreFromUrl();
  render();
})();
