import {clamp,mixHex,number} from './paint.mjs';
export function sceneLayout(P,s,portrait) {
  const width=portrait?1080:1920,height=portrait?1920:1080;
  const left=portrait?58:72,top=portrait?165:177,textWidth=portrait?964:830;
  let titleSize=s.type==='intro'?(portrait?118:138):(portrait?73:76);
  while(Math.max(...s.title.map(line=>P.measure(line,titleSize,600,P.T.headlineFont)))>textWidth&&titleSize>58)titleSize-=1;
  let y=top+s.title.length*titleSize*1.12+34;
  const bodySize=portrait?36:(s.type==='intro'?38:33),bodyLH=1.39;
  const paragraphs=s.paragraphs.map(text=>{const lines=P.lines(text,textWidth,bodySize);const box={text,lines,y};y+=lines.length*bodySize*bodyLH+24;return box;});
  const bodyBottom=y-24;
  const mechanism=portrait?{x:55,y:Math.max(800,bodyBottom+50),w:970,h:800}:{x:965,y:183,w:883,h:735};
  if(portrait){mechanism.h=Math.min(830,1782-mechanism.y);mechanism.scale=Math.min(mechanism.w/1000,mechanism.h/800);}else mechanism.scale=Math.min(mechanism.w/1000,mechanism.h/800);
  if(mechanism.scale<0.70)P.issues.push({type:'mechanism-too-small',scale:mechanism.scale,scene:s.id});
  if(bodyBottom>(portrait?1050:945))P.issues.push({type:'body-overflow',bottom:bodyBottom,scene:s.id});
  return {width,height,left,top,textWidth,titleSize,bodySize,bodyLH,paragraphs,bodyBottom,mechanism,portrait};
}
export function drawHeader(P,spec,index,time,total,L) {
  const T=P.T,margin=L.portrait?58:72,w=L.width;
  P.text(spec.brand||'5sigmas',margin,49,36,T.ink,650);
  P.path([[margin+181,46],[margin+181,90]],T.rule,1.5);
  P.text(spec.series,margin+211,57,L.portrait?17:19,T.muted,500,'left',L.portrait?530:720);
  if(!L.portrait)P.text(spec.tagline||'IDEAS MÁS CLARAS',w-475,59,16,T.muted,500,'left',300);
  P.text(`${String(index+1).padStart(2,'0')} / ${String(spec.scenes.length).padStart(2,'0')}`,w-margin,58,18,T.muted,500,'right',150);
  P.path([[margin,117],[w-margin,117]],T.rule,1.5);
  const footerY=L.height-62;
  P.text(spec.scenes[index].kicker,margin,footerY,18,T.muted,450,'left',L.portrait?740:1350);
  P.text(`${number(Math.round(time/total*100))}%`,w-margin,footerY,18,T.accentText,550,'right');
  const gap=8,stepW=(w-2*margin-gap*(spec.scenes.length-1))/spec.scenes.length;
  let start=0;
  for(let i=0;i<spec.scenes.length;i++){
    const duration=spec.scenes[i].duration,q=clamp((time-start)/duration);
    P.rect(margin+i*(stepW+gap),L.height-20,stepW,3,T.rule);
    if(q>0)P.rect(margin+i*(stepW+gap),L.height-20,stepW*q,3,T.accent);
    start+=duration;
  }
}
export function drawText(P,s,L,alpha,state=null) {
  const c=P.c,T=P.T;c.save();c.globalAlpha*=alpha;
  for(const [i,line] of s.title.entries())P.text(line,L.left,L.top+i*L.titleSize*1.12,L.titleSize,i===s.accentLine?T.accentText:T.ink,600,'left',L.textWidth,T.headlineFont);
  if(!state){
    for(const p of L.paragraphs)for(const [i,line] of p.lines.entries())P.text(line,L.left,p.y+i*L.bodySize*L.bodyLH,L.bodySize,T.ink,400,'left',L.textWidth);
  } else {
    for(const [pi,p] of L.paragraphs.entries()){
      let lineStart=0;
      for(const [i,line] of p.lines.entries()){
        lineStart=p.text.indexOf(line,lineStart);
        const lineEnd=lineStart+line.length,y=p.y+i*L.bodySize*L.bodyLH;
        for(const q of state.cues){
          if(q.paragraph!==pi||!q.visible)continue;
          const from=Math.max(lineStart,q.range.start),to=Math.min(lineEnd,q.range.end);
          if(from>=to)continue;
          const prefix=p.text.slice(lineStart,from),run=p.text.slice(from,to);
          const x=L.left+P.measure(prefix,L.bodySize),w=P.measure(run,L.bodySize);
          c.save();c.globalAlpha*=q.alpha;
          if(q.emphasis>0){c.save();c.globalAlpha*=q.emphasis;
            P.rect(x-3,y-3,w+6,L.bodySize*1.20,T.accentSurface,null,3);
            if(from===q.range.start)P.rect(L.left-18,y,4,L.bodySize*1.06,T.accent,null,2);
            c.restore();
          }
          P.text(run,x,y,L.bodySize,mixHex(T.ink,T.accentText,q.emphasis),400,'left',L.textWidth);
          c.restore();
        }
        lineStart=lineEnd;
      }
    }
  }
  if(s.source){const y=L.portrait?L.height-120:975;P.path([[L.left,y-15],[L.left+Math.min(L.textWidth,610),y-15]],T.rule,1);P.text(s.source,L.left,y,20,T.muted,400,'left',L.portrait?964:850);}
  c.restore();
}
