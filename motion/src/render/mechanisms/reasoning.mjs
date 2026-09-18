import {clamp,smooth,phase,number} from '../paint.mjs';
import {motionValue} from '../../cues.mjs';
import {majority,evaluated} from '../../schema.mjs';

export function candidates(P,s,t) {
  const T=P.T,d=s.data,warning=T.semantic?.warning||T.amber,warningSurface=T.semantic?.warningSurface||T.amberSurface,n=d.candidates.length,w=Math.min(188,(960-22*(n-1))/n),gap=(960-n*w)/(n-1),xs=d.candidates.map((_,i)=>20+i*(w+gap));
  const vote=majority(d.candidates),best=evaluated(d.candidates),evalStart=9.4,evalEnd=evalStart+n*.52;
  P.enter(t,0,0,0,()=>{P.rect(327,27,346,88,T.white,T.ink,5);P.text(d.question,500,48,43,T.ink,550,'center',320);});
  P.text(P.l('question'),723,56,20,T.muted,500,'left',260);P.path([[681,71],[703,71]],T.rule,1.5);
  d.candidates.forEach((it,i)=>{
    const x=xs[i],cx=x+w/2,path=[[500,115],[500,170],[cx,170],[cx,235]],agrees=String(it.value)===vote.value,chosen=it.id===best.id,voteVisible=t>5.4,scoreVisible=t>evalStart+i*.52+.4,border=scoreVisible&&it.score===0?warning:voteVisible&&agrees?T.accentText:T.rule;
    P.path(path,T.muted,2,phase(t,.8+i*.18,.95));P.traveler(path,phase(t,.8+i*.18,.95),T.accent,5.5);
    P.enter(t,1.7+i*.19,0,0,()=>{P.rect(x,235,w,158,voteVisible&&agrees?T.accentSurface:T.white,border,5,scoreVisible&&chosen?3.3:1.8);P.text(it.label,cx,255,22,T.muted,450,'center',w-10);P.path([[x,293],[x+w,293]],T.rule,1);P.text(it.value,cx,309,48,voteVisible&&agrees?T.accentText:T.ink,600,'center',w-12);if(scoreVisible){P.circle(cx,413,13,it.score===0?warningSurface:T.accentSurface);if(it.score>0)P.check(cx,413,T.accentText,.66);else P.path([[cx-6,407],[cx+6,419]],warning,2);}});
    P.path([[cx,393],[cx,451],[500,451]],T.muted,1.8,phase(t,4.1+i*.14,.75));if(agrees)P.traveler([[cx,393],[cx,451],[254,451],[254,630]],phase(t,5.1+i*.36,1.15),T.accent,6);
    const scan=clamp((t-evalStart-i*.52)/.52);if(scan>0&&scan<1)P.rect(x-5,230,w+10,168,null,T.accent,6,3);
  });
  P.path([[500,451],[254,451],[254,505]],T.muted,2,phase(t,4.85,.65));P.path([[500,451],[752,451],[752,505]],T.muted,2,phase(t,8.7,.65));
  P.enter(t,5.2,0,0,()=>{P.text(P.l('majority'),254,516,37,T.ink,550,'center',450);P.text(P.l('frequent'),254,566,23,T.muted,400,'center',460);P.path([[254,603],[254,631]],T.accentText,2,phase(t,6.2,.5));const q=phase(t,6.45,1),count=Math.round(vote.count*q);P.rect(48,634,412,94,T.accentSurface,T.accentText,5,2);P.text(vote.tied?P.l('tie'):`${vote.value} · ${count} ${P.l('of')} ${n}`,254,656,43,T.accentText,550,'center',382);});
  P.path([[502,511],[502,731]],T.rule,1,1,[6,7]);
  P.enter(t,9.0,0,0,()=>{P.text(P.l('evaluator'),752,516,37,T.ink,550,'center',445);P.wrap(d.criterion,752,566,440,23,T.muted,400,1.3,'center');P.path([[752,604],[752,631]],T.accentText,2,phase(t,evalEnd,.5));P.rect(562,634,381,94,T.accentSurface,T.accentText,5,2);P.text(t>=evalEnd?best.value:'…',752,651,52,T.accentText,550,'center',350);if(t>=evalEnd)P.check(899,682,T.accentText,1);});
  P.wrap(d.caveat,500,754,950,20,T.muted,400,1.2,'center');
}

/** Generation, evaluation and vote use independent cue channels from the same deterministic clock. */
export function syncedCandidates(P,s,t) {
  const T=P.T,d=s.data,warning=T.semantic?.warning||T.amber,warningSurface=T.semantic?.warningSurface||T.amberSurface,n=d.candidates.length,w=Math.min(188,(960-22*(n-1))/n),gap=(960-n*w)/(n-1),xs=d.candidates.map((_,i)=>20+i*(w+gap));
  const vote=majority(d.candidates),best=evaluated(d.candidates),g=motionValue(s,t,'candidates.generate'),e=motionValue(s,t,'candidates.evaluate'),v=motionValue(s,t,'candidates.vote'),en=P.locale.startsWith('en');
  P.rect(327,27,346,88,T.white,T.ink,5);P.text(d.question,500,48,43,T.ink,550,'center',320);P.text(P.l('question'),723,56,20,T.muted,500,'left',260);P.path([[681,71],[703,71]],T.rule,1.5);
  d.candidates.forEach((it,i)=>{
    const x=xs[i],cx=x+w/2,generated=clamp(g*(n+2)-i),path=[[500,115],[500,170],[cx,170],[cx,235]],checked=e*n>=i+1,checking=e*n>i&&e*n<i+1,agrees=String(it.value)===vote.value;
    P.path(path,T.muted,2,generated);P.traveler(path,generated,T.accent,5.5);P.c.save();P.c.globalAlpha*=smooth(clamp(g*(n+2)-i-1));
    P.rect(x,235,w,158,(v>0&&agrees)?T.accentSurface:T.white,checked?(it.score>0?T.accentText:warning):T.rule,5,2);P.text(it.label,cx,255,22,T.muted,450,'center',w-10);P.path([[x,293],[x+w,293]],T.rule,1);P.text(it.value,cx,309,48,checked&&it.score>0?T.accentText:T.ink,600,'center',w-12);if(checking)P.rect(x-5,230,w+10,168,null,T.accent,6,3);if(checked){P.circle(cx,413,13,it.score>0?T.accentSurface:warningSurface);if(it.score>0)P.check(cx,413,T.accentText,.66);else{P.path([[cx-6,407],[cx+6,419]],warning,2);P.path([[cx+6,407],[cx-6,419]],warning,2);}}P.c.restore();
    if(e>0||v>0)P.path([[cx,393],[cx,451],[500,451]],T.muted,1.8,clamp(Math.max(e,v)*3));if(v>0)P.traveler([[cx,393],[cx,451],[254,451],[254,630]],clamp(v*(n+1)-i),agrees?T.accent:warning,6);
  });
  if(e>0){P.c.save();P.c.globalAlpha*=smooth(clamp(e*5));P.path([[500,451],[752,451],[752,505]],T.muted,2,clamp(e*3));P.text(P.l('evaluator'),752,516,37,T.ink,550,'center',445);P.wrap(d.criterion,752,566,440,23,T.muted,400,1.3,'center');P.path([[752,604],[752,631]],T.accentText,2,clamp(e*2));P.rect(562,634,381,94,T.accentSurface,T.accentText,5,2);P.text(e>=1?best.value:'…',752,651,52,T.accentText,550,'center',350);if(e>=1)P.check(899,682,T.accentText,1);P.c.restore();}
  if(v>0){P.c.save();P.c.globalAlpha*=smooth(clamp(v*5));P.path([[500,451],[254,451],[254,505]],T.muted,2,clamp(v*3));P.text(P.l('majority'),254,516,37,T.ink,550,'center',450);P.text(P.l('frequent'),254,566,23,T.muted,400,'center',460);P.path([[254,603],[254,631]],T.accentText,2,clamp(v*2));P.rect(48,634,412,94,T.accentSurface,T.accentText,5,2);P.text(v>=1?(vote.tied?P.l('tie'):`${vote.value} · ${vote.count} ${P.l('of')} ${n}`):(en?'Counting…':'Contando…'),254,656,v>=1?43:33,T.accentText,550,'center',382);P.path([[502,511],[502,731]],T.rule,1,1,[6,7]);P.c.restore();}
  P.wrap(d.caveat,500,754,950,20,T.muted,400,1.2,'center');
}

export function tree(P,s,t) {
  const clock=s.cues?motionValue(s,t,'tree.expand')*9:t,prune=s.cues?motionValue(s,t,'tree.prune'):phase(t,6,1.2),select=s.cues?motionValue(s,t,'tree.select'):phase(t,8,1),T=P.T,d=s.data,warning=T.semantic?.warning||T.amber,byId=new Map(d.nodes.map(n=>[n.id,n]));
  const depth=n=>n.parent?1+depth(byId.get(n.parent)):0,levels=new Map();d.nodes.forEach(n=>{const l=depth(n);if(!levels.has(l))levels.set(l,[]);levels.get(l).push(n);});
  const maxDepth=Math.max(...levels.keys()),positions=new Map();for(const [level,ns] of levels)ns.forEach((n,i)=>positions.set(n.id,{x:1000*(i+1)/(ns.length+1),y:95+level*(550/Math.max(1,maxDepth))}));
  for(const [i,n] of d.nodes.entries())if(n.parent){const a=positions.get(n.parent),b=positions.get(n.id),q=phase(clock,.8+depth(n)*1.25+i*.12,1),selected=n.state==='selected'&&select>.01,pruned=n.state==='pruned'&&prune>.01,path=[[a.x,a.y+42],[a.x,(a.y+b.y)/2],[b.x,(a.y+b.y)/2],[b.x,b.y-42]];P.path(path,selected?T.accentText:pruned?T.rule:T.muted,selected?4:2,q);P.traveler(path,q);}
  d.nodes.forEach((n,i)=>{const pt=positions.get(n.id),show=.25+depth(n)*1.5+i*.08;P.enter(clock,show,0,0,()=>{const pruned=n.state==='pruned'&&prune>.01,selected=n.state==='selected'&&select>.01;P.rect(pt.x-99,pt.y-42,198,84,selected?T.accentSurface:T.white,selected?T.accentText:pruned?T.rule:T.muted,5,selected?2.5:1.5);P.wrap(n.label,pt.x,pt.y-25,174,22,selected?T.accentText:pruned?T.muted:T.ink,500,1.12,'center');if(pruned){P.text(P.l('pruned'),pt.x,pt.y+49,18,warning,500,'center',190);P.path([[pt.x-10,pt.y-8],[pt.x+10,pt.y+12]],warning,2.4,prune);}if(selected)P.circle(pt.x+94,pt.y-38,7,T.accent);});});
  P.text(d.criterion||'Evaluar antes de expandir',500,16,23,T.muted,450,'center',920);P.wrap(d.note,500,734,940,21,T.muted,400,1.2,'center');
}

export function evidenceComparison(P,s,t,q){
  const T=P.T,d=s.data.evidenceComparison,fade=phase(q,.10,.16);if(!fade)return;P.c.save();P.c.globalAlpha*=fade;P.c.translate(0,10*(1-fade));P.text(d.title,68,66,51,T.ink,550,'left',895);P.text(d.note,70,137,23,T.muted,400,'left',890);
  for(let i=0;i<=2;i++){const x=75+850*i/2;P.path([[x,225],[x,615]],T.rule,1);P.text(`${number(d.max*i/2)} ${d.unit}`,x,189,21,T.muted,400,'center',150);}
  d.values.forEach((v,i)=>{const y=280+i*217,progress=phase(q,i===0?.20:.61,.34);if(progress<=0)return;P.c.save();P.c.globalAlpha*=clamp(progress*5);P.text(v.label,75,y-21,30,T.ink,500,'left',670);P.text(`${number(v.value)} ${d.unit}`,925,y-37,57,i===0?T.ink:T.accentText,550,'right',220);P.rect(75,y+45,850,35,T.accentSurface,null,3);P.rect(75,y+45,850*v.value/d.max*progress,35,i===0?T.muted:T.accentText,null,3);P.c.restore();});
  if(q>.97)P.text(P.locale.startsWith('en')?'Majority voting, not evaluator selection.':'Selección por mayoría, no por un evaluador.',75,673,30,T.accentText,500,'left',900);P.text(P.locale.startsWith('en')?'Reported results, separate from the arithmetic example.':'Experimento distinto del ejemplo aritmético anterior.',75,750,22,T.muted,400,'left',910);P.c.restore();
}
