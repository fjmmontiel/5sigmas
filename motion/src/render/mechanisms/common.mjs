import {clamp,phase,number} from '../paint.mjs';
import {motionValue} from '../../cues.mjs';
export function intro(P,s,t) {
  const T=P.T,items=s.data.items,n=items.length;
  P.text(s.data.heading||P.l('where'),75,70,22,T.muted,500,'left',850);
  items.forEach((it,i)=>{
    const y=170+i*(500/n);
    const itime=s.cues?motionValue(s,t,'intro.reveal')*(1.1+items.length*.65):t;
    const q=phase(itime,.45+i*.55,.8);
    if(i<n-1)P.path([[108,y+63],[108,y+500/n-21]],T.rule,3,phase(itime,1+i*.55,.65));
    P.enter(itime,.35+i*.6,0,0,()=>{
      P.circle(108,y+28,30,T.accentSurface,T.accentText,2);
      P.text(String(i+1).padStart(2,'0'),108,y+11,26,T.accentText,550,'center',70);
      P.text(it.label,178,y-6,52,T.ink,550,'left',720);
      P.text(it.detail,180,y+63,28,T.muted,400,'left',740);
    });
    if(q>0&&q<1)P.circle(108,y+28,36,T.background,T.accent,1);
  });
  P.enter(s.cues?motionValue(s,t,'intro.reveal')*4:t,2.9,0,0,()=>{P.path([[77,717],[910,717]],T.rule,1.5);P.text(s.data.endNote||P.l('introEnd'),75,748,27,T.accentText,500,'left',855);});
}
export function pipeline(P,s,t) {
  const T=P.T,items=s.data.items,n=items.length,gap=34,cardW=(930-gap*(n-1))/n;
  items.forEach((it,i)=>{
    const x=35+i*(cardW+gap),cx=x+cardW/2;
    const itime=s.cues?motionValue(s,t,i===0?'pipeline.train':'pipeline.infer')*5:t;
    P.enter(itime,.25+i*.22,0,0,()=>{
      P.text(it.tag||`${P.l('stage')} ${i+1}`,cx,100,24,T.muted,450,'center',cardW);
      P.rect(x,170,cardW,176,T.white,T.rule,10);
      P.text(it.label,cx,211,n>3?25:31,T.ink,600,'center',cardW-28);
      P.wrap(it.detail,cx,263,cardW-30,27,T.muted,400,1.3,'center');
    });
    const path=[[cx,346],[cx,484]];
    P.path(path,T.accentText,3,phase(itime,1.3+i*.7,1.0));
    P.traveler(path,phase(itime,1.3+i*.7,1.0));
    P.enter(itime,2.25+i*.7,0,0,()=>{
      P.rect(x,483,cardW,124,T.accentSurface,T.accentText,8);
      P.wrap(it.output||it.label,cx,520,cardW-25,35,T.accentText,550,1.3,'center');
      P.circle(cx,471,6,T.accent);
    });
  });
  P.enter(s.cues?motionValue(s,t,'pipeline.infer')*5:t,4.2,0,0,()=>{P.text(P.l('pipelineEnd'),500,715,25,T.muted,500,'center',900);});
}
export function steps(P,s,t) {
  const T=P.T,items=s.data.items,dy=570/(items.length-1),end=s.duration*.60;
  const progress=(s.cues?motionValue(s,t,'steps.progress'):clamp((t-.7)/(end-.7)))*(items.length-1);
  for(let i=0;i<items.length-1;i++){
    P.path([[83,103+i*dy],[83,103+(i+1)*dy]],T.rule,3);
    P.path([[83,103+i*dy],[83,103+(i+1)*dy]],T.accentText,4,clamp(progress-i));
    P.traveler([[83,103+i*dy],[83,103+(i+1)*dy]],clamp(progress-i));
  }
  items.forEach((it,i)=>{
    const y=72+i*dy,active=progress>=i,arrive=phase(t,.25+i*.16,.6);
    P.c.save();P.c.globalAlpha*=arrive;
    P.circle(83,y+31,27,active?T.accentText:T.background,active?T.accentText:T.rule,2);
    P.text(i+1,83,y+14,27,active?T.white:T.muted,500,'center');
    P.text(it.label,154,y,37,active?T.accentText:T.ink,550,'left',730);
    P.text(it.detail,155,y+49,25,T.muted,400,'left',745);
    if(active&&progress>i+.25)P.check(925,y+32);
    P.c.restore();
  });
  if(s.data.note)P.text(s.data.note,500,761,25,T.muted,400,'center',970);
}
export function duration(P,s,t) {
  const T=P.T,d=s.data,total=d.stages.reduce((a,x)=>a+x.amount,0),progress=s.cues?motionValue(s,t,'duration.accumulate'):phase(t,1.1,Math.max(6,s.duration*.52));
  if(d.rate){
    const elapsed=total/d.rate*progress,value=Math.floor(total*progress),seconds=total/d.rate;
    P.text(P.l('tokens'),75,122,22,T.muted,500,'left',475);
    P.text(number(value),70,179,117,T.accentText,550,'left',550);
    P.text(P.l('wait'),728,130,22,T.muted,500,'center',300);
    P.text(`${number(Math.floor(elapsed))} s`,728,192,95,T.ink,500,'center',350);
    P.path([[82,419],[918,419]],T.rule,6);
    P.path([[82,419],[918,419]],T.accentText,6,progress);P.circle(82+836*progress,419,10,T.accent);
    for(let i=0;i<=5;i++){const x=82+836*i/5;P.path([[x,438],[x,450]],T.muted,1.5);P.text(`${number(seconds*i/5)} s`,x,473,25,T.muted,400,'center',130);}
    P.enter(s.cues?2+motionValue(s,t,'duration.formula')*.65:t,2,0,0,()=>{
      P.rect(68,571,869,113,T.accentSurface,null,5);
      P.text(`${number(total)} ${d.unit} ÷ ${number(d.rate)} ${d.unit}/s`,502,597,37,T.accentText,500,'center',823);
      P.text(`= ${number(seconds)} s`,502,648,29,T.accentText,550,'center',800);
    });
  }else{
    const value=Math.round(total*progress);
    P.text(d.totalLabel.toUpperCase(),72,83,23,T.muted,500,'left',890);
    P.text(`${number(value)} ${d.unit}`,68,156,135,T.accentText,550,'left',900);
    P.path([[75,386],[925,386]],T.rule,1.5);
    let accumulated=0;
    d.stages.forEach((st,i)=>{
      const x=75+850*accumulated/total,w=850*st.amount/total,local=clamp((total*progress-accumulated)/st.amount);
      P.rect(x,387,w-3,71,T.accentSurface);
      P.rect(x,387,(w-3)*local,71,i%2===0?T.accentText:T.accent);
      const colx=75+i*(860/d.stages.length),colw=860/d.stages.length-15;
      P.text(String(i+1).padStart(2,'0'),colx,534,22,T.accentText,500,'left',colw);
      P.wrap(st.label,colx,577,colw,26,T.ink,500,1.3);
      P.text(`${number(st.amount)} ${d.unit}`,colx,657,33,T.accentText,500,'left',colw);
      accumulated+=st.amount;
    });
  }
  P.wrap(d.note,500,756,970,23,T.muted,400,1.25,'center');
}
export function allocation(P,s,t) {
  const T=P.T,d=s.data,n=d.items.length;
  d.items.forEach((it,i)=>{
    const y=85+i*(440/(n-1));
    const itime=s.cues?motionValue(s,t,i===0?'allocation.simple':'allocation.complex')*11:t;
    P.enter(itime,.3+i*.5,0,0,()=>{
      P.text(it.label,60,y,39,T.ink,550,'left',850);
      P.text(it.detail,60,y+62,25,T.muted,400,'left',850);
      P.rect(63,y+116,210,73,T.white,T.muted,5);
      P.text(P.l('model'),168,y+137,28,T.ink,500,'center',195);
    });
    const line=[[273,y+153],[818,y+153]],q=phase(itime,1.5+i*3.7,2.5+i*.5);
    P.path(line,T.rule,3);P.path(line,T.accentText,3,q);P.traveler(line,q,T.accent,7);
    const steps=i===0?2:4;
    for(let j=0;j<steps;j++){const x=351+j*384/(Math.max(1,steps-1));if(q>j/steps)P.circle(x,y+153,9,T.accentText);}
    P.enter(itime,3.8+i*3.5,0,0,()=>{P.text(it.output,855,y+112,27,T.accentText,550,'center',250);P.check(855,y+175,T.accentText,1.15);});
  });
  P.wrap(d.note,500,780,970,23,T.muted,400,1.25,'center');
}
