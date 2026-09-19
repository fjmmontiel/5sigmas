import {beat,show,text,small,caption,arrow,node,cross,clamp,tr} from './rich-core.mjs';
import {motionValue} from '../../cues.mjs';
export function computeStrategies(P,s,t){const T=P.T,labels=tr(P,['Secuencial','Paralelo','Estructurado'],['Sequential','Parallel','Structured']);small(P,tr(P,'TRES FORMAS DE INVERTIR CÓMPUTO','THREE WAYS TO SPEND COMPUTE'),60,42);
 for(let k=0;k<3;k++){const q=beat(s,t,k+1),x=60+k*322;P.path([[x,112],[x+270,112]],T.rule,2);text(P,labels[k],x+135,142,308,33,T.ink,550,'center');
  show(P,q,()=>{if(k===0){for(let i=0;i<4;i++){const yy=269+i*93;P.circle(x+135,yy,21,T.accentSurface,T.accentText,2);if(i<3)arrow(P,[[x+135,yy+23],[x+135,yy+68]],clamp(q*4-i));}}
  if(k===1){P.circle(x+135,266,22,T.accentSurface,T.accentText,2);for(let i=0;i<3;i++){const xx=x+43+i*91;arrow(P,[[x+135,289],[xx,415]],q);P.circle(xx,451,22,T.accentText);P.path([[xx,477],[x+135,577]],T.muted,2,q);}P.circle(x+135,602,24,T.accentSurface,T.accentText,2);}
  if(k===2){P.circle(x+135,266,22,T.accentSurface,T.accentText,2);for(let i=0;i<2;i++){const xx=x+48+i*174;arrow(P,[[x+135,289],[xx,420]],q);P.circle(xx,453,22,i?T.accentText:T.white,T.rule,2);if(!i)cross(P,xx,505);else arrow(P,[[xx,477],[xx,606]],q);}P.circle(x+222,630,20,T.accentText);}});
 }caption(P,tr(P,'Las formas codifican operaciones, no valores de rendimiento.','Shapes encode operations, not performance values.'));
}
export function tokenExtension(P,s,t){const T=P.T,a=beat(s,t,0),b=beat(s,t,1),c=beat(s,t,2),d=beat(s,t,3);
 small(P,tr(P,'BUDGET FORCING · CONTINUAR ANTES DE RESPONDER','BUDGET FORCING · CONTINUE BEFORE ANSWERING'),50,42);
 const words=tr(P,['Plantear','Separar','Comprobar'],['Set up','Split','Check']);words.forEach((v,i)=>{show(P,clamp(a*4-i*.65),()=>{node(P,v,43+i*314,199,274,99,{active:true,size:34});if(i<2)arrow(P,[[317+i*314,248],[354+i*314,248]],a);});});
 show(P,b,()=>{node(P,'<end>',620,408,299,102,{size:47});arrow(P,[[809,300],[809,404]],b,T.muted);});
 show(P,c,()=>{P.path([[632,462],[906,462]],T.amber,4);node(P,'Wait',77,408,303,102,{active:true,size:50});arrow(P,[[617,459],[382,459]],c);text(P,tr(P,'Continuar la generación','Continue generation'),77,549,834,40,T.accentText,500);});
 show(P,d,()=>{text(P,'s1-32B · AIME24',55,646,492,31,T.muted,500);P.text('50% → ≈57%',934,636,54,T.accentText,600,'right',470);});caption(P,tr(P,'Mecanismo esquemático; la mejora reportada no es una garantía.','Schematic mechanism; the reported improvement is not a guarantee.'));
}
export function tokenDependency(P,s,t){const T=P.T,d=s.data,total=d.stages.reduce((v,x)=>v+x.amount,0),rate=d.rate||100,q=motionValue(s,t,'duration.accumulate'),f=motionValue(s,t,'duration.formula');small(P,tr(P,'DECODIFICACIÓN AUTORREGRESIVA ESTÁNDAR','STANDARD AUTOREGRESSIVE DECODING'),55,44);
 for(let i=0;i<6;i++){const x=43+i*156,on=q*6>=i;P.rect(x,231,126,109,on?T.accentSurface:T.white,on?T.accentText:T.rule,8,2);P.text(`t${i+1}`,x+63,258,45,on?T.accentText:T.muted,550,'center',120);if(i<5)arrow(P,[[x+127,285],[x+155,285]],clamp(q*6-i),T.accentText,2.5);}
 text(P,tr(P,'El siguiente depende de los anteriores.','The next token depends on the preceding ones.'),500,404,910,37,T.ink,500,'center');
 P.path([[100,554],[897,554]],T.rule,6);P.path([[100,554],[897,554]],T.accentText,6,q);P.circle(100+797*q,554,11,T.accent);small(P,'0',100,582,80);small(P,`${total/rate} s`,895,582,180,'right');
 show(P,Math.max(f,beat(s,t,1)),()=>{P.text(`${new Intl.NumberFormat(P.locale).format(total)} ÷ ${rate} = ${total/rate} s`,500,657,56,T.accentText,550,'center',950);});caption(P,tr(P,'Tasa fija ilustrativa; no incluye prefill, red ni herramientas.','Illustrative fixed rate; excludes prefill, network and tools.'));
}
export function computePlane(P,s,t){const T=P.T,a=beat(s,t,0),b=beat(s,t,1),c=beat(s,t,2),d=beat(s,t,3);small(P,tr(P,'DOS DECISIONES COMPLEMENTARIAS','TWO COMPLEMENTARY DECISIONS'),55,40);
 const x=161,y=158,w=704,h=435;P.rect(x,y,w,h,T.white,T.rule,0,1);P.path([[x+w/2,y],[x+w/2,y+h]],T.rule,1);P.path([[x,y+h/2],[x+w,y+h/2]],T.rule,1);arrow(P,[[x,y+h],[x+w+18,y+h]],1,T.ink,2);arrow(P,[[x,y+h],[x,y-20]],1,T.ink,2);
 text(P,tr(P,'Cómputo por consulta →','Compute per query →'),510,652,832,34,T.ink,500,'center');text(P,tr(P,'Modelo mayor','Larger model'),184,98,710,32,T.ink,550);small(P,tr(P,'menor','smaller'),85,552,150,'center');
 show(P,a,()=>node(P,tr(P,'Modelo pequeño','Small model'),270,424,263,78,{active:true,size:30}));show(P,b,()=>{arrow(P,[[405,417],[665,347]],b);node(P,tr(P,'Más inferencia','More inference'),552,277,271,84,{active:true,size:33});});
 show(P,Math.max(c,d),()=>{text(P,tr(P,'La comparación depende de la tarea.','The comparison depends on the task.'),500,714,930,32,T.accentText,500,'center');});caption(P,tr(P,'Plano conceptual sin escala cuantitativa; no es una curva de calidad.','Conceptual plane without a quantitative scale; not a quality curve.'));
}
