/* Presentation-only runtime. No simulation handlers, state attributes, scientific
 * labels, graph connectivity or timing are replaced here. */
(() => {
  'use strict';
  const SERIES = new Set(['seguridad-ia','agentes-ia','agentes-voz-tiempo-real',
    'coding-agents-agent-harnesses','context-engineering-memory-mcp',
    'llm-inference-engineering-economics','evaluating-ai-systems-production']);
  const ROOT_SELECTOR = '.ctxmix,.aix-loop,.aix-eval,.aix-sec,.defsim,.jbsearch,.jbbudget,.jbladder,.memlife,.memgov,.memprop,.memlayers,.threatbuild,.uplift3,.causalrt,.regloop,.proddef,.mcpbound,.killpath,.releasegate,.s5v';
  const SHAPE = 'rect,circle,ellipse,polygon,path';
  // Art direction is scoped to the actual node identifiers of each original
  // visual. An outcome is not styled as a pass unless the source says it is.
  const SCENES = [
    ['.s5v-coding-harness-loop',{key:['model','dispatch','context'],evidence:['observation','verifier'],caution:['workspace']}],
    ['.s5v-coding-agent-isolation',{key:['integration'],evidence:['verification-head']}],
    ['.s5v-coding-agent-task-contract',{key:['inspect'],caution:['serializer-assumption']}],
    ['.s5v-coding-agent-authority-path',{key:['canonical-request','local-gate','remote-gate'],evidence:['evidence'],caution:['effective-invocation','request-changed']}],
    ['.s5v-coding-agent-verification-stack',{key:['candidate-a','freshness-gate'],evidence:['evidence-set'],failure:['stale-evidence']}],
    ['.s5v-coding-agent-long-task-state',{key:['durable-ledger','integration-candidate'],evidence:['reverify','reconcile'],caution:['worker-a','worker-b'],failure:['stale-evidence','disconnect']}],
    ['.s5v-context-assembly',{key:['assembler','inference-context'],evidence:['model'],caution:['action','environment']}],
    ['.s5v-context-budget-lineage',{key:['policy-gate','compact','reference'],evidence:['verbatim','extract'],failure:['drop']}],
    ['.s5v-context-memory-lifecycle',{key:['working-set','retrieval','consolidation'],evidence:['system-of-record','checkpoint'],caution:['source-revision']}],
    ['.s5v-context-retrieval-grounding',{key:['candidate-pool','bounded-context'],evidence:['authority-gate','system-of-record'],caution:['abstain'],failure:['rejected-stale']}],
    ['.s5v-context-mcp-trust',{key:['host-policy','client-a','client-b'],evidence:['mcp-auth','downstream-auth'],caution:['external-effect']}],
    ['.s5v-context-extension-isolation',{key:['parent-context','child-context','activation'],evidence:['verify'],caution:['external-effect','pre-hook']}],
    ['.s5v-inference-phases',{key:['prefill','decode-1','decode-2'],evidence:['kv-cache'],caution:['queue','scheduler','latency-slos']}],
    ['.s5v-kv-paging',{key:['block-table','gpu-pool','scheduler'],evidence:['free-pool','admitted-c'],caution:['host-tier']}],
    ['.s5v-quant-parallel',{key:['quantizer','kernel','topology'],evidence:['weights','activations','kv'],caution:['quality']}],
    ['.s5v-reuse-spec',{key:['lookup','verify','target-state'],evidence:['hit','accept','commit'],caution:['pressure'],failure:['miss','reject']}],
    ['.s5v-routing-policy',{key:['eligibility','model-policy','worker-placement'],evidence:['cache-hit','success'],caution:['fallback-gate','fallback-model'],failure:['terminal-failure']}],
    ['.s5v-benchmark-boundary',{key:['service','hardware','report'],evidence:['quality-filter','goodput'],caution:['queue','power-meter']}],
    ['.s5v-eval-boundary',{key:['question','policy'],evidence:['diagnose','confirm'],caution:['change']}],
    ['.s5v-eval-dataset',{key:['manifest','group'],evidence:['provenance','scanner'],caution:['cross-split','development-leakage','training-exposure','temporal-leakage']}],
    ['.s5v-judge-calibration',{key:['judge-version','rubric','scope-decision'],evidence:['diagnostics','adjudication'],caution:['human-fallback']}],
    ['.s5v-agent-trajectory',{key:['policy-gate','release-gate'],evidence:['outcome-verifier','trajectory-verifier','release-pass'],caution:['reconcile-state'],failure:['policy-deny','release-fail','duplicate-hazard']}],
    ['.s5v-online-eval',{key:['shadow','canary','ab'],evidence:['release-gate','promote'],caution:['pause'],failure:['rollback']}],
    ['.s5v-eval-feedback',{key:['sufficiency','versioned-eval','controlled-release'],evidence:['receipt','verify-production'],caution:['taxonomy','repair']}]
  ];
  const resources=new Map();
  const ready = fn => document.readyState==='loading'
    ? document.addEventListener('DOMContentLoaded',fn,{once:true}) : fn();

  function wrapCircleLabels(svg) {
    const ns='http://www.w3.org/2000/svg';
    for (const group of svg.querySelectorAll('g[data-node]')) {
      const circle=group.querySelector(':scope > circle');
      if (!circle || group.dataset.s5gLabels) continue;
      const radius=Number(circle.getAttribute('r'));
      const cy=Number(circle.getAttribute('cy'));
      const cx=Number(circle.getAttribute('cx'));
      if(radius<25)continue;
      const texts=[...group.querySelectorAll(':scope > text')].filter(t=>{
        const y=Number(t.getAttribute('y')),x=Number(t.getAttribute('x'));
        return !t.children.length && t.textContent.trim() && Math.abs(y-cy)<radius*.92 && Math.abs(x-cx)<radius*.15;
      });
      if(!texts.length)continue;
      const rows=[];
      for(const text of texts){
        const original=text.textContent;
        let font=parseFloat(getComputedStyle(text).fontSize)||14;
        const maxWidth=radius*1.72;
        const words=original.trim().split(/\s+/);
        if(words.length===1 && text.getComputedTextLength()>maxWidth){
          font=Math.max(14,font*maxWidth/text.getComputedTextLength());text.style.fontSize=font+'px';
        }
        let lines=[original];
        if(words.length>1 && text.getComputedTextLength()>maxWidth){
          let best=null;
          for(let i=1;i<words.length;i++){
            const a=words.slice(0,i).join(' '),b=words.slice(i).join(' ');
            text.textContent=a;const aw=text.getComputedTextLength();
            text.textContent=b;const bw=text.getComputedTextLength();
            const score=Math.max(aw,bw);
            if(!best||score<best.score)best={a,b,score};
          }
          text.textContent=original;
          if(best && best.score<maxWidth*1.12 && best.a+' '+best.b===original)lines=[best.a+' ',best.b];
        }
        rows.push({text,original,font,lines});
      }
      // Lay the whole label stack out together; wrapping a title independently
      // from its subtitle caused the overlaps this iteration is fixing.
      const total=rows.reduce((n,r)=>n+r.lines.length*r.font*1.16,0)+3*(rows.length-1);
      let y=cy-total/2;
      for(const row of rows){
        const parts=[];
        for(const line of row.lines){
          const span=document.createElementNS(ns,'tspan');
          span.setAttribute('x',String(cx));span.setAttribute('y',String(y+row.font*.86));
          span.textContent=line;parts.push(span);y+=row.font*1.16;
        }
        if(parts.map(el=>el.textContent).join('')!==row.original)continue;
        row.text.replaceChildren(...parts);row.text.dataset.s5gWrapped='1';y+=3;
      }
      group.dataset.s5gLabels='1';
    }
  }

  function dressDiagram(root,roles) {
    root.classList.add('s5g-technical');
    for(const svg of root.querySelectorAll('svg')){
      if(!svg.querySelector('[data-node]'))continue;
      for(const marker of svg.querySelectorAll('marker')){
        // The old strokeWidth units made each arrowhead about 30px across,
        // obscuring several labels. Keep its exact path and direction at 9px.
        marker.setAttribute('markerUnits','userSpaceOnUse');
      }
      for(const el of svg.querySelectorAll(SHAPE)){
        const cl=el.getAttribute('class')||'';
        if(el.closest('defs'))continue;
        if(el.hasAttribute('data-boundary') || /(?:^|\s)\S*-boundary(?:\s|--|$)/.test(cl))el.classList.add('s5g-boundary');
        if(el.hasAttribute('data-edge') || /(?:^|\s)\S*-(?:edge|flow|link)(?:\s|--|$)/.test(cl)){
          const w=parseFloat(getComputedStyle(el).strokeWidth);
          if(Number.isFinite(w))el.style.strokeWidth=String(w*.82);
          el.classList.add('s5g-edge');
          const meaning=(el.getAttribute('data-edge')||'')+' '+cl;
          if(/return|feedback|recovery/.test(meaning))el.classList.add('s5g-edge-return');
          if(/deny|reject|invalidat|fail/.test(meaning))el.classList.add('s5g-edge-failure');
        }
      }
      for(const node of svg.querySelectorAll('[data-node]')){
        const shape=node.matches(SHAPE)?node:node.querySelector(':scope > rect,:scope > circle,:scope > ellipse,:scope > polygon,:scope > path');
        if(shape)shape.classList.add('s5g-node-shape');
        const id=node.getAttribute('data-node');
        for(const [role,ids] of Object.entries(roles))if(ids.includes(id))node.classList.add('s5g-node-'+role);
      }
      wrapCircleLabels(svg);
    }
  }

  function wrapAnnotation(text,width,y) {
    if(!text || text.children.length || text.getComputedTextLength()<=width)return;
    const original=text.textContent,words=original.split(' '),lines=[];
    if(words.join(' ')!==original)return;
    let line='';
    for(const word of words){
      const next=line?line+' '+word:word;text.textContent=next;
      if(line&&text.getComputedTextLength()>width){lines.push(line);line=word}else line=next;
    }
    if(line)lines.push(line);text.textContent=original;
    if(lines.join(' ')!==original)return;
    const x=text.getAttribute('x'),font=parseFloat(getComputedStyle(text).fontSize)||12;
    const parts=lines.map((line,index)=>{
      const span=document.createElementNS('http://www.w3.org/2000/svg','tspan');
      span.setAttribute('x',x);span.setAttribute('y',String(y+index*font*1.16));
      span.textContent=line+(index<lines.length-1?' ':'');return span;
    });
    text.replaceChildren(...parts);text.dataset.s5gWrapped='1';
  }

  function polishAnnotations(root){
    if(root.matches('.s5v-turn-evidence-graph')){
      // Source coordinates identify existing annotations; text and events stay
      // unchanged. Fit labels before the diagnosis panel instead of under it.
      for(const [x,y,width,start] of [[677,258,168,252],[684,319,162,334],[890,270,187,258],[890,430,187,423]]){
        wrapAnnotation(root.querySelector(`text[x="${x}"][y="${y}"]`),width,start);
      }
      root.querySelectorAll('marker').forEach(marker=>{
        marker.setAttribute('markerUnits','userSpaceOnUse');
        marker.setAttribute('markerWidth','12');marker.setAttribute('markerHeight','12');
      });
    }
    if(root.matches('.s5v-coding-agent-verification-stack')){
      wrapAnnotation(root.querySelector('text.v-title[x="376"][y="142"]'),122,130);
    }
  }

  function bindRoot(root) {
    if(resources.has(root))return;
    root.classList.add('s5g-visual');
    root.dataset.s5GoldenBound='1';
    const scene=SCENES.find(([selector])=>root.matches(selector));
    if(scene)dressDiagram(root,scene[1]);
    polishAnnotations(root);
    const scrollers=[...root.querySelectorAll('[class*="__scroll"],[class$="-scroll"]')];
    const update=()=>scrollers.forEach(el=>{
      el.classList.toggle('s5g-scrollable',el.scrollWidth>el.clientWidth+8);
      el.classList.toggle('is-scrolled',el.scrollLeft>8);
    });
    scrollers.forEach(el=>el.addEventListener('scroll',update,{passive:true}));
    const ro=typeof ResizeObserver==='function'?new ResizeObserver(update):null;
    ro?.observe(root);requestAnimationFrame(update);
    resources.set(root,()=>{ro?.disconnect();scrollers.forEach(el=>el.removeEventListener('scroll',update));});
  }
  function initialize(){
    for(const [root,dispose]of resources)if(!root.isConnected){dispose();resources.delete(root)}
    const match=location.pathname.match(/\/(?:en\/)?series\/([^/]+)\//);
    const slug=match&&SERIES.has(match[1])?match[1]:null;
    document.body.classList.toggle('s5-advanced-series',Boolean(slug));
    [...document.body.classList].filter(c=>c.startsWith('s5-series-')).forEach(c=>document.body.classList.remove(c));
    if(!slug)return;
    document.body.classList.add('s5-series-'+slug);
    document.querySelectorAll(ROOT_SELECTOR).forEach(bindRoot);
  }
  if(window.document$?.subscribe)window.document$.subscribe(initialize);else ready(initialize);
})();
