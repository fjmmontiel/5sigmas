(function () {
  'use strict';
  const root = document.querySelector('[data-s5-prompt-injection]');
  const core = window.S5PromptInjectionCore;
  if (!root || !core) return;
  const locale = root.dataset.locale === 'en' ? 'en' : 'es';
  const strings = locale === 'en' ? { reachable:'Reachable', blocked:'Blocked', contained:'Contained', steering:'Steering only', impact:'Impact path open', copied:'Link copied', exported:'JSON exported', reset:'Scenario reset' } : { reachable:'Alcanzable', blocked:'Bloqueado', contained:'Contenido', steering:'Solo desvío', impact:'Hay vía de impacto', copied:'Enlace copiado', exported:'JSON exportado', reset:'Escenario restablecido' };
  const fields = Array.from(root.querySelectorAll('[data-field]'));
  const feedback = root.querySelector('[data-s5-tool-feedback]');
  function read(){ const raw={}; for(const el of fields) raw[el.dataset.field]=el.type==='checkbox'?el.checked:el.value; return raw; }
  function setFields(state){ for(const el of fields){ const v=state[el.dataset.field]; if(v===undefined) continue; if(el.type==='checkbox') el.checked=Boolean(v); else el.value=v; } }
  function encodeState(state){ const p=new URLSearchParams(); p.set('preset',state.preset); p.set('vector',state.vector); for(const key of Object.keys(core.DEFAULTS)){ if(key==='preset'||key==='vector') continue; p.set(key,state[key]?'1':'0'); } return p; }
  function restoreFromUrl(){ const p=new URLSearchParams(location.search); if(!p.size) return; const raw={}; for(const [k,v] of p.entries()) raw[k]=v; setFields(core.normalize(raw)); }
  function postureLabel(p){ return p==='contained'?strings.contained:p==='steering-only'?strings.steering:strings.impact; }
  function render(){ const result=core.evaluate(read()); const set=(n,v)=>{const el=root.querySelector(`[data-output="${n}"]`); if(el) el.textContent=v;}; set('posture',postureLabel(result.summary.posture)); set('reachablePaths',String(result.summary.reachablePaths)); set('blockedPaths',String(result.summary.blockedPaths)); set('highImpactPaths',String(result.summary.highImpactPaths)); set('influence',result.summary.privilegedInfluence?strings.reachable:strings.blocked); for(const item of result.paths){ const row=root.querySelector(`[data-path="${item.id}"]`); if(!row) continue; row.dataset.state=item.reachable?'reachable':'blocked'; const badge=row.querySelector('[data-path-state]'); const why=row.querySelector('[data-path-why]'); if(badge) badge.textContent=item.reachable?strings.reachable:strings.blocked; if(why) why.textContent=item.why; } for(const control of result.controls){ const row=root.querySelector(`[data-control="${control.id}"]`); if(row) row.dataset.enabled=control.enabled?'true':'false'; } root.dataset.posture=result.summary.posture; return result; }
  function flash(text){ if(!feedback) return; feedback.hidden=false; feedback.textContent=text; clearTimeout(flash.timer); flash.timer=setTimeout(()=>{feedback.hidden=true;},1800); }
  root.addEventListener('change',(event)=>{ const target=event.target; if(!(target instanceof HTMLElement)||!target.matches('[data-field]')) return; if(target.dataset.field==='preset') setFields(core.PRESETS[target.value]||core.DEFAULTS); render(); });
  root.querySelector('[data-action="reset"]')?.addEventListener('click',()=>{ setFields(core.DEFAULTS); history.replaceState(null,'',location.pathname); render(); flash(strings.reset); });
  root.querySelector('[data-action="share"]')?.addEventListener('click',async()=>{ const result=render(); const url=`${location.origin}${location.pathname}?${encodeState(result.input).toString()}`; try{await navigator.clipboard.writeText(url);flash(strings.copied);}catch(_){window.prompt('URL',url);} });
  root.querySelector('[data-action="export"]')?.addEventListener('click',()=>{ const result=render(); const blob=new Blob([JSON.stringify({generatedAt:new Date().toISOString(),...result},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='5sigmas-prompt-injection-threat-model.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),0); flash(strings.exported); });
  restoreFromUrl(); render();
})();
